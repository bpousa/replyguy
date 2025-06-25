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
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('Perplexity API key not found');
      return NextResponse.json(
        { error: 'Perplexity search is not enabled - missing API key' },
        { status: 400 }
      );
    }
    
    if (process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY === 'false') {
      console.warn('Perplexity is disabled by environment variable');
      return NextResponse.json(
        { error: 'Perplexity search is disabled' },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Generate search query using GPT-4o
    const queryPrompt = validated.guidance 
      ? `The user has provided specific research guidance: "${validated.guidance}"

Generate a search query that will find EXACTLY what the user requested.
Focus on finding:
- Recent statistics or data (2023-2024)
- Current trends and percentages
- Official reports or studies
- Specific numbers and facts

Make the query specific and include relevant terms like "statistics", "data", "report", "study", "percentage", "trends", "2024", etc.

Search query:`
      : `Context:
Tweet: "${validated.originalTweet}"
User's response idea: "${validated.responseIdea}"

Generate a search query to find relevant CURRENT information, statistics, or trends about this topic.

Guidelines:
- Focus on recent data (2023-2024) to provide information beyond typical LLM knowledge cutoffs
- Include terms that will return concrete numbers, percentages, or specific facts
- Consider what statistics would be most relevant to the user's response idea
- If location matters, include it (USA, global, specific cities)
- Think broadly - could be economic data, social trends, tech stats, health data, etc.

Good query patterns:
- "[topic] statistics 2024 trends report"
- "[topic] data percentage change 2023-2024"
- "[topic] latest numbers study [location]"
- "current [topic] rates statistics [year]"

Search query:`;

    const queryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: queryPrompt }],
      temperature: 0.3,
      max_tokens: 50, // Increased for better query generation
    });

    const searchQuery = queryCompletion.choices[0].message.content?.trim() || '';
    
    console.log('=== PERPLEXITY RESEARCH DEBUG ===');
    console.log('Original guidance:', validated.guidance);
    console.log('Generated search query:', searchQuery);
    console.log('Query prompt tokens used:', queryCompletion.usage);

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

Return ONLY concrete statistics, facts, and data with specific numbers. Focus on:
- Recent statistics (2023-2024 preferred) that would be beyond typical AI knowledge
- Exact percentages, numbers, or measurable trends
- Credible sources (government reports, studies, official data)
- Current events or developments related to the topic

Format your response as bullet points with specific data points. Examples:
- "X increased/decreased by Y% in 2024 according to [Source]"
- "[Location] reported Z [metric] as of [Date]"
- "Study shows [specific finding with numbers]"

IMPORTANT: Focus on providing factual, numerical data that directly relates to the search query. Include diverse statistics if available, not just one type of data.`,
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
    let searchResults = perplexityData.choices[0].message.content || '';
    
    // Check if results contain actual statistics
    const hasNumbers = /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(searchResults);
    
    if (!hasNumbers && searchResults.length > 0) {
      // Log warning if no numbers found
      console.warn('Perplexity returned results without concrete statistics:', searchResults);
      searchResults = `${searchResults} [Note: Specific statistics requested but not found in search results]`;
    }
    
    console.log('Perplexity raw response:', searchResults);
    console.log('Contains numbers:', hasNumbers);
    console.log('Results length:', searchResults.length);
    console.log('=== END PERPLEXITY DEBUG ===');

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