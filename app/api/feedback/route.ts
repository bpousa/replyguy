import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { AntiAIDetector } from '@/app/lib/services/anti-ai-detector.service';

// Request validation schema
const feedbackSchema = z.object({
  replyText: z.string().min(1).max(2000),
  originalTweet: z.string().optional(),
  responseIdea: z.string().optional(),
  feedbackType: z.enum(['sounds_ai', 'sounds_human', 'report_issue']),
  feedbackDetails: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = feedbackSchema.parse(body);
    
    // Get user session
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Analyze the reply for AI patterns
    const hasAIPatterns = AntiAIDetector.hasAIPatterns(validated.replyText);
    const grammarCheck = AntiAIDetector.hasPerfectGrammar(validated.replyText);
    const hasStructured = AntiAIDetector.hasStructuredPatterns(validated.replyText);
    const hasDisclaimers = AntiAIDetector.hasAIDisclaimers(validated.replyText);
    
    // Build detection issues array
    const detectionIssues: string[] = [];
    if (hasAIPatterns) detectionIssues.push('ai_patterns');
    if (grammarCheck.score > 2) detectionIssues.push(...grammarCheck.issues);
    if (hasStructured) detectionIssues.push('structured_patterns');
    if (hasDisclaimers) detectionIssues.push('ai_disclaimers');
    
    // Insert feedback
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: user?.id || null,
        reply_text: validated.replyText,
        original_tweet: validated.originalTweet,
        response_idea: validated.responseIdea,
        feedback_type: validated.feedbackType,
        feedback_details: validated.feedbackDetails,
        detected_as_ai: validated.feedbackType === 'sounds_ai' || detectionIssues.length > 0,
        ai_detection_score: grammarCheck.score,
        ai_detection_issues: detectionIssues
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to save feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }
    
    // Log for monitoring
    console.log('User feedback received:', {
      type: validated.feedbackType,
      detectionIssues,
      score: grammarCheck.score,
      userId: user?.id
    });
    
    return NextResponse.json({ 
      success: true,
      data,
      analysis: {
        detectionIssues,
        score: grammarCheck.score
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}