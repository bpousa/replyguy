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
  let validated: z.infer<typeof requestSchema> | undefined;
  const startTime = Date.now();
  
  console.log('\n🎭 ============ MEME API REQUEST START ============');
  console.log('📍 Request URL:', req.url);
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  try {
    // Check if meme generation is enabled (environment flag)
    if (process.env.ENABLE_IMGFLIP_AUTOMEME === 'false') {
      console.error('[meme API] ❌ Meme generation disabled via ENABLE_IMGFLIP_AUTOMEME flag');
      return NextResponse.json(
        { error: 'Meme generation is currently disabled' },
        { status: 503 }
      );
    }

    // Check if Imgflip is configured
    if (!imgflipService.isConfigured()) {
      console.error('[meme API] ❌ Imgflip service not configured - missing credentials');
      console.error('[meme API] Environment check:');
      console.error('  - IMGFLIP_USERNAME exists:', !!process.env.IMGFLIP_USERNAME);
      console.error('  - IMGFLIP_USERNAME length:', process.env.IMGFLIP_USERNAME?.length || 0);
      console.error('  - IMGFLIP_PASSWORD exists:', !!process.env.IMGFLIP_PASSWORD);
      console.error('  - IMGFLIP_PASSWORD length:', process.env.IMGFLIP_PASSWORD?.length || 0);
      console.error('  - NODE_ENV:', process.env.NODE_ENV);
      return NextResponse.json(
        { error: 'Meme service not configured' },
        { status: 503 }
      );
    }

    // Validate request body
    const body = await req.json();
    console.log('[meme API] 📥 Request body:', JSON.stringify(body, null, 2));
    
    validated = requestSchema.parse(body);
    console.log('[meme API] ✅ Request validation passed');

    // Check user's meme limit if userId provided
    if (validated.userId && validated.userId !== 'anonymous') {
      console.log('[meme API] 👤 Checking meme limits for user:', validated.userId);
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

    console.log('[meme API] 🎨 Starting meme generation');
    console.log('[meme API] 📝 Meme text:', validated.text);
    console.log('[meme API] 📏 Text length:', validated.text.length);

    // Generate the meme
    const memeGenerationStart = Date.now();
    const memeResult = await imgflipService.generateAutomeme(validated.text);
    const memeGenerationTime = Date.now() - memeGenerationStart;

    console.log('[meme API] ✅ Meme generated successfully:', {
      url: memeResult.url,
      pageUrl: memeResult.pageUrl,
      generationTime: `${memeGenerationTime}ms`
    });

    // Track meme usage if user is authenticated
    if (validated.userId && validated.userId !== 'anonymous') {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(cookieStore);

        await supabase.rpc('track_daily_usage', {
          p_user_id: validated.userId,
          p_usage_type: 'meme',
          p_count: 1
        }).throwOnError();
        
        console.log('[meme] ✅ Usage tracked successfully for user:', validated.userId);
      } catch (trackingError) {
        // Log the full error for debugging but don't fail the request
        console.error('[meme] Failed to track usage:', {
          error: trackingError,
          userId: validated.userId,
          message: trackingError instanceof Error ? trackingError.message : 'Unknown error'
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[meme API] 🎉 Request completed successfully in ${totalTime}ms`);
    console.log('🎭 ============ MEME API REQUEST END ============\n');
    
    return NextResponse.json({
      url: memeResult.url,
      pageUrl: memeResult.pageUrl
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('[meme API] ❌ ERROR CAUGHT:', {
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestText: validated?.text,
      requestUserId: validated?.userId,
      totalTime: `${totalTime}ms`
    });
    
    if (error instanceof z.ZodError) {
      console.error('[meme API] ❌ Validation error details:', error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Imgflip-specific errors
    if (error instanceof Error) {
      if (error.message.includes('This feature restricted to API Premium')) {
        console.error('[meme API] ❌ Imgflip Premium required');
        return NextResponse.json(
          { error: 'Meme generation requires premium API access' },
          { status: 402 }
        );
      }
      if (error.message.includes('Could not find a suitable meme template')) {
        // Log the failed text for debugging
        console.error('[meme API] ❌ No suitable meme template found');
        console.error('[meme API] Failed meme text:', validated?.text);
        console.error('[meme API] Text characteristics:', {
          length: validated?.text?.length,
          hasNumbers: /\d/.test(validated?.text || ''),
          hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(validated?.text || ''),
          wordCount: validated?.text?.split(/\s+/).length
        });
        return NextResponse.json(
          { 
            error: 'Could not generate meme for this text',
            suggestion: 'The AI needs to use more meme-friendly phrases'
          },
          { status: 422 }
        );
      }
    }

    console.error('[meme API] ❌ Unhandled error, returning 500');
    console.log('🎭 ============ MEME API REQUEST END (ERROR) ============\n');
    
    return NextResponse.json(
      { error: 'Failed to generate meme' },
      { status: 500 }
    );
  }
}