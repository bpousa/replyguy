import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { ReplyType } from '@/app/lib/types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string(),
  responseIdea: z.string(),
  tone: z.string(),
  selectedTypes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    pattern: z.string(),
    styleRules: z.string(),
    examples: z.array(z.string()),
    tags: z.array(z.string()),
    complexity: z.number(),
  })),
  perplexityData: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Build reasoning prompt
    const prompt = buildReasoningPrompt(validated);

    // Call Claude Sonnet for reasoning
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 200,
      temperature: 0.2,
      system: 'You are an expert at understanding social media culture and selecting appropriate response patterns. Be concise and analytical.',
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';
    const selectedTypeId = parseReasoningResponse(response, validated.selectedTypes);
    const selectedType = validated.selectedTypes.find(t => t.id === selectedTypeId);

    if (!selectedType) {
      throw new Error('Failed to select reply type');
    }

    // Calculate cost
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
    const cost = tokensUsed * 0.000003; // Claude Sonnet pricing

    return NextResponse.json({
      data: {
        selectedType,
        reasoning: response,
        tokensUsed,
        cost,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Reasoning error:', error);
    return NextResponse.json(
      { error: 'Failed to reason about reply type' },
      { status: 500 }
    );
  }
}

function buildReasoningPrompt(input: any): string {
  const typeDescriptions = input.selectedTypes
    .map((t: ReplyType, i: number) => `
${i + 1}. ${t.name}
   Pattern: ${t.pattern}
   Style: ${t.styleRules}
   Tags: ${t.tags.join(', ')}`)
    .join('\n');

  return `
Context:
- Tweet: "${input.originalTweet}"
- Intent: ${input.responseIdea}
- Desired tone: ${input.tone}
${input.perplexityData ? `- Research data: ${input.perplexityData}` : ''}

Reply pattern options:
${typeDescriptions}

Analyze which pattern would create the most natural, engaging, and appropriate response.
Consider:
1. Which pattern best matches the user's intent?
2. Which fits Twitter culture and conventions?
3. Which allows natural incorporation of the tone and any research data?

Provide your choice in this exact format:
Choice: [number] - [one sentence explanation]

Be decisive and specific.`;
}

function parseReasoningResponse(response: string, types: ReplyType[]): string {
  const match = response.match(/Choice:\s*(\d+)/i);
  if (match) {
    const index = parseInt(match[1]) - 1;
    if (index >= 0 && index < types.length) {
      return types[index].id;
    }
  }
  // Fallback to first type
  return types[0].id;
}