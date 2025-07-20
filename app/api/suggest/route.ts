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
        "The 2024 data backs this up - remote work productivity increased by...",
        "This explains why [major company] just announced...",
        "You're spot on - especially the part about...",
        "Finally someone said it! The [specific industry] has been...",
        "Exactly why [recent trend] is accelerating...",
        "The [specific metric] proves your point perfectly...",
        "This + [related development] = game changer for..."
      ],
      disagree: [
        "Actually, [recent study/event] showed the opposite...",
        "Counterpoint: What happened with [specific example]...",
        "The [specific data/trend] tells a different story...",
        "Missing a key factor here - [specific element]...",
        "[Country/Company] tried this and it backfired because...",
        "The flaw in this logic is [specific issue]...",
        "Plot twist: [contradicting fact or angle]..."
      ],
      neutral: [
        "Curious how this compares to [specific alternative]...",
        "What's your take on the [specific aspect] part?",
        "This raises questions about [related topic]...",
        "Wonder if [specific factor] plays a role here...",
        "How does this square with [recent development]?",
        "The [specific detail] is interesting because...",
        "Would love to see data on [specific metric]..."
      ],
      other: [
        "Plot twist: [unexpected but relevant angle]",
        "This is giving major [relatable comparison] vibes",
        "[Specific detail] is doing all the heavy lifting here",
        "Tell me you're [observation] without telling me you're...",
        "The [specific thing] to [other thing] pipeline is real",
        "[This trend] walked so [new trend] could run",
        "Not the [unexpected element] making an appearance..."
      ]
    };
    
    // Randomly select 3 examples for variety
    const relevantExamples = examples[validated.responseType as keyof typeof examples] || examples.neutral;
    const shuffled = [...relevantExamples].sort(() => Math.random() - 0.5).slice(0, 3);
    
    const prompt = `Analyze this tweet and generate a specific reply starter: "${validated.tweet}"

You need to create a ${validated.responseType} reply starter with a ${validated.tone} tone.

Your task is to generate a SPECIFIC content hook or reply starter (5-20 words) that:
1. Directly engages with the tweet's actual content/topic
2. Provides a concrete angle, fact, comparison, or observation
3. Gives the user a strong starting point they can expand on
4. Sounds natural and conversational for Twitter
5. ${validated.responseType === 'agree' ? 'Amplifies or supports their point with specifics' : 
   validated.responseType === 'disagree' ? 'Challenges or counters with a specific angle' :
   validated.responseType === 'neutral' ? 'Explores or questions a specific aspect' :
   'Adds humor or wit related to the specific content'}

Examples of good ${validated.responseType} reply starters:
${shuffled.map(ex => `- "${ex}"`).join('\n')}

IMPORTANT: 
- Don't give instructions like "share statistics" or "use humor"
- Don't suggest personal anecdotes
- Generate an actual content hook the user can build on
- Be specific to the tweet's topic, not generic
- Make it feel like the beginning of an engaging Twitter reply

Reply starter:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Twitter reply expert who understands what makes replies engaging and likely to get attention. You generate specific content hooks and reply starters that sound natural, conversational, and directly engage with the tweet\'s content. You know Twitter culture, current trends, and how to craft replies that spark conversation.'
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