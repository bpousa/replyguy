import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

// Initialize OpenAI for query generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(2000),
  responseIdea: z.string().min(1).max(2000),
  responseType: z.string(),
  guidance: z.string().max(200).optional(),
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
    const queryPrompt = validated.guidance 
      ? `Tweet: "${validated.originalTweet}"
User wants to: ${validated.responseIdea}
Guidance: ${validated.guidance}

Generate a search query based on the guidance to find specific facts, statistics, or current events.
Search query:`
      : `Tweet: "${validated.originalTweet}"
User wants to: ${validated.responseIdea}
Response type: ${validated.responseType}

Generate a search query to find:
- Recent statistics or data (with dates)
- Current events or news (last 6 months)
- Specific facts with sources
- Real numbers or percentages

Focus on concrete, verifiable information.
Search query:`;

    const queryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
        model: 'sonar-small-online',
        messages: [
          {
            role: 'user',
            content: `Search for: ${searchQuery}

Provide 2-3 specific facts that are:
- Recent (include dates when possible)
- Concrete (numbers, percentages, specific events)
- Sourced (mention the source)
- Relevant to the topic

Format each fact clearly with its source.
Avoid generalizations or vague statements.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
        return_citations: true,
        search_recency_filter: 'month',
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error('Perplexity API request failed');
    }

    const perplexityData = await perplexityResponse.json();
    const searchResults = perplexityData.choices[0].message.content || '';

    // Calculate costs - GPT-4o pricing
    const queryPromptTokens = queryCompletion.usage?.prompt_tokens || 0;
    const queryCompletionTokens = queryCompletion.usage?.completion_tokens || 0;
    const queryCost = (queryPromptTokens * 0.0000025) + (queryCompletionTokens * 0.00001);
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