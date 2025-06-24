import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { ResponseType, Tone } from '@/app/lib/types';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  tweet: z.string().min(1).max(2000),
  responseType: z.enum(['agree', 'disagree', 'neutral', 'other']),
  tone: z.string()
});

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Generate suggestion using GPT-3.5-turbo
    const prompt = `Given this tweet: "${validated.tweet}"

Generate a brief response idea for a ${validated.responseType} reply with a ${validated.tone} tone.
The suggestion should be 5-15 words that describes what the reply should convey.
Do NOT write the actual reply, just describe the idea.

Examples:
- "Share a similar experience"
- "Offer encouragement and support"
- "Add a helpful tip"
- "Make a witty observation"
- "Ask a follow-up question"
- "Provide relevant information"

Return only the suggestion, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that suggests response ideas for tweets. Keep suggestions brief and descriptive.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    const suggestion = completion.choices[0].message.content?.trim() || '';

    // Calculate cost - GPT-4o pricing
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const tokensUsed = promptTokens + completionTokens;
    const cost = (promptTokens * 0.0000025) + (completionTokens * 0.00001); // $2.50/$10 per 1M tokens

    return NextResponse.json({
      suggestion,
      cost,
      tokensUsed
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}