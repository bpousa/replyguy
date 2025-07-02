import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Request validation schema
const reportSchema = z.object({
  replyText: z.string().min(1).max(2000),
  reportedPhrase: z.string().min(1).max(500),
  originalTweet: z.string().optional(),
  responseIdea: z.string().optional(),
  replyType: z.string().optional(),
  userFeedback: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = reportSchema.parse(body);
    
    // Get user session
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Extract context around the reported phrase
    const phraseIndex = validated.replyText.indexOf(validated.reportedPhrase);
    let phraseContext = '';
    
    if (phraseIndex !== -1) {
      const contextStart = Math.max(0, phraseIndex - 50);
      const contextEnd = Math.min(
        validated.replyText.length, 
        phraseIndex + validated.reportedPhrase.length + 50
      );
      phraseContext = validated.replyText.substring(contextStart, contextEnd);
    }
    
    // Check if this phrase was already reported
    const { data: existingReport } = await supabase
      .from('reported_ai_phrases')
      .select('id, report_count')
      .eq('reported_phrase', validated.reportedPhrase)
      .is('validated', null)
      .single();
    
    if (existingReport) {
      // Update the report count
      const { error: updateError } = await supabase
        .from('reported_ai_phrases')
        .update({
          report_count: existingReport.report_count + 1,
          last_reported_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id);
      
      if (updateError) {
        console.error('Failed to update report count:', updateError);
        return NextResponse.json(
          { error: 'Failed to update report' },
          { status: 500 }
        );
      }
    } else {
      // Insert new report
      const { error: insertError } = await supabase
        .from('reported_ai_phrases')
        .insert({
          user_id: user?.id || null,
          reply_text: validated.replyText,
          reported_phrase: validated.reportedPhrase,
          phrase_context: phraseContext,
          user_feedback: validated.userFeedback,
          original_tweet: validated.originalTweet,
          response_idea: validated.responseIdea,
          reply_type: validated.replyType,
        });
      
      if (insertError) {
        console.error('Failed to insert report:', insertError);
        return NextResponse.json(
          { error: 'Failed to save report' },
          { status: 500 }
        );
      }
    }
    
    // Check if this phrase has been reported enough times to warrant review
    const { data: reportCountData } = await supabase
      .rpc('get_phrase_report_count', { phrase: validated.reportedPhrase })
      .single() as { data: { count: number } | null };
    
    const reportCount = reportCountData?.count || 1;
    
    // Log for monitoring
    console.log('AI phrase reported:', {
      phrase: validated.reportedPhrase,
      totalReports: reportCount,
      userId: user?.id,
    });
    
    // If reported more than 5 times, it might need immediate attention
    if (reportCount >= 5) {
      console.warn('High-frequency AI phrase detected:', {
        phrase: validated.reportedPhrase,
        reports: reportCount,
      });
    }
    
    return NextResponse.json({ 
      success: true,
      totalReports: reportCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('AI phrase report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve frequently reported phrases
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get top reported phrases
    const { data, error } = await supabase
      .rpc('analyze_reported_phrases', { min_reports: 3 });
    
    if (error) {
      console.error('Failed to fetch reported phrases:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Get reported phrases error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}