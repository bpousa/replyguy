import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { ResponseType, Tone } from '@/app/lib/types';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

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

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse and validate request
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    // Check user limits for suggestions
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get user's current usage and plan limits
      const { data: usage } = await supabase
        .rpc('get_current_usage', { p_user_id: user.id })
        .single() as { data: { total_replies: number; total_memes: number; total_suggestions: number } | null };
      
      // Get user's active plan
      const { data: userData } = await supabase
        .from('users')
        .select(`
          subscriptions!inner(
            subscription_plans!inner(
              suggestion_limit
            )
          )
        `)
        .eq('id', user.id)
        .eq('subscriptions.status', 'active')
        .single() as { data: {
          subscriptions: Array<{
            subscription_plans: {
              suggestion_limit: number;
            }
          }>
        } | null };
      
      const plan = userData?.subscriptions?.[0]?.subscription_plans;
      
      // If no active plan, get free plan limits
      let suggestionLimit = 0;
      if (plan) {
        suggestionLimit = plan.suggestion_limit;
      } else {
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('suggestion_limit')
          .eq('id', 'free')
          .single();
        
        suggestionLimit = freePlan?.suggestion_limit || 0;
      }
      
      // Check if user has reached their suggestion limit
      if (usage && usage.total_suggestions >= suggestionLimit) {
        return NextResponse.json(
          { 
            error: 'Monthly suggestion limit reached',
            limit: suggestionLimit,
            used: usage.total_suggestions,
            upgradeUrl: '/pricing'
          },
          { status: 429 }
        );
      }
    }

    // Generate suggestion using GPT-4o
    const examples = {
      agree: [
        "Build on their point with evidence",
        "Share a supporting anecdote",
        "Validate their feelings",
        "Add another perspective that agrees",
        "Express enthusiastic agreement",
        "Share a similar frustration",
        "Confirm with personal experience"
      ],
      disagree: [
        "Present a counter-argument politely",
        "Question their assumptions respectfully",
        "Offer alternative viewpoint",
        "Challenge with facts",
        "Point out a different angle",
        "Suggest reconsidering the stance",
        "Provide contradicting evidence"
      ],
      neutral: [
        "Ask for clarification",
        "Add context or background",
        "Share relevant information",
        "Pose a thoughtful question",
        "Suggest a resource",
        "Expand on the topic",
        "Connect to related ideas"
      ],
      other: [
        "Make a witty observation",
        "Use humor to engage",
        "Create a clever analogy",
        "Reference pop culture",
        "Make a playful comment",
        "Use wordplay or puns",
        "Add unexpected twist"
      ]
    };
    
    // Randomly select 3 examples for variety
    const relevantExamples = examples[validated.responseType as keyof typeof examples] || examples.neutral;
    const shuffled = [...relevantExamples].sort(() => Math.random() - 0.5).slice(0, 3);
    
    const prompt = `Given this tweet: "${validated.tweet}"

Generate a creative and specific response idea for a ${validated.responseType} reply with a ${validated.tone} tone.
The suggestion should be 5-15 words that describes what the reply should convey.
Be specific and avoid generic suggestions.

Examples of ${validated.responseType} responses:
${shuffled.map(ex => `- "${ex}"`).join('\n')}

Create something unique and contextual to this specific tweet.
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
      temperature: 0.9,
      max_tokens: 50
    });

    const suggestion = completion.choices[0].message.content?.trim() || '';

    // Calculate cost - GPT-4o pricing
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const tokensUsed = promptTokens + completionTokens;
    const cost = (promptTokens * 0.0000025) + (completionTokens * 0.00001); // $2.50/$10 per 1M tokens

    // Track suggestion usage for authenticated users
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(cookieStore);
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Track the suggestion usage
        const { error: trackingError } = await supabase.rpc('track_daily_usage', {
          p_user_id: user.id,
          p_usage_type: 'suggestion',
          p_count: 1
        });
        
        if (trackingError) {
          console.error('[suggest] Failed to track usage:', trackingError);
        } else {
          console.log('[suggest] Successfully tracked suggestion usage for user:', user.id);
        }
      }
    } catch (trackingError) {
      // Log error but don't fail the request
      console.error('[suggest] Error tracking suggestion usage:', trackingError);
    }

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