import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserInput, GeneratedReply, CostBreakdown } from '@/app/lib/types';
import { imgflipService } from '@/app/lib/services/imgflip.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

interface UserLimits {
  replies_used: number;
  reply_limit: number;
  memes_used: number;
  meme_limit: number;
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
      const { data: limits } = await supabase
        .rpc('get_user_limits', { p_user_id: userId })
        .single() as { data: UserLimits | null };
        
      if (limits) {
        // Check reply limit
        if (limits.replies_used >= limits.reply_limit) {
          return NextResponse.json(
            { 
              error: 'Monthly reply limit reached',
              upgradeUrl: '/pricing',
              limit: limits.reply_limit,
              used: limits.replies_used
            },
            { status: 429 }
          );
        }
        
        // Check meme limit if meme requested
        if (validated.includeMeme && limits.memes_used >= limits.meme_limit) {
          return NextResponse.json(
            { 
              error: 'Monthly meme limit reached',
              upgradeUrl: '/pricing',
              limit: limits.meme_limit,
              used: limits.memes_used
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

    // Step 1: Optional Perplexity research
    if (validated.needsResearch) {
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
        }
      } catch (error) {
        console.error('Research failed, continuing without it:', error);
      }
    }

    // Step 2: Classify and select reply types
    const classifyResponse = await fetch(new URL('/api/classify', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseType: validated.responseType,
        tone: validated.tone,
        perplexityData,
      }),
    });

    if (!classifyResponse.ok) {
      throw new Error('Classification failed');
    }

    const classifyData = await classifyResponse.json();
    const selectedTypes = classifyData.data.selectedTypes;
    costs.classification = classifyData.data.cost;

    if (selectedTypes.length === 0) {
      throw new Error('No suitable reply types found');
    }

    // Step 3: Reason about the best reply type
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
      throw new Error('Reasoning failed');
    }

    const reasonData = await reasonResponse.json();
    const selectedType = reasonData.data.selectedType;
    const shouldIncludeMeme = reasonData.data.includeMeme;
    const memeText = reasonData.data.memeText;
    costs.reasoning = reasonData.data.cost;

    // Step 4: Generate meme if needed
    let memeUrl: string | undefined;
    let memePageUrl: string | undefined;
    
    if (shouldIncludeMeme && memeText && validated.includeMeme) {
      console.log('Attempting meme generation:', { shouldIncludeMeme, memeText, includeMeme: validated.includeMeme });
      
      if (!imgflipService.isConfigured()) {
        console.warn('Meme generation skipped: Imgflip credentials not configured');
      } else {
        try {
          // TODO: Check user's meme limit before generating
          const memeResult = await imgflipService.generateAutomeme(memeText);
          memeUrl = memeResult.url;
          memePageUrl = memeResult.pageUrl;
          
          // TODO: Track meme usage
          console.log('Generated meme successfully:', { memeUrl, memePageUrl });
        } catch (error) {
          console.error('Meme generation failed:', error);
          // Continue without meme
        }
      }
    } else {
      console.log('Meme generation skipped:', { shouldIncludeMeme, memeText, includeMeme: validated.includeMeme });
    }

    // Step 5: Generate final reply
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
      throw new Error('Generation failed');
    }

    const generateData = await generateResponse.json();
    costs.generation = generateData.data.cost;

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