

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';

async function analyzeStyleWithGPT(tweets: string[]): Promise<any> {
  // Validate inputs
  if (!tweets || !Array.isArray(tweets)) {
    throw new Error('Invalid input: tweets must be an array');
  }
  
  if (tweets.length < 10) {
    throw new Error('At least 10 tweets are required for accurate analysis');
  }
  
  // Filter and validate each tweet
  const validTweets = tweets.filter(tweet => {
    return typeof tweet === 'string' && tweet.trim().length > 0 && tweet.trim().length <= 280;
  });
  
  if (validTweets.length < 10) {
    throw new Error('At least 10 valid tweets (non-empty, under 280 chars) are required');
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const content = `
    Analyze the writing style from the following tweets with extreme detail. Extract specific patterns, phrases, and unique characteristics that make this person's writing distinctive.

    **Tweets:**
    ${validTweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

    **JSON Output Format:**
    {
      "tone": "(specific tone description)",
      "formality": "(formal/informal/casual with specific indicators)",
      "vocabulary": {
        "level": "(simple/moderate/complex)",
        "uniqueWords": ["specific words they frequently use"],
        "avoidedWords": ["words they seem to avoid"],
        "slang": ["specific slang terms used"]
      },
      "sentencePatterns": {
        "structure": "(short and punchy/long and complex/varied)",
        "openings": ["common ways they start tweets"],
        "closings": ["common ways they end tweets"],
        "transitions": ["how they connect ideas"]
      },
      "punctuation": {
        "style": "(standard/minimal/expressive)",
        "specificPatterns": ["...", "!!!", "—", "specific uses"],
        "questionMarks": "(how they use questions)",
        "exclamations": "(frequency and style)"
      },
      "emojiPatterns": {
        "frequency": "(none/rare/occasional/frequent)",
        "specific": ["exact emojis they use"],
        "placement": "(beginning/middle/end of tweets)",
        "combinations": ["emoji pairs or sequences"]
      },
      "capitalization": {
        "style": "(standard/all lowercase/creative)",
        "emphasis": "(how they emphasize - CAPS/italics/etc)"
      },
      "linguisticFeatures": {
        "contractions": "(always/sometimes/never uses contractions)",
        "pronouns": "(I/we/you usage patterns)",
        "tense": "(present/past/mixed)",
        "voice": "(active/passive preference)"
      },
      "contentPatterns": {
        "themes": ["recurring topics or interests"],
        "humor": "(type: dry/sarcastic/punny/self-deprecating)",
        "references": ["cultural/pop culture references they make"],
        "storytelling": "(how they structure narratives)"
      },
      "uniqueQuirks": [
        "any distinctive writing habits or patterns"
      ],
      "examplePhrases": [
        "actual phrases that capture their voice"
      ],
      "doNotUse": [
        "patterns to avoid that would seem inauthentic"
      ]
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
    });

    if (response.choices[0].message.content) {
      return JSON.parse(response.choices[0].message.content);
    }
    throw new Error('Failed to get valid JSON response from GPT-4o');
  } catch (error) {
    console.error('Error analyzing style with GPT-4o:', error);
    throw new Error('Failed to analyze style.');
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: styles, error } = await supabase
    .from('user_styles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user styles:', error);
    return NextResponse.json({ error: 'Failed to fetch styles.' }, { status: 500 });
  }

  return NextResponse.json({ styles });
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let name: string;
  let sampleTweets: string[];
  
  try {
    const body = await req.json();
    name = body.name;
    sampleTweets = body.sampleTweets;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Style name is required' }, { status: 400 });
    }

    if (!sampleTweets || !Array.isArray(sampleTweets)) {
      return NextResponse.json({ error: 'Sample tweets must be an array' }, { status: 400 });
    }

    if (sampleTweets.length < 10) {
      return NextResponse.json({ 
        error: 'At least 10 sample tweets are required for accurate analysis',
        details: { provided: sampleTweets.length, required: 10 }
      }, { status: 400 });
    }
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const styleAnalysis = await analyzeStyleWithGPT(sampleTweets);

    const { data: style, error } = await supabase
      .from('user_styles')
      .insert({
        user_id: user.id,
        name: name.trim(),
        sample_tweets: sampleTweets,
        style_analysis: styleAnalysis,
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ style });
  } catch (error: any) {
    console.error('Error creating user style:', error);
    
    if (error.message?.includes('At least 10')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ 
        error: 'A style with this name already exists' 
      }, { status: 409 });
    }
    
    if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
      return NextResponse.json({ 
        error: 'Style analysis service is temporarily unavailable. Please try again.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create style. Please try again.' 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let styleId: string;
  let name: string | undefined;
  let sampleTweets: string[] | undefined;
  let isActive: boolean | undefined;
  
  try {
    const body = await req.json();
    styleId = body.styleId;
    name = body.name;
    sampleTweets = body.sampleTweets;
    isActive = body.isActive;
    
    if (!styleId || typeof styleId !== 'string') {
      return NextResponse.json({ error: 'Valid style ID is required' }, { status: 400 });
    }
    
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Style name cannot be empty' }, { status: 400 });
    }
    
    if (sampleTweets !== undefined) {
      if (!Array.isArray(sampleTweets)) {
        return NextResponse.json({ error: 'Sample tweets must be an array' }, { status: 400 });
      }
      if (sampleTweets.length < 10) {
        return NextResponse.json({ 
          error: 'At least 10 sample tweets are required',
          details: { provided: sampleTweets.length, required: 10 }
        }, { status: 400 });
      }
    }
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (isActive) {
    const { error } = await supabase.rpc('set_active_style', {
      p_user_id: user.id,
      p_style_id: styleId,
    });

    if (error) {
      console.error('Error setting active style:', error);
      return NextResponse.json({ error: 'Failed to set active style.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Active style updated.' });
  }

  try {
    const updateData: any = { name };
    if (sampleTweets) {
      updateData.sample_tweets = sampleTweets;
      updateData.style_analysis = await analyzeStyleWithGPT(sampleTweets);
      updateData.analyzed_at = new Date().toISOString();
    }

    const { data: style, error } = await supabase
      .from('user_styles')
      .update(updateData)
      .eq('id', styleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ style });
  } catch (error: any) {
    console.error('Error updating user style:', error);
    
    if (error.message?.includes('At least 10')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (error.code === '42P01') { // Table not found
      return NextResponse.json({ 
        error: 'Style not found' 
      }, { status: 404 });
    }
    
    if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
      return NextResponse.json({ 
        error: 'Style analysis service is temporarily unavailable. Please try again.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to update style. Please try again.' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const styleId = searchParams.get('styleId');

  if (!styleId) {
    return NextResponse.json({ error: 'Style ID is required.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_styles')
    .delete()
    .eq('id', styleId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting user style:', error);
    return NextResponse.json({ error: 'Failed to delete style.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Style deleted successfully.' });
}
