import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

// Initialize OpenAI for query generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(500),
  responseIdea: z.string().min(1).max(200),
  responseType: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    // Check if Perplexity is enabled
    if (!process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY === 'false') {
      return NextResponse.json(
        { error: 'Perplexity search is not enabled' },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Generate search query using GPT-3.5
    const queryPrompt = `
Tweet: "${validated.originalTweet}"
User wants to: ${validated.responseIdea}
Response type: ${validated.responseType}

Generate a concise search query (3-7 words) to find supporting facts or statistics for this reply.
Focus on factual information that would enhance the response.

Search query:`;

    const queryCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: queryPrompt }],
      temperature: 0.3,
      max_tokens: 30,
    });

    const searchQuery = queryCompletion.choices[0].message.content?.trim() || '';

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'pplx-7b-online',
        messages: [
          {
            role: 'user',
            content: `Search for: ${searchQuery}. Provide 2-3 concise, factual points with sources.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error('Perplexity API request failed');
    }

    const perplexityData = await perplexityResponse.json();
    const searchResults = perplexityData.choices[0].message.content || '';

    // Calculate costs
    const queryTokens = queryCompletion.usage?.total_tokens || 0;
    const queryCost = queryTokens * 0.000002;
    const perplexityCost = 0.0002; // Estimated cost per request
    const totalCost = queryCost + perplexityCost;

    return NextResponse.json({
      data: {
        searchQuery,
        searchResults,
        cost: totalCost,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Failed to perform research' },
      { status: 500 }
    );
  }
}