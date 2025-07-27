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
  userId: z.string().optional(),
  cachedStyle: z.any().optional()
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const processingStartTime = Date.now();
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

    // Parallel Step 1: Research + Style fetching
    console.log(`\n🚀 ============ PARALLEL OPERATIONS START [${requestId}] ============`);
    
    // Create promise for research
    const researchPromise = validated.needsResearch ? 
      (async () => {
        console.log(`\n🔍 ============ RESEARCH [${requestId}] ============`);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for research
          
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
              userId: userId !== 'anonymous' ? userId : undefined,
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (researchResponse.ok) {
            const researchData = await researchResponse.json();
            console.log('✅ RESEARCH SUCCESS');
            return {
              perplexityData: researchData.data.searchResults,
              perplexityCitations: researchData.data.citations,
              cost: researchData.data.cost
            };
          } else {
            const errorData = await researchResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.log('❌ RESEARCH FAILED:', errorData);
            return {
              perplexityData: `[Research unavailable: ${errorData.error || 'API error'}]`,
              perplexityCitations: undefined,
              cost: 0
            };
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.error('❌ RESEARCH TIMEOUT after 5s');
            return {
              perplexityData: '[Research unavailable: Request timeout]',
              perplexityCitations: undefined,
              cost: 0
            };
          }
          console.error('❌ RESEARCH ERROR:', error);
          return {
            perplexityData: '[Research unavailable: Connection error]',
            perplexityCitations: undefined,
            cost: 0
          };
        }
      })() : 
      Promise.resolve({ perplexityData: undefined, perplexityCitations: undefined, cost: 0 });

    // Create promise for style fetching
    const stylePromise = (validated.useCustomStyle && userId !== 'anonymous') ?
      (async () => {
        if (validated.cachedStyle) {
          console.log('✅ USING CACHED STYLE');
          return { activeStyle: validated.cachedStyle.activeStyle, sampleTweets: validated.cachedStyle.sampleTweets };
        }
        console.log(`
🎨 ============ STYLE FETCH [${requestId}] ============`);
        const { data: style, error: styleError } = await supabase
          .from('user_styles')
          .select('style_analysis, sample_tweets, refinement_examples')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (styleError) {
          console.error('Error fetching active style:', styleError);
          return { activeStyle: null, sampleTweets: null };
        } else {
          let sampleTweets = style.sample_tweets;
          // If refinement examples exist, they're even better to use
          if (style.refinement_examples && style.refinement_examples.length > 0) {
            // Extract the user-corrected versions as the best examples
            sampleTweets = [
              ...style.refinement_examples
                .filter((ex: any) => ex.revised)
                .map((ex: any) => ex.revised),
              ...style.sample_tweets
            ].slice(0, 7); // Keep best 7 examples to avoid token bloat
          }
          console.log('✅ STYLE FETCH SUCCESS');
          console.log('Style analysis type:', typeof style.style_analysis);
          console.log('Style analysis exists:', !!style.style_analysis);
          console.log('Sample tweets count:', sampleTweets?.length || 0);
          
          // Parse style_analysis if it's a string
          let parsedStyleAnalysis = style.style_analysis;
          if (typeof style.style_analysis === 'string') {
            try {
              parsedStyleAnalysis = JSON.parse(style.style_analysis);
              console.log('Parsed style analysis from string');
            } catch (e) {
              console.error('Failed to parse style analysis:', e);
              parsedStyleAnalysis = null;
            }
          }
          
          return { activeStyle: parsedStyleAnalysis, sampleTweets };
        }
      })() :
      Promise.resolve({ activeStyle: null, sampleTweets: null });

    // Wait for both parallel operations
    const [researchResult, styleResult] = await Promise.all([researchPromise, stylePromise]);
    
    // Extract results
    perplexityData = researchResult.perplexityData;
    perplexityCitations = researchResult.perplexityCitations;
    costs.perplexityQuery = researchResult.cost;
    let activeStyle = styleResult.activeStyle;
    let sampleTweets = styleResult.sampleTweets;
    
    console.log(`\n✅ ============ PARALLEL OPERATIONS COMPLETE [${requestId}] ============`);

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

    // Step 4: Generate final reply AND start meme pre-processing in parallel
    console.log(`\n✍️ ============ STEP 4: FINAL GENERATION [${requestId}] ============`);
    console.log('📤 Generation Input:', {
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      tone: validated.tone,
      selectedType: selectedType.name,
      hasPerplexityData: !!perplexityData,
      replyLength: validated.replyLength || 'short',
      enableStyleMatching: validated.enableStyleMatching ?? true,
      useCustomStyle: validated.useCustomStyle,
      hasActiveStyle: !!activeStyle,
      activeStyleType: typeof activeStyle,
      sampleTweetsCount: sampleTweets?.length || 0
    });
    
    // Calculate timeout based on enabled features
    let baseTimeout = 10000; // 10s base
    if (validated.needsResearch) baseTimeout += 8000; // +8s for research (includes Perplexity time)
    if (validated.useCustomStyle) baseTimeout += 3000; // +3s for custom style processing
    if (validated.includeMeme) baseTimeout += 2000; // +2s buffer for meme (meme runs separately)
    
    // Add safety margin for multiple features
    const featureCount = [validated.needsResearch, validated.useCustomStyle, validated.includeMeme].filter(Boolean).length;
    if (featureCount >= 2) baseTimeout += 2000; // +2s for multi-feature complexity
    
    const generateTimeout = Math.min(baseTimeout, 28000); // Cap at 28s to stay under Vercel's 30s limit
    
    // Start meme pre-processing if meme is requested
    let memePreprocessPromise: Promise<any> | null = null;
    if (validated.includeMeme && imgflipService.isConfigured()) {
      console.log('🎭 Starting meme pre-processing in parallel...');
      memePreprocessPromise = fetch(new URL('/api/meme-text', req.url), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': req.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          userText: validated.memeText,
          // Use placeholder for reply since it's not ready yet
          reply: '',
          originalTweet: validated.originalTweet,
          tone: validated.tone,
          enhance: validated.memeTextMode === 'enhance',
          userId: userId,
          // Flag to indicate this is pre-processing
          isPreprocess: true
        }),
      }).then(res => res.ok ? res.json() : null).catch(() => null);
    }
    
    let generateResponse;
    try {
      const generateController = new AbortController();
      const generateTimeoutId = setTimeout(() => generateController.abort(), generateTimeout);
      
      generateResponse = await fetch(new URL('/api/generate', req.url), {
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
          customStyle: activeStyle, // Pass the active style to the generate API
          // Only include customStyleExamples if we have samples
          ...(sampleTweets && { customStyleExamples: sampleTweets }),
          userId: validated.userId,
        }),
        signal: generateController.signal
      });
      
      clearTimeout(generateTimeoutId);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`❌ GENERATION TIMEOUT after ${generateTimeout/1000}s`);
        return NextResponse.json(
          { 
            error: `Generation timed out after ${generateTimeout/1000} seconds. Try disabling some features like ${validated.useCustomStyle ? 'Write Like Me' : validated.needsResearch ? 'research' : 'meme generation'}.`,
            details: { 
              timeout: generateTimeout,
              features: {
                research: validated.needsResearch,
                customStyle: validated.useCustomStyle,
                meme: validated.includeMeme
              },
              suggestion: 'The server is taking longer than expected. You can try again or disable some features for faster generation.'
            },
            costs,
          },
          { status: 504 }
        );
      }
      throw error;
    }

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
    let memeSkipReason: string | undefined;
    
    // Check if we have enough time left for meme generation
    const elapsedTime = Date.now() - processingStartTime;
    const remainingTime = 29000 - elapsedTime; // Leave 1s buffer from Vercel's 30s limit
    
    if (validated.includeMeme && imgflipService.isConfigured() && remainingTime > 3000) {
      console.log('🎭 Meme Generation Details:', {
        userRequestedMeme: true,
        userProvidedText: validated.memeText || 'none',
        willAutoGenerate: !validated.memeText,
        remainingTime: `${(remainingTime / 1000).toFixed(1)}s`,
        replyLength: validated.replyLength || 'short',
        generatedReplyPreview: generateData.data.reply.substring(0, 100) + '...',
        tone: validated.tone
      });
      
      // Generate meme text using GPT-4o (or use pre-processed data)
      try {
        console.log('🤖 Finalizing meme text...');
        
        // Check if we have pre-processed meme data
        let memeTextData = null;
        if (memePreprocessPromise) {
          const preprocessedData = await memePreprocessPromise;
          if (preprocessedData) {
            console.log('✅ Using pre-processed meme template data');
            memeTextData = preprocessedData;
            // Update with actual reply text if needed
            if (!validated.memeText && memeTextData.needsReplyUpdate) {
              // Make a quick update call with the actual reply
              const updateResponse = await fetch(new URL('/api/meme-text', req.url), {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cookie': req.headers.get('cookie') || ''
                },
                body: JSON.stringify({
                  userText: validated.memeText,
                  reply: generateData.data.reply,
                  originalTweet: validated.originalTweet,
                  tone: validated.tone,
                  enhance: validated.memeTextMode === 'enhance',
                  userId: userId,
                  templateData: memeTextData // Pass pre-processed template
                }),
              });
              if (updateResponse.ok) {
                memeTextData = await updateResponse.json();
              }
            }
          }
        }
        
        // If no pre-processed data or it failed, generate now
        if (!memeTextData) {
          console.log('🤖 Generating meme text from scratch...');
          const memeTextResponse = await fetch(new URL('/api/meme-text', req.url), {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || ''
            },
            body: JSON.stringify({
              userText: validated.memeText,
              reply: generateData.data.reply,
              originalTweet: validated.originalTweet,
              tone: validated.tone,
              enhance: validated.memeTextMode === 'enhance',
              userId: userId
            }),
          });
        
          if (memeTextResponse.ok) {
            memeTextData = await memeTextResponse.json();
          }
        }
        
        // Process meme data if we have it
        if (memeTextData) {
          
          // Check if we got template-specific data
          if (memeTextData.templateId && !memeTextData.useAutomeme) {
            console.log('✅ Template-specific meme data:', {
              templateId: memeTextData.templateId,
              templateName: memeTextData.templateName,
              method: memeTextData.method
            });
            
            // Prepare request for template-specific meme
            var memeRequestBody: any = {
              templateId: memeTextData.templateId,
              templateName: memeTextData.templateName,
              topText: memeTextData.topText,
              bottomText: memeTextData.bottomText,
              text: memeTextData.text,
              boxCount: memeTextData.boxCount, // Pass box count from meme-text API
              userId: userId
            };
          } else {
            // Use automeme approach
            finalMemeText = memeTextData.text;
            console.log('✅ Automeme text generated:', {
              text: finalMemeText,
              enhanced: memeTextData.enhanced,
              method: memeTextData.method
            });
            
            // Validate that the meme text is contextually relevant
            const genericPhrases = ['this is fine', 'but why', 'seems legit', 'mind blown', 'not bad'];
            const isGeneric = finalMemeText ? genericPhrases.includes(finalMemeText.toLowerCase()) : false;
            
            if (isGeneric && memeTextData.method !== 'user-provided') {
              console.warn('⚠️ Generic meme text detected, attempting to improve...');
              // Log context for debugging
              console.log('Context that led to generic meme:', {
                originalTweet: validated.originalTweet.substring(0, 100),
                reply: generateData.data.reply.substring(0, 100),
                tone: validated.tone,
                method: memeTextData.method
              });
            }
            
            var memeRequestBody: any = {
              text: finalMemeText,
              userId: userId
            };
          }
        } else {
          // Fallback if meme text generation fails - use tone-based fallback
          const toneFallback = validated.tone === 'humorous' ? 'plot twist' :
                              validated.tone === 'sarcastic' ? 'oh really' :
                              validated.tone === 'professional' ? 'interesting' :
                              'unexpected';
          finalMemeText = validated.memeText || toneFallback;
          console.warn('⚠️ Meme text generation failed, using fallback:', finalMemeText);
          
          var memeRequestBody: any = {
            text: finalMemeText,
            userId: userId
          };
        }
      } catch (error) {
        console.error('❌ Error generating meme text:', error);
        const errorFallback = validated.tone === 'humorous' ? 'whoops' :
                             validated.tone === 'sarcastic' ? 'shocking' :
                             validated.tone === 'professional' ? 'noted' :
                             'interesting';
        finalMemeText = validated.memeText || errorFallback;
        
        var memeRequestBody: any = {
          text: finalMemeText,
          userId: userId
        };
      }
      
      console.log('🎨 Attempting meme generation');
      console.log('📤 Meme API Request Parameters:', JSON.stringify(memeRequestBody, null, 2));
      console.log('📍 Meme API URL:', new URL('/api/meme', req.url).toString());
      
      // Retry logic for meme generation (reduced retries and timeout)
      const maxMemeRetries = 2; // Reduced from 3
      let memeAttempt = 0;
      let lastMemeError: any = null;
      
      while (memeAttempt < maxMemeRetries && !memeUrl) {
        memeAttempt++;
        
        try {
          console.log(`🔄 Meme generation attempt ${memeAttempt}/${maxMemeRetries}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per attempt
          
          const memeResponse = await fetch(new URL('/api/meme', req.url), {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || ''
            },
            body: JSON.stringify(memeRequestBody),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          console.log('📡 Meme API Response Status:', memeResponse.status);
          
          if (memeResponse.ok) {
            const memeData = await memeResponse.json();
            memeUrl = memeData.url;
            memePageUrl = memeData.pageUrl;
            console.log('✅ Meme generated successfully:', { memeUrl, memePageUrl, attempt: memeAttempt });
            break; // Success, exit retry loop
          } else {
            // Check if error is retryable
            const shouldRetry = memeResponse.status === 503 || // Service unavailable
                              memeResponse.status === 502 || // Bad gateway
                              memeResponse.status === 504;   // Gateway timeout
            
            if (!shouldRetry || memeAttempt === maxMemeRetries) {
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
          
              // Final attempt failed, log error
              lastMemeError = errorData;
              memeSkipReason = `Meme generation failed (${memeResponse.status}): ${errorData.error || 'Unknown error'}`;
            } else {
              // Retryable error, wait before next attempt
              console.log(`⏳ Waiting before retry ${memeAttempt + 1}...`);
              lastMemeError = { status: memeResponse.status, error: lastMemeError };
              await new Promise(resolve => setTimeout(resolve, 500 * memeAttempt)); // Reduced backoff
            }
          }
        } catch (error: any) {
          lastMemeError = error;
          
          if (error.name === 'AbortError') {
            console.error(`❌ Meme generation timeout after 5s (attempt ${memeAttempt})`);
            memeSkipReason = 'Meme generation timeout';
            break; // Don't retry timeouts
          }
          
          console.error(`❌ Meme generation attempt ${memeAttempt} failed:`, error);
          
          if (memeAttempt < maxMemeRetries) {
            console.log(`⏳ Waiting before retry ${memeAttempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 500 * memeAttempt)); // Reduced backoff
          } else {
            memeSkipReason = `Network error after ${memeAttempt} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }
      }
      
      // If all retries failed, log the final error
      if (!memeUrl && lastMemeError && !memeSkipReason) {
        memeSkipReason = `Meme generation failed after ${memeAttempt} attempts`;
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

    const processingTime = Date.now() - processingStartTime;

    // Determine meme skip reason for debugging
    if (validated.includeMeme && !memeUrl && !memeSkipReason) {
      if (!imgflipService.isConfigured()) {
        memeSkipReason = 'Imgflip service not configured';
      } else if (remainingTime <= 3000) {
        memeSkipReason = `Insufficient time remaining (${(remainingTime / 1000).toFixed(1)}s)`;
      } else {
        memeSkipReason = 'Meme generation API call failed';
      }
    }

    // Log the reply content before creating result
    console.log('[process] Creating result object with reply:', {
      replyLength: generateData.data.reply?.length,
      hasLineBreaks: generateData.data.reply?.includes('\n'),
      replyPreview: JSON.stringify(generateData.data.reply?.substring(0, 200))
    });
    
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
      },
      // Add metadata for feedback
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      tone: validated.tone,
      // Write Like Me tracking
      usedCustomStyle: validated.useCustomStyle,
      styleId: activeStyle ? (await supabase
        .from('user_styles')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()).data?.id : undefined,
      activeStyle,
      sampleTweets
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
    console.log('⏱️ Timeout Configuration:', {
      generateTimeout: `${generateTimeout/1000}s`,
      actualTime: `${processingTime/1000}s`, 
      remainingBuffer: `${(30000 - processingTime)/1000}s`,
      features: {
        research: validated.needsResearch,
        customStyle: validated.useCustomStyle,
        meme: validated.includeMeme
      }
    });
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
        // Get user's timezone to track in the correct date
        const { data: userData } = await supabase
          .from('users')
          .select('timezone')
          .eq('id', userId)
          .single();
        
        // Calculate user's current date
        let userDate: string;
        if (userData?.timezone) {
          try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
              timeZone: userData.timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            userDate = formatter.format(new Date());
          } catch (e) {
            // Fallback to UTC if timezone is invalid
            userDate = new Date().toISOString().split('T')[0];
          }
        } else {
          // Default to UTC
          userDate = new Date().toISOString().split('T')[0];
        }
        
        console.log('[process] Tracking usage for user:', userId, 'date:', userDate, 'timezone:', userData?.timezone || 'UTC');
        
        // Track the reply generation - use throwOnError to ensure we know if it fails
        const { data: trackingData, error: trackingError } = await supabase
          .rpc('track_daily_usage', {
            p_user_id: userId,
            p_usage_type: 'reply',
            p_count: 1,
            p_date: userDate
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
        
        // Add tracking status to the response
        result.trackingStatus = {
          success: !trackingError,
          error: trackingError ? trackingError.message : undefined,
          date: userDate,
          timezone: userData?.timezone || 'UTC'
        };
        
        // Meme tracking is already handled in the /api/meme endpoint
      } catch (trackingError) {
        // Log the full error for debugging but don't fail the request
        console.error('[process] ❌ Failed to track usage (exception):', {
          error: trackingError,
          userId,
          message: trackingError instanceof Error ? trackingError.message : 'Unknown error',
          stack: trackingError instanceof Error ? trackingError.stack : undefined
        });
        
        // Add tracking failure to response
        result.trackingStatus = {
          success: false,
          error: trackingError instanceof Error ? trackingError.message : 'Unknown error',
          date: 'unknown',
          timezone: 'unknown'
        };
      }
    } else {
      // Anonymous users don't get tracked
      result.trackingStatus = {
        success: false,
        error: 'Anonymous user - tracking skipped',
        date: 'N/A',
        timezone: 'N/A'
      };
    }

    // Log final result before returning
    console.log('[process] Final result before JSON response:', {
      replyLength: result.reply?.length,
      hasLineBreaks: result.reply?.includes('\n'),
      hasDoubleLineBreaks: result.reply?.includes('\n\n'),
      replyPreview: JSON.stringify(result.reply?.substring(0, 200))
    });

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