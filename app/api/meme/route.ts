import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { imgflipService } from '@/app/lib/services/imgflip.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Request validation schema
const requestSchema = z.object({
  text: z.string().min(1).max(100),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check if meme generation is enabled (environment flag)
    if (process.env.ENABLE_IMGFLIP_AUTOMEME === 'false') {
      return NextResponse.json(
        { error: 'Meme generation is currently disabled' },
        { status: 503 }
      );
    }

    // Check if Imgflip is configured
    if (!imgflipService.isConfigured()) {
      console.error('Imgflip service not configured - missing credentials');
      return NextResponse.json(
        { error: 'Meme service not configured' },
        { status: 503 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Check user's meme limit if userId provided
    if (validated.userId && validated.userId !== 'anonymous') {
      const cookieStore = cookies();
      const supabase = createServerClient(cookieStore);

      // Get user's current usage and plan limits
      const { data: usage } = await supabase
        .rpc('get_current_usage', { p_user_id: validated.userId })
        .single() as { data: { total_replies: number; total_memes: number; total_suggestions: number } | null };

      const { data: userData } = await supabase
        .from('users')
        .select(`
          subscriptions!inner(
            subscription_plans!inner(
              meme_limit,
              enable_memes
            )
          )
        `)
        .eq('id', validated.userId)
        .eq('subscriptions.status', 'active')
        .single() as { data: {
          subscriptions: Array<{
            subscription_plans: {
              meme_limit: number;
              enable_memes: boolean;
            }
          }>
        } | null };

      const plan = userData?.subscriptions?.[0]?.subscription_plans;
      
      if (!plan?.enable_memes) {
        return NextResponse.json(
          { error: 'Your plan does not include meme generation' },
          { status: 403 }
        );
      }

      if (usage && plan && usage.total_memes >= plan.meme_limit) {
        return NextResponse.json(
          { 
            error: 'Monthly meme limit reached',
            limit: plan.meme_limit,
            used: usage.total_memes
          },
          { status: 429 }
        );
      }
    }

    console.log('🎨 Generating meme with text:', validated.text);

    // Generate the meme
    const memeResult = await imgflipService.generateAutomeme(validated.text);

    console.log('✅ Meme generated successfully:', {
      url: memeResult.url,
      pageUrl: memeResult.pageUrl
    });

    // Track meme usage if user is authenticated
    if (validated.userId && validated.userId !== 'anonymous') {
      const cookieStore = cookies();
      const supabase = createServerClient(cookieStore);

      await supabase.rpc('track_daily_usage', {
        p_user_id: validated.userId,
        p_usage_type: 'meme',
        p_count: 1
      });
    }

    return NextResponse.json({
      url: memeResult.url,
      pageUrl: memeResult.pageUrl
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Imgflip-specific errors
    if (error instanceof Error) {
      if (error.message.includes('This feature restricted to API Premium')) {
        return NextResponse.json(
          { error: 'Meme generation requires premium API access' },
          { status: 402 }
        );
      }
      if (error.message.includes('Could not find a suitable meme template')) {
        // Log the failed text for debugging
        console.log('Failed meme text:', validated.text);
        return NextResponse.json(
          { 
            error: 'Could not generate meme for this text',
            suggestion: 'The AI needs to use more meme-friendly phrases'
          },
          { status: 422 }
        );
      }
    }

    console.error('Meme generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate meme' },
      { status: 500 }
    );
  }
}