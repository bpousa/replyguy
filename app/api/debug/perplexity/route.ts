import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const enablePerplexity = process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY;
    
    console.log('🔍 Debug: Environment check');
    console.log('PERPLEXITY_API_KEY:', perplexityKey ? 'SET' : 'MISSING');
    console.log('NEXT_PUBLIC_ENABLE_PERPLEXITY:', enablePerplexity);
    
    if (!perplexityKey) {
      return NextResponse.json({
        error: 'PERPLEXITY_API_KEY not set',
        status: 'env_error'
      }, { status: 400 });
    }
    
    if (enablePerplexity === 'false') {
      return NextResponse.json({
        error: 'Perplexity disabled by NEXT_PUBLIC_ENABLE_PERPLEXITY flag',
        status: 'disabled'
      }, { status: 400 });
    }

    // Test basic API connectivity
    console.log('🔍 Debug: Testing Perplexity API connectivity');
    
    const testRequest = {
      model: 'sonar-small-online',
      messages: [
        {
          role: 'system',
          content: 'Be precise and factual.'
        },
        {
          role: 'user',
          content: 'What is the current year? Give me just the number.'
        }
      ],
      max_tokens: 50,
      temperature: 0.2,
      return_citations: true,
      search_recency_filter: 'month'
    };
    
    console.log('🔍 Debug: Request payload:', JSON.stringify(testRequest, null, 2));
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    console.log('🔍 Debug: Response status:', response.status);
    console.log('🔍 Debug: Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('🔍 Debug: Raw response:', responseText);
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Perplexity API request failed',
        status: 'api_error',
        details: {
          status: response.status,
          statusText: response.statusText,
          response: responseText,
          headers: Object.fromEntries(response.headers.entries())
        }
      }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    
    return NextResponse.json({
      status: 'success',
      message: 'Perplexity API is working correctly',
      test_response: {
        content: data.choices[0].message.content,
        citations: data.citations?.length || 0,
        usage: data.usage
      },
      full_response: data
    });

  } catch (error) {
    console.error('🔍 Debug: Error during test:', error);
    
    return NextResponse.json({
      error: 'Debug test failed',
      status: 'internal_error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json({
        error: 'Query parameter required',
        example: { query: 'recent AI developments 2024' }
      }, { status: 400 });
    }

    console.log('🔍 Debug: Testing custom query:', query);
    
    // Test with custom query (similar to actual research endpoint)
    const searchRequest = {
      model: 'sonar-small-online',
      messages: [
        {
          role: 'user',
          content: `Search for: ${query}

Return ONLY concrete statistics, facts, and data with specific numbers. Focus on:
- Recent statistics (last 1-2 years preferred)
- Exact percentages, numbers, or measurable trends  
- Credible sources (government reports, studies, official data)
- Current events or developments related to the topic

Format your response as bullet points with specific data points.`
        }
      ],
      temperature: 0.2,
      max_tokens: 200,
      return_citations: true,
      search_recency_filter: 'month'
    };

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchRequest),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Custom query failed',
        status: 'api_error',
        query,
        details: {
          status: response.status,
          response: responseText
        }
      }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    const content = data.choices[0].message.content;
    
    // Analyze the response for statistics
    const hasNumbers = /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(content);
    
    return NextResponse.json({
      status: 'success',
      query,
      response: {
        content,
        has_statistics: hasNumbers,
        citations: data.citations?.length || 0,
        length: content.length
      },
      full_response: data
    });

  } catch (error) {
    console.error('🔍 Debug: Custom query error:', error);
    
    return NextResponse.json({
      error: 'Custom query test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}