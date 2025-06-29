import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserInput, GeneratedReply, CostBreakdown, Tone } from '@/app/lib/types';
import { imgflipService } from '@/app/lib/services/imgflip.service';
// Removed old meme generator import - will use GPT-4o via API
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

interface UserData {
  id: string;
  email: string;
  subscriptions?: Array<{
    status: string;
    plan_id: string;
    subscription_plans: {
      id: string;
      monthly_limit: number;
      suggestion_limit: number;
      meme_limit: number;
      enable_memes: boolean;
    };
  }>;
}

interface CurrentUsage {
  total_replies: number;
  total_memes: number;
}

// This is the main orchestrator endpoint that calls all other endpoints

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(2000),
  responseIdea: z.string().min(1).max(2000),
  responseType: z.enum(['agree', 'disagree', 'neutral', 'other']),
  tone: z.string(),
  needsResearch: z.boolean(),
  replyLength: z.enum(['short', 'medium', 'long', 'extra-long']).optional(),
  perplexityGuidance: z.string().max(200).optional(),
  enableStyleMatching: z.boolean().optional(),
  includeMeme: z.boolean().optional(),
  memeText: z.string().max(100).optional(),
  memeTextMode: z.enum(['exact', 'enhance']).optional(),
  useCustomStyle: z.boolean().optional(),
  userId: z.string().optional()
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const startTime = Date.now();
  const costs: CostBreakdown = {
    classification: 0,
    reasoning: 0,
    generation: 0,
    total: 0,
  };

  try {
    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    // Get authenticated user from server-side session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    // Use authenticated user ID, fallback to provided userId, then anonymous
    let userId = authUser?.id || validated.userId || 'anonymous';
    
    if (!authUser && validated.userId) {
      console.warn('[process] No authenticated user, using provided userId:', validated.userId);
    }
    
    // Check user limits
    if (userId !== 'anonymous') {
      // Get user's active subscription first
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      let activeSubscription = null;
      let plan = null;
      
      if (subscriptions && subscriptions.length > 0) {
        activeSubscription = subscriptions[0];
        
        // Get the plan details separately
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', activeSubscription.plan_id)
          .single();
          
        if (planData) {
          plan = planData;
        }
      }
      
      // If no active subscription, get free plan
      if (!plan) {
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', 'free')
          .single();
          
        plan = freePlan || {
          id: 'free',
          monthly_limit: 5,
          suggestion_limit: 0,
          meme_limit: 0,
          enable_memes: false
        };
      }
      
      if (plan) {
        // Get current usage
        let currentUsage: CurrentUsage = { total_replies: 0, total_memes: 0 };
        try {
          const { data: usage } = await supabase
            .rpc('get_current_usage', { p_user_id: userId })
            .single()
            .throwOnError() as { data: CurrentUsage | null };
          
          if (usage) {
            currentUsage = usage as CurrentUsage;
            console.log('[process] Current usage fetched:', currentUsage);
          }
        } catch (usageError) {
          console.error('[process] Failed to fetch current usage:', {
            error: usageError,
            userId,
            message: usageError instanceof Error ? usageError.message : 'Unknown error'
          });
          // Continue with default zero usage
        }
        
        // Check reply limit
        if (currentUsage.total_replies >= plan.monthly_limit) {
          return NextResponse.json(
            { 
              error: 'Monthly reply limit reached',
              upgradeUrl: '/pricing',
              limit: plan.monthly_limit,
              used: currentUsage.total_replies
            },
            { status: 429 }
          );
        }
        
        // Check meme limit if meme requested
        if (validated.includeMeme && plan.enable_memes) {
          if (currentUsage.total_memes >= plan.meme_limit) {
            return NextResponse.json(
              { 
                error: 'Monthly meme limit reached',
                upgradeUrl: '/pricing',
                limit: plan.meme_limit,
                used: currentUsage.total_memes
              },
              { status: 429 }
            );
          }
        } else if (validated.includeMeme && !plan.enable_memes) {
          // User requested meme but their plan doesn't support it
          validated.includeMeme = false;
        }
      }
    }

    // Check daily cost limit
    const dailyLimit = Number(process.env.DAILY_COST_LIMIT) || 100;
    // TODO: Implement actual cost tracking
    
    let perplexityData: string | undefined;
    let perplexityCitations: Array<{ url: string; title?: string }> | undefined;

    // Create unique request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`\n🚀 ============ REPLYGUY PIPELINE START [${requestId}] ============`);
    console.log('📥 INPUT:', {
      userId: userId !== 'anonymous' ? userId : 'anonymous',
      tweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      responseType: validated.responseType,
      tone: validated.tone,
      needsResearch: validated.needsResearch,
      researchGuidance: validated.perplexityGuidance,
      replyLength: validated.replyLength,
      timestamp: new Date().toISOString()
    });

    // Step 1: Optional Perplexity research
    console.log('🔍 Research Check:', {
      needsResearch: validated.needsResearch,
      type: typeof validated.needsResearch,
      rawValue: body?.needsResearch
    });
    
    if (validated.needsResearch) {
      console.log(`\n🔍 ============ STEP 1: RESEARCH [${requestId}] ============`);
      try {
        const researchResponse = await fetch(new URL('/api/research', req.url), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            originalTweet: validated.originalTweet,
            responseIdea: validated.responseIdea,
            responseType: validated.responseType,
            guidance: validated.perplexityGuidance,
          }),
        });

        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          perplexityData = researchData.data.searchResults;
          perplexityCitations = researchData.data.citations;
          costs.perplexityQuery = researchData.data.cost;
          
          console.log('✅ RESEARCH SUCCESS:');
          console.log('📊 Search Query Generated:', researchData.data.searchQuery);
          console.log('📈 Perplexity Results:', perplexityData);
          console.log('🔗 Citations Received:', perplexityCitations?.length || 0);
          if (perplexityCitations && perplexityCitations.length > 0) {
            console.log('🔗 Citation Details:', JSON.stringify(perplexityCitations, null, 2));
          }
          console.log('💰 Research Cost:', costs.perplexityQuery);
          console.log(`📏 Data Length: ${perplexityData?.length || 0} characters`);
        } else {
          const errorData = await researchResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.log('❌ RESEARCH FAILED - HTTP Status:', researchResponse.status);
          console.log('❌ Research Error Details:', errorData);
          
          // Add research failure notice that will be visible to user in the final response
          perplexityData = `[Research unavailable: ${errorData.error || 'API temporarily unavailable'}. Reply generated without current data.]`;
          console.log('📝 Added fallback research notice for user visibility');
        }
      } catch (error) {
        console.error('❌ RESEARCH ERROR:', error);
        // Add research failure notice for user
        perplexityData = `[Research unavailable: Connection error. Reply generated without current data.]`;
        console.log('📝 Added fallback research notice due to connection error');
      }
    } else {
      console.log(`\n🚫 ============ STEP 1: RESEARCH SKIPPED [${requestId}] ============`);
      console.log('❌ Research skipped because needsResearch =', validated.needsResearch);
      console.log('❌ Raw request body needsResearch =', body?.needsResearch);
    }

    // Step 2: Classify and select reply types
    console.log(`\n🏷️ ============ STEP 2: CLASSIFICATION [${requestId}] ============`);
    console.log('📤 Classification Input:', {
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      responseType: validated.responseType,
      tone: validated.tone,
      hasPerplexityData: !!perplexityData,
      perplexityDataPreview: perplexityData ? perplexityData.substring(0, 100) + '...' : 'None'
    });
    
    const classifyResponse = await fetch(new URL('/api/classify', req.url), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseIdea: validated.responseIdea,
        responseType: validated.responseType,
        tone: validated.tone,
        perplexityData,
      }),
    });

    if (!classifyResponse.ok) {
      const errorData = await classifyResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.log('❌ CLASSIFICATION FAILED - HTTP Status:', classifyResponse.status);
      console.log('❌ Classification Error:', errorData);
      
      // Return a more specific error message
      return NextResponse.json(
        { 
          error: `Classification failed: ${errorData.error || 'Unknown error'}`,
          details: errorData,
          costs,
        },
        { status: 500 }
      );
    }

    const classifyData = await classifyResponse.json();
    let selectedTypes = classifyData.data.selectedTypes;
    costs.classification = classifyData.data.cost;

    if (selectedTypes.length === 0) {
      console.warn('⚠️ No suitable reply types found, using fallback');
      selectedTypes = [{
        id: 'helpful-tip',
        name: 'The Helpful Tip',
        pattern: 'Share useful advice or insights',
        style_rules: 'Be helpful and constructive. Focus on providing value.',
        examples: ['Here\'s something that might help...', 'One thing to consider is...']
      }];
    }
    
    console.log('✅ CLASSIFICATION SUCCESS:');
    console.log('🎯 Selected Reply Types:', selectedTypes.map((t: any) => t.name));
    console.log('💰 Classification Cost:', costs.classification);

    // Step 3: Reason about the best reply type
    console.log(`\n🧠 ============ STEP 3: REASONING [${requestId}] ============`);
    console.log('📤 Reasoning Input:', {
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      tone: validated.tone,
      selectedTypesCount: selectedTypes.length,
      selectedTypeNames: selectedTypes.map((t: any) => t.name),
      hasPerplexityData: !!perplexityData,
      userRequestedMeme: validated.includeMeme,
      imgflipConfigured: imgflipService.isConfigured(),
      enableMemes: validated.includeMeme && imgflipService.isConfigured()
    });
    
    // Additional debug logging for meme issues
    if (validated.includeMeme && !imgflipService.isConfigured()) {
      console.log('⚠️ MEME ISSUE: User requested meme but Imgflip not configured');
      console.log('⚠️ Check that IMGFLIP_USERNAME and IMGFLIP_PASSWORD env vars are set');
    }
    
    const reasonResponse = await fetch(new URL('/api/reason', req.url), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseIdea: validated.responseIdea,
        tone: validated.tone,
        selectedTypes,
        perplexityData,
        enableMemes: false, // Don't let reasoning API decide about memes anymore
      }),
    });

    if (!reasonResponse.ok) {
      const errorData = await reasonResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.log('❌ REASONING FAILED - HTTP Status:', reasonResponse.status);
      console.log('❌ Reasoning Error:', errorData);
      
      return NextResponse.json(
        { 
          error: `Reasoning failed: ${errorData.error || 'Unknown error'}`,
          details: errorData,
          costs,
        },
        { status: 500 }
      );
    }

    const reasonData = await reasonResponse.json();
    const selectedType = reasonData.data.selectedType;
    costs.reasoning = reasonData.data.cost;
    
    console.log('✅ REASONING SUCCESS:');
    console.log('🎯 Final Selected Type:', selectedType.name);
    console.log('💰 Reasoning Cost:', costs.reasoning);

    // Step 4: Generate final reply first (we need it for auto-generating meme text)
    console.log(`\n✍️ ============ STEP 4: FINAL GENERATION [${requestId}] ============`);
    console.log('📤 Generation Input:', {
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      tone: validated.tone,
      selectedType: selectedType.name,
      hasPerplexityData: !!perplexityData,
      replyLength: validated.replyLength || 'short',
      enableStyleMatching: validated.enableStyleMatching ?? true,
      useCustomStyle: validated.useCustomStyle
    });
    
    const generateResponse = await fetch(new URL('/api/generate', req.url), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseIdea: validated.responseIdea,
        tone: validated.tone,
        selectedType,
        perplexityData,
        replyLength: validated.replyLength || 'short',
        enableStyleMatching: validated.enableStyleMatching ?? true,
        useCustomStyle: validated.useCustomStyle,
        userId: validated.userId,
      }),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ GENERATION FAILED:', errorData);
      
      return NextResponse.json(
        { 
          error: `Generation failed: ${errorData.error || 'Unknown error'}`,
          details: errorData,
          costs,
        },
        { status: 500 }
      );
    }

    const generateData = await generateResponse.json();
    costs.generation = generateData.data.cost;
    
    console.log('✅ GENERATION SUCCESS:');
    console.log('📝 Final Reply:', generateData.data.reply);
    console.log('💰 Generation Cost:', costs.generation);

    // Step 5: Generate meme if requested (after reply generation)
    console.log(`\n🖼️ ============ STEP 5: MEME GENERATION [${requestId}] ============`);
    let memeUrl: string | undefined;
    let memePageUrl: string | undefined;
    let finalMemeText: string | undefined;
    
    if (validated.includeMeme && imgflipService.isConfigured()) {
      console.log('🎭 Meme Generation Details:', {
        userRequestedMeme: true,
        userProvidedText: validated.memeText || 'none',
        willAutoGenerate: !validated.memeText,
        replyLength: validated.replyLength || 'short',
        generatedReplyPreview: generateData.data.reply.substring(0, 100) + '...',
        tone: validated.tone
      });
      
      // Generate meme text using GPT-4o
      try {
        console.log('🤖 Calling meme-text API to generate text...');
        const memeTextResponse = await fetch(new URL('/api/meme-text', req.url), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            userText: validated.memeText,
            reply: generateData.data.reply,
            tone: validated.tone,
            enhance: validated.memeTextMode === 'enhance',
            userId: userId
          }),
        });
        
        if (memeTextResponse.ok) {
          const memeTextData = await memeTextResponse.json();
          finalMemeText = memeTextData.text;
          console.log('✅ Meme text generated:', {
            text: finalMemeText,
            enhanced: memeTextData.enhanced,
            method: memeTextData.method
          });
        } else {
          // Fallback if meme text generation fails
          finalMemeText = validated.memeText || 'this is fine';
          console.warn('⚠️ Meme text generation failed, using fallback:', finalMemeText);
        }
      } catch (error) {
        console.error('❌ Error generating meme text:', error);
        finalMemeText = validated.memeText || 'this is fine';
      }
      
      console.log('🎨 Attempting meme generation with text:', finalMemeText);
      
      // Log exact parameters being sent to meme API
      const memeRequestBody = {
        text: finalMemeText,
        userId: userId
      };
      console.log('📤 Meme API Request Parameters:', JSON.stringify(memeRequestBody, null, 2));
      console.log('📍 Meme API URL:', new URL('/api/meme', req.url).toString());
      
      try {
        const memeResponse = await fetch(new URL('/api/meme', req.url), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || ''
          },
          body: JSON.stringify(memeRequestBody),
        });

        console.log('📡 Meme API Response Status:', memeResponse.status);
        console.log('📡 Meme API Response Headers:', Object.fromEntries(memeResponse.headers.entries()));
        
        if (memeResponse.ok) {
          const memeData = await memeResponse.json();
          memeUrl = memeData.url;
          memePageUrl = memeData.pageUrl;
          console.log('✅ Meme generated successfully:', { memeUrl, memePageUrl });
        } else {
          // Capture the full error response
          const responseText = await memeResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (parseError) {
            errorData = { rawResponse: responseText };
            console.error('⚠️ Failed to parse meme error response as JSON:', responseText);
          }
          
          console.error('❌ MEME GENERATION FAILED - Detailed Error Info:');
          console.error('  - HTTP Status:', memeResponse.status);
          console.error('  - Status Text:', memeResponse.statusText);
          console.error('  - Response Body:', JSON.stringify(errorData, null, 2));
          console.error('  - Request Text:', finalMemeText);
          console.error('  - Request User ID:', userId);
          console.error('  - Full Request Body:', JSON.stringify(memeRequestBody, null, 2));
          
          // Log specific error types for better debugging
          if (memeResponse.status === 503) {
            console.error('  ⚠️ Service Unavailable - Possible causes:');
            console.error('    - Imgflip credentials not configured');
            console.error('    - ENABLE_IMGFLIP_AUTOMEME is false');
            console.error('    - Imgflip API is down');
          } else if (memeResponse.status === 402) {
            console.error('  ⚠️ Payment Required - Imgflip premium API access needed');
          } else if (memeResponse.status === 422) {
            console.error('  ⚠️ Unprocessable Entity - Text not suitable for meme generation');
          } else if (memeResponse.status === 429) {
            console.error('  ⚠️ Rate Limited - User exceeded meme limit');
          } else if (memeResponse.status === 403) {
            console.error('  ⚠️ Forbidden - User plan does not include memes');
          }
          
          // Don't fail the entire request if meme generation fails
          // This is a nice-to-have feature, not critical
          
          // Add info to debug output for user visibility
          memeSkipReason = `Meme generation failed (${memeResponse.status}): ${errorData.error || 'Unknown error'}`;
        }
      } catch (error) {
        console.error('❌ MEME GENERATION NETWORK ERROR:', {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          memeText: finalMemeText,
          userId: userId,
          url: new URL('/api/meme', req.url).toString()
        });
        
        // Check for specific network error types
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('  ⚠️ Network fetch error - possible causes:');
          console.error('    - API endpoint unreachable');
          console.error('    - DNS resolution failed');
          console.error('    - Connection timeout');
        }
        
        // Don't fail the entire request if meme generation fails
        memeSkipReason = `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else {
      console.log('🚫 Meme generation skipped:', { 
        userRequestedMeme: validated.includeMeme,
        imgflipConfigured: imgflipService.isConfigured(),
        reason: !validated.includeMeme ? 'User did not request meme' : 'Imgflip not configured'
      });
    }

    // Note: Step 5 was moved up earlier for meme generation logic

    // Calculate total cost
    costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

    // Check if we exceeded per-request limit
    const requestLimit = Number(process.env.REQUEST_COST_LIMIT) || 0.05;
    if (costs.total > requestLimit) {
      console.warn('Request exceeded cost limit:', costs.total);
    }

    const processingTime = Date.now() - startTime;

    // Determine meme skip reason for debugging
    let memeSkipReason: string | undefined;
    if (validated.includeMeme && !memeUrl) {
      if (!imgflipService.isConfigured()) {
        memeSkipReason = 'Imgflip service not configured';
      } else {
        memeSkipReason = 'Meme generation API call failed';
      }
    }

    const result: GeneratedReply = {
      reply: generateData.data.reply,
      replyType: selectedType.name,
      cost: costs.total,
      processingTime,
      perplexityData,
      costs,
      memeUrl,
      memePageUrl,
      citations: perplexityCitations,
      debugInfo: {
        memeRequested: validated.includeMeme || false,
        memeDecided: validated.includeMeme || false, // Now user-controlled
        memeText: finalMemeText || undefined,
        memeSkipReason
      }
    };
    
    console.log('🎯 Final Result Citations:', {
      hasCitations: !!result.citations,
      citationCount: result.citations?.length || 0,
      citations: result.citations
    });

    // DUAL METRICS TRACKING - Track both attempted and actually included
    const researchAttempted = validated.needsResearch;
    const researchDataReceived = !!perplexityData && !perplexityData.includes('[Research unavailable:');
    const researchIncludedInReply = researchDataReceived && 
      (result.reply.toLowerCase().includes('according to') ||
       /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(result.reply));
    
    console.log(`\n🎉 ============ PIPELINE COMPLETE [${requestId}] ============`);
    console.log('⏱️ Total Processing Time:', processingTime + 'ms');
    console.log('💰 Total Cost:', costs.total);
    console.log('📊 Cost Breakdown:', costs);
    console.log('🎯 Final Result:', {
      reply: result.reply,
      replyType: result.replyType,
      hadPerplexityData: !!perplexityData,
      dataIncludedInReply: perplexityData ? result.reply.toLowerCase().includes(perplexityData.toLowerCase().split(' ')[0]) : false
    });
    
    // METRICS: Dual tracking for debugging prompt-loss issues
    console.log('📈 === RESEARCH METRICS ===');
    console.log('🔍 Research attempted:', researchAttempted);
    console.log('📊 Research data received:', researchDataReceived);
    console.log('✅ Research included in reply:', researchIncludedInReply);
    console.log('⚠️ Research loss detected:', researchDataReceived && !researchIncludedInReply);
    
    // MEME METRICS
    console.log('🎭 === MEME METRICS ===');
    console.log('👤 User requested meme:', validated.includeMeme);
    console.log('📝 User provided text:', validated.memeText || 'none');
    console.log('🎨 Final meme text used:', finalMemeText || 'none');
    console.log('✅ Meme generated:', !!result.memeUrl);
    console.log('⚠️ Meme request unfulfilled:', validated.includeMeme && !result.memeUrl);
    
    console.log(`🏁 ============ END PIPELINE [${requestId}] ============\n`);

    // Track usage for authenticated users
    if (userId !== 'anonymous') {
      try {
        // Track the reply generation - use throwOnError to ensure we know if it fails
        const { data: trackingData, error: trackingError } = await supabase
          .rpc('track_daily_usage', {
            p_user_id: userId,
            p_usage_type: 'reply',
            p_count: 1
          });

        if (trackingError) {
          console.error('[process] ❌ Usage tracking RPC error:', {
            error: trackingError,
            code: trackingError.code,
            message: trackingError.message,
            details: trackingError.details,
            hint: trackingError.hint,
            userId,
          });
        } else {
          console.log('[process] ✅ Usage tracked successfully for user:', userId);
        }
        
        // Meme tracking is already handled in the /api/meme endpoint
      } catch (trackingError) {
        // Log the full error for debugging but don't fail the request
        console.error('[process] ❌ Failed to track usage (exception):', {
          error: trackingError,
          userId,
          message: trackingError instanceof Error ? trackingError.message : 'Unknown error',
          stack: trackingError instanceof Error ? trackingError.stack : undefined
        });
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Process error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process request',
        costs,
      },
      { status: 500 }
    );
  }
}