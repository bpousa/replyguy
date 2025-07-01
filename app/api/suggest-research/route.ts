import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(2000),
  responseIdea: z.string().min(1).max(2000),
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
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Generate research suggestions using GPT-4o
    const prompt = `Given this context:
Tweet: "${validated.originalTweet}"
Response idea: "${validated.responseIdea}"
Response type: ${validated.responseType}
Tone: ${validated.tone}

Current date: ${currentMonth}

Generate 3 specific research queries that would help find relevant, current statistics or facts to support this response.

Guidelines:
- Focus on finding ${currentYear} or late ${currentYear - 1} data only
- Be specific about what statistics or facts would strengthen the response
- Include year indicators (e.g., "${currentYear}", "latest ${currentYear}", "Q1 ${currentYear}")
- Consider the response type - agreeing might need supporting stats, disagreeing might need counter-evidence
- Think about what specific numbers, percentages, or trends would be most impactful

Good patterns:
- "[specific topic] statistics ${currentYear} [location if relevant]"
- "[metric] trends ${currentYear} latest report"
- "current [topic] data ${currentYear} percentage"
- "[industry/field] ${currentYear} forecast numbers"

Return exactly 3 suggestions, one per line, no numbering or bullets.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant that suggests specific search queries to find current statistics and facts. Focus on queries that will return concrete numbers and recent data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const suggestionsText = completion.choices[0].message.content?.trim() || '';
    const suggestions = suggestionsText.split('\n').filter(s => s.trim()).slice(0, 3);

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
          console.error('[suggest-research] Failed to track usage:', trackingError);
        } else {
          console.log('[suggest-research] Successfully tracked suggestion usage for user:', user.id);
        }
      }
    } catch (trackingError) {
      // Log error but don't fail the request
      console.error('[suggest-research] Error tracking suggestion usage:', trackingError);
    }

    return NextResponse.json({
      suggestions,
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

    console.error('Research suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate research suggestions' },
      { status: 500 }
    );
  }
}