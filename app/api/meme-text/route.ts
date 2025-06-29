import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openAIMemeService } from '@/app/lib/services/openai-meme.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Request validation schema
const requestSchema = z.object({
  userText: z.string().max(100).optional(),
  reply: z.string().min(1).max(1000),
  tone: z.string(),
  enhance: z.boolean().default(false),
  userId: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    // Validate request
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    console.log('[meme-text] Request:', {
      hasUserText: !!validated.userText,
      userText: validated.userText || 'none',
      userTextLength: validated.userText?.length,
      enhance: validated.enhance,
      tone: validated.tone,
      replyLength: validated.reply.length,
      replyPreview: validated.reply.substring(0, 100) + '...',
      userId: validated.userId || 'anonymous'
    });
    
    // Check if OpenAI is configured
    if (!openAIMemeService.isConfigured()) {
      console.error('[meme-text] OpenAI not configured');
      // Fallback to simple text if not configured
      return NextResponse.json({
        text: validated.userText || 'this is fine',
        enhanced: false,
        method: 'fallback'
      });
    }
    
    // Generate or enhance meme text
    const memeText = await openAIMemeService.generateMemeText({
      userText: validated.userText,
      reply: validated.reply,
      tone: validated.tone,
      enhance: validated.enhance
    });
    
    // Track meme generation if user is authenticated
    if (validated.userId && validated.userId !== 'anonymous') {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(cookieStore);
        
        // Track the meme text for variety
        await supabase
          .rpc('track_meme_usage', {
            p_user_id: validated.userId,
            p_meme_text: memeText
          })
          .throwOnError();
          
        console.log('[meme-text] Tracked meme usage:', memeText);
      } catch (trackError) {
        console.error('[meme-text] Failed to track meme:', trackError);
        // Don't fail the request
      }
    }
    
    return NextResponse.json({
      text: memeText,
      enhanced: validated.enhance || !validated.userText,
      method: 'gpt-4o'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('[meme-text] Error:', error);
    
    // Fallback response
    return NextResponse.json({
      text: 'this is fine',
      enhanced: false,
      method: 'error-fallback'
    });
  }
}