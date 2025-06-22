import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string(),
  responseIdea: z.string(),
  tone: z.string(),
  selectedType: z.object({
    id: z.string(),
    name: z.string(),
    pattern: z.string(),
    styleRules: z.string(),
    examples: z.array(z.string()),
  }),
  perplexityData: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Build generation prompt
    const prompt = buildGenerationPrompt(validated);

    // Call Claude Opus for final generation
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 100,
      temperature: 0.8,
      system: 'You are a witty, authentic Twitter user. Write natural replies without AI-isms. Be conversational and genuine.',
      messages: [{ role: 'user', content: prompt }],
    });

    let reply = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Clean and validate the reply
    reply = cleanReply(reply);

    // Calculate cost
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
    const cost = tokensUsed * 0.000015; // Claude Opus pricing

    return NextResponse.json({
      data: {
        reply,
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

    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}

function buildGenerationPrompt(input: any): string {
  return `
Write a ${input.selectedType.name} reply to this tweet:
"${input.originalTweet}"

Your reply should:
- ${input.responseIdea}
- Follow this pattern: ${input.selectedType.pattern}
- Style: ${input.selectedType.styleRules}
- Tone: ${input.tone}
${input.perplexityData ? `- Naturally incorporate: ${input.perplexityData}` : ''}

Rules:
- Under 280 characters
- No emojis or em-dashes
- Start directly (no "Great point!" or "I think...")
- Sound like you're continuing a conversation
- Match their energy level
- Be authentic and natural

Example of this style: "${input.selectedType.examples[0]}"

Reply:`;
}

function cleanReply(reply: string): string {
  // Remove any AI-isms and clean up
  reply = reply.trim();
  
  // Remove common AI prefixes
  const bannedStarts = [
    /^(Great point|I think|Absolutely|Interesting|Fair enough|Well,|So,|Oh,|Ah,)[,!.]?\s*/i,
    /^(That's|This is|It's)\s+(a\s+)?(great|interesting|good)\s+(point|question|observation)[,!.]?\s*/i,
  ];
  
  for (const pattern of bannedStarts) {
    reply = reply.replace(pattern, '');
  }

  // Remove quotes if the entire reply is quoted
  if (reply.startsWith('"') && reply.endsWith('"')) {
    reply = reply.slice(1, -1);
  }

  // Ensure it's not too long
  if (reply.length > 280) {
    // Try to cut at a sentence boundary
    const sentences = reply.match(/[^.!?]+[.!?]+/g) || [reply];
    let truncated = '';
    
    for (const sentence of sentences) {
      if (truncated.length + sentence.length <= 277) {
        truncated += sentence;
      } else {
        break;
      }
    }
    
    reply = truncated || reply.substring(0, 277) + '...';
  }

  return reply;
}