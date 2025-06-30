import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { researchCache } from '@/app/lib/services/research-cache.service';

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

function sanitizePerplexityResponse(response: string, maxTokens: number = 400): string {
  // Rough token estimation: ~4 chars per token
  const maxChars = maxTokens * 4;
  
  if (response.length <= maxChars) {
    return response;
  }
  
  console.log(`⚠️ Sanitizing large Perplexity response: ${response.length} chars -> ~${maxChars} chars`);
  
  // Split into sentences and prioritize ones with numbers/statistics
  const sentences = response.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  // Score sentences: higher score = more important
  const scoredSentences = sentences.map(sentence => {
    let score = 0;
    
    // High priority: sentences with percentages or specific numbers
    if (/\d+%/.test(sentence)) score += 10;
    if (/\d+\s*(million|billion|thousand)/.test(sentence)) score += 8;
    if (/\d{4}/.test(sentence)) score += 6; // Years
    if (/according to|report|study|data shows/i.test(sentence)) score += 5;
    if (/\d+/.test(sentence)) score += 3; // Any numbers
    
    // Lower priority: general statements
    if (sentence.length < 50) score -= 2; // Very short sentences
    if (/however|moreover|furthermore/i.test(sentence)) score -= 1; // Transition words
    
    return { sentence, score, length: sentence.length };
  });
  
  // Sort by score (highest first) and select top sentences that fit
  scoredSentences.sort((a, b) => b.score - a.score);
  
  let result = '';
  let totalChars = 0;
  
  for (const item of scoredSentences) {
    const sentenceWithPeriod = item.sentence + '. ';
    if (totalChars + sentenceWithPeriod.length <= maxChars) {
      result += sentenceWithPeriod;
      totalChars += sentenceWithPeriod.length;
    }
  }
  
  // If we still have space, add a truncation notice
  if (result.length < response.length && totalChars < maxChars - 50) {
    result += '\n[Note: Additional data available but truncated for brevity]';
  }
  
  return result.trim();
}

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

    // Check research limits
    if (body.userId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        );

        const { data: limits } = await supabase
          .rpc('get_user_limits', { p_user_id: body.userId })
          .single();

        if (limits) {
          const researchLimit = limits.research_limit || 0;
          const researchUsed = limits.research_used || 0;

          // -1 means unlimited
          if (researchLimit !== -1 && researchUsed >= researchLimit) {
            return NextResponse.json(
              { 
                error: 'Research limit reached',
                limit: researchLimit,
                used: researchUsed
              },
              { status: 429 }
            );
          }

          // Track research usage
          await supabase.rpc('track_daily_usage', {
            p_user_id: body.userId,
            p_usage_type: 'research',
            p_count: 1
          });
        }
      } catch (error) {
        console.error('Error checking research limits:', error);
        // Continue without blocking if limit check fails
      }
    }

    // Check cache first to avoid redundant API calls
    const cacheKey = {
      originalTweet: validated.originalTweet,
      responseIdea: validated.responseIdea,
      responseType: validated.responseType,
      guidance: validated.guidance
    };
    
    const cachedResult = researchCache.get(cacheKey);
    if (cachedResult) {
      console.log('✅ CACHE HIT - Returning cached research results');
      console.log('📊 Cached Query:', cachedResult.searchQuery);
      console.log('📈 Cached Results Preview:', cachedResult.searchResults.substring(0, 100) + '...');
      console.log('🔗 Cached Citations:', cachedResult.citations?.length || 0);
      console.log('💰 Original Cost:', cachedResult.cost, '(saved by cache)');
      
      return NextResponse.json({
        data: {
          searchQuery: cachedResult.searchQuery,
          searchResults: cachedResult.searchResults,
          citations: cachedResult.citations || [],
          cost: 0, // No cost for cached results
          cached: true,
          originalCost: cachedResult.cost
        },
      });
    }
    
    console.log('❌ CACHE MISS - Proceeding with API calls');

    // Generate search query using GPT-4o
    const currentYear = new Date().getFullYear();
    const queryPrompt = validated.guidance 
      ? `The user has provided specific research guidance: "${validated.guidance}"

Current year: ${currentYear}

Generate a search query that will find EXACTLY what the user requested.
Focus on finding:
- VERY recent statistics or data (${currentYear} or ${currentYear - 1} only)
- Current trends and percentages from THIS YEAR
- Official reports or studies from the past 12 months
- Specific numbers and facts that are up-to-date

Make the query specific and include year indicators like "${currentYear}", "latest ${currentYear}", "current ${currentYear}", etc.
Include relevant terms like "statistics", "data", "report", "study", "percentage", "trends", "recent", "latest", etc.

Search query:`
      : `Context:
Tweet: "${validated.originalTweet}"
User's response idea: "${validated.responseIdea}"

Current year: ${currentYear}

Generate a search query to find relevant CURRENT information, statistics, or trends about this topic.

Guidelines:
- Focus on VERY recent data (${currentYear} or ${currentYear - 1} ONLY) to provide the most up-to-date information
- Include year indicators in the query (e.g., "${currentYear}", "latest ${currentYear}", "Q1 ${currentYear}")
- Include terms that will return concrete numbers, percentages, or specific facts
- Consider what statistics would be most relevant to the user's response idea
- If location matters, include it (USA, global, specific cities)
- Think broadly - could be economic data, social trends, tech stats, health data, etc.

Good query patterns:
- "[topic] statistics ${currentYear} trends report"
- "[topic] data percentage change ${currentYear} latest"
- "[topic] current ${currentYear} numbers study [location]"
- "latest [topic] rates statistics ${currentYear}"
- "[topic] market size ${currentYear} forecast"

Search query:`;

    const queryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: queryPrompt }],
      temperature: 0.3,
      max_tokens: 50, // Increased for better query generation
    });

    const searchQuery = queryCompletion.choices[0].message.content?.trim() || '';
    
    console.log('\n📋 === QUERY GENERATION PROMPT ===');
    console.log(queryPrompt);
    console.log('\n🤖 === GPT-4O QUERY RESPONSE ===');
    console.log(searchQuery);
    console.log('\n💰 Query Generation Tokens:', queryCompletion.usage);

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides accurate, factual information with specific statistics and data points. Always cite sources when possible.'
          },
          {
            role: 'user',
            content: `Search for: ${searchQuery}

Current year: ${currentYear}
Current month: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

Return ONLY concrete statistics, facts, and data with specific numbers. Focus on:
- VERY recent statistics from ${currentYear} or late ${currentYear - 1} ONLY
- Ignore any data from ${currentYear - 2} or earlier unless specifically about historical comparisons
- Exact percentages, numbers, or measurable trends from THIS YEAR
- Credible sources with dates (government reports, studies, official data)
- Current events or developments from the past 6 months

Format your response as bullet points with specific data points. Examples:
- "X increased/decreased by Y% in ${currentYear} according to [Source]"
- "[Location] reported Z [metric] as of [Month ${currentYear}]"
- "Q1 ${currentYear} data shows [specific finding with numbers]"
- "Latest ${currentYear} report indicates [fact with number]"

CRITICAL: If you find older data (like 2023 or earlier), DO NOT include it unless it's being compared to ${currentYear} data. We need the MOST CURRENT information available.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
        return_citations: true,
        search_recency_filter: 'month',
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('❌ Perplexity API Error Details:');
      console.error('Status:', perplexityResponse.status);
      console.error('StatusText:', perplexityResponse.statusText);
      console.error('Response:', errorText);
      console.error('Request model:', 'sonar');
      
      throw new Error(`Perplexity API request failed: ${perplexityResponse.status} ${perplexityResponse.statusText} - ${errorText}`);
    }

    const perplexityData = await perplexityResponse.json();
    let searchResults = perplexityData.choices[0].message.content || '';
    
    console.log('\n🔍 === FULL PERPLEXITY RESPONSE ===');
    console.log('Full response structure:', JSON.stringify(perplexityData, null, 2));
    
    console.log('\n📋 === PERPLEXITY SEARCH PROMPT ===');
    console.log(`Search for: ${searchQuery}\n\nReturn ONLY concrete statistics, facts, and data with specific numbers. Focus on:\n- Recent statistics (last 1-2 years preferred) that would be beyond typical AI knowledge\n- Exact percentages, numbers, or measurable trends\n- Credible sources (government reports, studies, official data)\n- Current events or developments related to the topic\n\nFormat your response as bullet points with specific data points. Examples:\n- "X increased/decreased by Y% in 2024 according to [Source]"\n- "[Location] reported Z [metric] as of [Date]"\n- "Study shows [specific finding with numbers]"\n\nIMPORTANT: Focus on providing factual, numerical data that directly relates to the search query. Include diverse statistics if available, not just one type of data.`);
    
    console.log('\n🌐 === PERPLEXITY RESPONSE (RAW) ===');
    console.log('Raw length:', searchResults.length, 'characters');
    console.log('Raw content:', searchResults);
    
    // SANITIZE RESPONSE - Prevent 1,500+ token responses from breaking prompts
    searchResults = sanitizePerplexityResponse(searchResults);
    
    console.log('\n🧹 === PERPLEXITY RESPONSE (SANITIZED) ===');
    console.log('Sanitized length:', searchResults.length, 'characters');
    console.log('Sanitized content:', searchResults);
    
    // Check if results contain actual statistics
    const hasNumbers = /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(searchResults);
    
    if (!hasNumbers && searchResults.length > 0) {
      console.warn('⚠️ Perplexity returned results without concrete statistics');
      searchResults = `${searchResults} [Note: Specific statistics requested but not found in search results]`;
    }
    
    console.log('\n📊 === SEARCH ANALYSIS ===');
    console.log('Contains numbers/stats:', hasNumbers);
    console.log('Results length:', searchResults.length, 'characters');
    console.log('Citations included:', perplexityData.citations ? perplexityData.citations.length : 0);
    
    // Debug citations to see what Perplexity is returning
    if (perplexityData.citations) {
      console.log('\n🔗 === CITATIONS DEBUG ===');
      perplexityData.citations.forEach((citation: any, index: number) => {
        console.log(`Citation ${index + 1}:`, citation);
      });
    }

    // Calculate costs - GPT-4o pricing
    const queryPromptTokens = queryCompletion.usage?.prompt_tokens || 0;
    const queryCompletionTokens = queryCompletion.usage?.completion_tokens || 0;
    const queryCost = (queryPromptTokens * 0.0000025) + (queryCompletionTokens * 0.00001);
    const perplexityCost = 0.0002; // Estimated cost per request
    const totalCost = queryCost + perplexityCost;

    // Extract citations from the correct field
    // Perplexity returns citations in different formats depending on the model
    let citations: Array<{ url: string; title?: string }> = [];
    
    // Check multiple possible locations for citations
    if (perplexityData.citations) {
      // Perplexity returns citations as an array of URL strings
      // We need to convert them to our expected format
      if (Array.isArray(perplexityData.citations)) {
        citations = perplexityData.citations.map((citation: any) => {
          // If it's already an object with url property, use it
          if (typeof citation === 'object' && citation.url) {
            return citation;
          }
          // If it's a string (URL), create an object
          if (typeof citation === 'string') {
            // Try to find title from search_results if available
            let title = undefined;
            if (perplexityData.search_results && Array.isArray(perplexityData.search_results)) {
              const matchingResult = perplexityData.search_results.find((result: any) => result.url === citation);
              if (matchingResult && matchingResult.title) {
                title = matchingResult.title;
              }
            }
            return { url: citation, title };
          }
          return null;
        }).filter(Boolean); // Remove any null entries
      }
    } else if (perplexityData.choices?.[0]?.citations) {
      citations = perplexityData.choices[0].citations;
    } else if (perplexityData.choices?.[0]?.message?.citations) {
      citations = perplexityData.choices[0].message.citations;
    }
    
    console.log('\n📚 === EXTRACTED CITATIONS ===');
    console.log('Citations found:', citations.length);
    console.log('Citation details:', citations);

    // Cache the results for future requests
    researchCache.set(cacheKey, {
      searchQuery,
      searchResults,
      citations: citations,
      cost: totalCost
    });

    return NextResponse.json({
      data: {
        searchQuery,
        searchResults,
        citations: citations,
        cost: totalCost,
        cached: false
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