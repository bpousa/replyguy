import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const correctionSchema = z.object({
  styleId: z.string().uuid().optional().nullable(),
  originalTweet: z.string(),
  responseIdea: z.string(),
  replyType: z.string(),
  tone: z.string(),
  generatedReply: z.string(),
  correctedReply: z.string(),
  correctionNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = correctionSchema.parse(body);

    // Insert the correction
    const { data: correction, error } = await supabase
      .from('reply_corrections')
      .insert({
        user_id: user.id,
        style_id: validated.styleId,
        original_tweet: validated.originalTweet,
        response_idea: validated.responseIdea,
        reply_type: validated.replyType,
        tone: validated.tone,
        generated_reply: validated.generatedReply,
        corrected_reply: validated.correctedReply,
        correction_notes: validated.correctionNotes,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Check if we should trigger re-analysis
    if (validated.styleId) {
      const { data: analysisCheck } = await supabase
        .rpc('analyze_style_corrections', { p_style_id: validated.styleId });

      if (analysisCheck?.needs_reanalysis) {
        // Queue background job to re-analyze style
        // For now, we'll just return a flag
        return NextResponse.json({
          correction,
          needsReanalysis: true,
          message: 'Thank you! Your feedback helps improve your writing style.',
        });
      }
    }

    return NextResponse.json({
      correction,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving correction:', error);
    return NextResponse.json(
      { error: 'Failed to save correction' },
      { status: 500 }
    );
  }
}

// Get user's recent corrections
export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const styleId = url.searchParams.get('styleId');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  try {
    let query = supabase
      .from('reply_corrections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (styleId) {
      query = query.eq('style_id', styleId);
    }

    const { data: corrections, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ corrections });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrections' },
      { status: 500 }
    );
  }
}