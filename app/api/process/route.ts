import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserInput, GeneratedReply, CostBreakdown } from '@/app/lib/types';
import { imgflipService } from '@/app/lib/services/imgflip.service';
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
  replyLength: z.enum(['short', 'medium', 'long']).optional(),
  perplexityGuidance: z.string().max(200).optional(),
  enableStyleMatching: z.boolean().optional(),
  includeMeme: z.boolean().optional(),
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
    
    // Get authenticated user or use provided userId
    let userId = validated.userId || 'anonymous';
    
    // Check user limits
    if (userId !== 'anonymous') {
      // Get user data with active subscription and plan
      const { data: userData } = await supabase
        .from('users')
        .select(`
          id,
          email,
          subscriptions!inner(
            status,
            plan_id,
            subscription_plans!inner(
              id,
              monthly_limit,
              suggestion_limit,
              meme_limit,
              enable_memes
            )
          )
        `)
        .eq('id', userId)
        .eq('subscriptions.status', 'active')
        .single() as { data: UserData | null };
        
      const activeSubscription = userData?.subscriptions?.[0];
      if (activeSubscription?.subscription_plans) {
        // Get current usage
        const { data: usage } = await supabase
          .rpc('get_current_usage', { p_user_id: userId })
          .single() as { data: CurrentUsage | null };
          
        const currentUsage: CurrentUsage = usage || { total_replies: 0, total_memes: 0 };
        const plan = activeSubscription.subscription_plans;
        
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
    if (validated.needsResearch) {
      console.log(`\n🔍 ============ STEP 1: RESEARCH [${requestId}] ============`);
      try {
        const researchResponse = await fetch(new URL('/api/research', req.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          costs.perplexityQuery = researchData.data.cost;
          
          console.log('✅ RESEARCH SUCCESS:');
          console.log('📊 Search Query Generated:', researchData.data.searchQuery);
          console.log('📈 Perplexity Results:', perplexityData);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseIdea: validated.responseIdea,
        responseType: validated.responseType,
        tone: validated.tone,
        perplexityData,
      }),
    });

    if (!classifyResponse.ok) {
      console.log('❌ CLASSIFICATION FAILED - HTTP Status:', classifyResponse.status);
      throw new Error('Classification failed');
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
      enableMemes: validated.includeMeme && imgflipService.isConfigured()
    });
    
    const reasonResponse = await fetch(new URL('/api/reason', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseIdea: validated.responseIdea,
        tone: validated.tone,
        selectedTypes,
        perplexityData,
        enableMemes: validated.includeMeme && imgflipService.isConfigured(),
      }),
    });

    if (!reasonResponse.ok) {
      console.log('❌ REASONING FAILED - HTTP Status:', reasonResponse.status);
      throw new Error('Reasoning failed');
    }

    const reasonData = await reasonResponse.json();
    const selectedType = reasonData.data.selectedType;
    const shouldIncludeMeme = reasonData.data.includeMeme;
    const memeText = reasonData.data.memeText;
    costs.reasoning = reasonData.data.cost;
    
    console.log('✅ REASONING SUCCESS:');
    console.log('🎯 Final Selected Type:', selectedType.name);
    console.log('🎭 Include Meme:', shouldIncludeMeme);
    console.log('💰 Reasoning Cost:', costs.reasoning);
    if (memeText) console.log('🖼️ Meme Text:', memeText);

    // Step 4: Generate meme if needed (before main generation)
    console.log(`\n🖼️ ============ STEP 4: MEME GENERATION [${requestId}] ============`);
    let memeUrl: string | undefined;
    let memePageUrl: string | undefined;
    
    if (shouldIncludeMeme && memeText && validated.includeMeme) {
      console.log('🎨 Attempting meme generation:', { shouldIncludeMeme, memeText, includeMeme: validated.includeMeme });
      
      try {
        const memeResponse = await fetch(new URL('/api/meme', req.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: memeText,
            userId: userId
          }),
        });

        if (memeResponse.ok) {
          const memeData = await memeResponse.json();
          memeUrl = memeData.url;
          memePageUrl = memeData.pageUrl;
          console.log('✅ Meme generated successfully:', { memeUrl, memePageUrl });
        } else {
          const error = await memeResponse.json();
          console.warn('⚠️ Meme generation failed:', error);
          console.warn('Failed meme text was:', memeText);
          // Don't fail the entire request if meme generation fails
          // This is a nice-to-have feature, not critical
        }
      } catch (error) {
        console.error('❌ Meme generation error:', error);
        // Don't fail the entire request if meme generation fails
      }
    } else {
      console.log('🚫 Meme generation skipped:', { shouldIncludeMeme, memeText, includeMeme: validated.includeMeme });
    }

    // Step 5: Generate final reply
    console.log(`\n✍️ ============ STEP 5: FINAL GENERATION [${requestId}] ============`);
    console.log('📤 Generation Input:', {
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      tone: validated.tone,
      selectedType: selectedType.name,
      hasPerplexityData: !!perplexityData,
      perplexityDataPreview: perplexityData ? perplexityData.substring(0, 150) + '...' : 'None',
      replyLength: validated.replyLength || 'short',
      enableStyleMatching: validated.enableStyleMatching ?? true,
      useCustomStyle: validated.useCustomStyle
    });
    
    const generateResponse = await fetch(new URL('/api/generate', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      const errorData = await generateResponse.json();
      console.error('❌ GENERATION FAILED:', errorData);
      throw new Error('Generation failed');
    }

    const generateData = await generateResponse.json();
    costs.generation = generateData.data.cost;
    
    console.log('✅ GENERATION SUCCESS:');
    console.log('📝 Final Reply:', generateData.data.reply);
    console.log('📊 Contains Numbers/Stats:', /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(generateData.data.reply));
    console.log('🔍 Contains "according to":', generateData.data.reply.toLowerCase().includes('according to'));
    console.log('💰 Generation Cost:', costs.generation);

    // Calculate total cost
    costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

    // Check if we exceeded per-request limit
    const requestLimit = Number(process.env.REQUEST_COST_LIMIT) || 0.05;
    if (costs.total > requestLimit) {
      console.warn('Request exceeded cost limit:', costs.total);
    }

    const processingTime = Date.now() - startTime;

    const result: GeneratedReply = {
      reply: generateData.data.reply,
      replyType: selectedType.name,
      cost: costs.total,
      processingTime,
      perplexityData,
      costs,
      memeUrl,
      memePageUrl,
    };

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
    
    console.log(`🏁 ============ END PIPELINE [${requestId}] ============\n`);

    // Track usage for authenticated users
    if (userId !== 'anonymous') {
      try {
        // Track the reply generation
        const { error: trackError } = await supabase
          .rpc('track_daily_usage', {
            p_user_id: userId,
            p_usage_type: 'reply',
            p_count: 1
          });

        if (trackError) {
          console.error('Failed to track usage:', trackError);
        } else {
          console.log('✅ Usage tracked successfully');
        }

        // Meme tracking is already handled in the /api/meme endpoint
      } catch (trackingError) {
        // Don't fail the request if tracking fails
        console.error('Usage tracking error:', trackingError);
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