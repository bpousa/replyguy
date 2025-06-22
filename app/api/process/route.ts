import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserInput, GeneratedReply, CostBreakdown } from '@/app/lib/types';

// This is the main orchestrator endpoint that calls all other endpoints

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(500),
  responseIdea: z.string().min(1).max(200),
  responseType: z.enum(['agree', 'disagree', 'neutral', 'other']),
  tone: z.string(),
  needsResearch: z.boolean(),
});

export async function POST(req: NextRequest) {
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
      }),
    });

    if (!reasonResponse.ok) {
      throw new Error('Reasoning failed');
    }

    const reasonData = await reasonResponse.json();
    const selectedType = reasonData.data.selectedType;
    costs.reasoning = reasonData.data.cost;

    // Step 4: Generate final reply
    const generateResponse = await fetch(new URL('/api/generate', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: validated.originalTweet,
        responseIdea: validated.responseIdea,
        tone: validated.tone,
        selectedType,
        perplexityData,
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