

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeStyleWithGPT(tweets: string[]): Promise<any> {
  const content = `
    Analyze the writing style from the following tweets and return a JSON object.

    **Tweets:**
    ${tweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

    **JSON Output Format:**
    {
      "tone": "(e.g., witty, formal, sarcastic, enthusiastic)",
      "formality": "(e.g., formal, informal, casual)",
      "vocabulary": "(e.g., simple, sophisticated, technical, slang)",
      "sentenceStructure": "(e.g., short and punchy, long and complex, varied)",
      "emojiUsage": "(e.g., none, frequent, occasional, specific emojis)",
      "capitalization": "(e.g., standard, all lowercase, title case)",
      "punctuation": "(e.g., standard, minimal, expressive)",
      "personalityTraits": ["(e.g., humorous", "analytical", "friendly", "direct")]
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
  const supabase = createClient();
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, sampleTweets } = await req.json();

  if (!name || !sampleTweets || sampleTweets.length < 3) {
    return NextResponse.json({ error: 'Name and at least 3 sample tweets are required.' }, { status: 400 });
  }

  try {
    const styleAnalysis = await analyzeStyleWithGPT(sampleTweets);

    const { data: style, error } = await supabase
      .from('user_styles')
      .insert({
        user_id: user.id,
        name,
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
  } catch (error) {
    console.error('Error creating user style:', error);
    return NextResponse.json({ error: 'Failed to create style.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { styleId, name, sampleTweets, isActive } = await req.json();

  if (!styleId) {
    return NextResponse.json({ error: 'Style ID is required.' }, { status: 400 });
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
  } catch (error) {
    console.error('Error updating user style:', error);
    return NextResponse.json({ error: 'Failed to update style.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
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
