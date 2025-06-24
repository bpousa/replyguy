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
  enableMemes: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Build reasoning prompt
    const prompt = buildReasoningPrompt(validated);

    // Call Claude 3.5 Sonnet for reasoning
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.2,
      system: 'You are an expert at understanding social media culture and selecting appropriate response patterns. Be concise and analytical.',
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsedResponse = parseReasoningResponse(response, validated.selectedTypes);
    const selectedType = validated.selectedTypes.find(t => t.id === parsedResponse.typeId);

    if (!selectedType) {
      throw new Error('Failed to select reply type');
    }

    // Calculate cost
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
    const inputCost = message.usage.input_tokens * 0.000003; // $3 per 1M input tokens
    const outputCost = message.usage.output_tokens * 0.000015; // $15 per 1M output tokens
    const cost = inputCost + outputCost;

    return NextResponse.json({
      data: {
        selectedType,
        reasoning: response,
        includeMeme: parsedResponse.includeMeme,
        memeText: parsedResponse.memeText,
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

  const memeInstructions = input.enableMemes ? `

Also decide if a meme would enhance this reply. Memes work best for:
- Humorous or sarcastic tones
- Relatable situations
- Making a point through humor
- Reactions to absurd situations

If a meme would help, provide concise text (max 100 chars) that captures the essence.` : '';

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
3. Which allows natural incorporation of the tone and any research data?${memeInstructions}

Provide your response in this exact format:
Choice: [number] - [one sentence explanation]${input.enableMemes ? '\nMeme: [yes/no] - [meme text if yes, or "none" if no]' : ''}

Be decisive and specific.`;
}

function parseReasoningResponse(response: string, types: ReplyType[]): {
  typeId: string;
  includeMeme: boolean;
  memeText: string | null;
} {
  // Parse choice
  const choiceMatch = response.match(/Choice:\s*(\d+)/i);
  let typeId = types[0].id; // Default to first type
  
  if (choiceMatch) {
    const index = parseInt(choiceMatch[1]) - 1;
    if (index >= 0 && index < types.length) {
      typeId = types[index].id;
    }
  }

  // Parse meme decision
  let includeMeme = false;
  let memeText: string | null = null;
  
  const memeMatch = response.match(/Meme:\s*(yes|no)\s*-\s*(.+)/i);
  if (memeMatch) {
    includeMeme = memeMatch[1].toLowerCase() === 'yes';
    if (includeMeme && memeMatch[2] && memeMatch[2].toLowerCase() !== 'none') {
      memeText = memeMatch[2].trim();
      // Ensure meme text isn't too long
      if (memeText.length > 100) {
        memeText = memeText.substring(0, 100);
      }
    }
  }

  return { typeId, includeMeme, memeText };
}