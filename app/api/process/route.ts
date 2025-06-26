import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserInput, GeneratedReply, CostBreakdown } from '@/app/lib/types';
import { imgflipService } from '@/app/lib/services/imgflip.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

interface UserData {
  subscription_tier: string;
  subscription_plans?: {
    monthly_limit: number;
    suggestion_limit: number;
  };
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
      // Get user data with plan
      const { data: userData } = await supabase
        .from('users')
        .select('*, subscription_plans!subscription_tier(*)')
        .eq('id', userId)
        .single() as { data: UserData | null };
        
      if (userData?.subscription_plans) {
        // Get current usage
        const { data: usage } = await supabase
          .rpc('get_current_usage', { p_user_id: userId })
          .single() as { data: CurrentUsage | null };
          
        const currentUsage: CurrentUsage = usage || { total_replies: 0, total_memes: 0 };
        
        // Check reply limit
        if (currentUsage.total_replies >= userData.subscription_plans.monthly_limit) {
          return NextResponse.json(
            { 
              error: 'Monthly reply limit reached',
              upgradeUrl: '/pricing',
              limit: userData.subscription_plans.monthly_limit,
              used: currentUsage.total_replies
            },
            { status: 429 }
          );
        }
        
        // Check meme limit if meme requested
        const memeLimits: Record<string, number> = {
          'free': 0,
          'growth': 10,      // X Basic
          'professional': 50, // X Pro
          'enterprise': 100   // X Business
        };
        const memeLimit = memeLimits[userData.subscription_tier] || 0;
        
        if (validated.includeMeme && currentUsage.total_memes >= memeLimit) {
          return NextResponse.json(
            { 
              error: 'Monthly meme limit reached',
              upgradeUrl: '/pricing',
              limit: memeLimit,
              used: currentUsage.total_memes
            },
            { status: 429 }
          );
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
          console.log('❌ RESEARCH FAILED - HTTP Status:', researchResponse.status);
        }
      } catch (error) {
        console.error('❌ RESEARCH ERROR:', error);
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
      
      if (!imgflipService.isConfigured()) {
        console.warn('⚠️ Meme generation skipped: Imgflip credentials not configured');
      } else {
        try {
          const memeResult = await imgflipService.generateAutomeme(memeText);
          memeUrl = memeResult.url;
          memePageUrl = memeResult.pageUrl;
          console.log('✅ Meme generated successfully:', { memeUrl, memePageUrl });
        } catch (error) {
          console.error('❌ Meme generation failed:', error);
        }
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
    console.log(`🏁 ============ END PIPELINE [${requestId}] ============\n`);

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