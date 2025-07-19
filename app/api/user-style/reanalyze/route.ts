import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';

// This endpoint reanalyzes a style based on accumulated corrections
// In production, this would be triggered by a background job/cron
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    const { styleId } = await req.json();
    
    if (!styleId) {
      return NextResponse.json({ error: 'Style ID required' }, { status: 400 });
    }
    
    // Get the style with its current analysis
    const { data: style, error: styleError } = await supabase
      .from('user_styles')
      .select('*')
      .eq('id', styleId)
      .single();
      
    if (styleError || !style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }
    
    // Check if we should reanalyze
    const { data: analysisCheck } = await supabase
      .rpc('analyze_style_corrections', { p_style_id: styleId });
      
    if (!analysisCheck?.needs_reanalysis) {
      return NextResponse.json({ 
        message: 'Not enough corrections yet for reanalysis',
        correctionCount: analysisCheck?.correction_count || 0
      });
    }
    
    // Get recent corrections
    const { data: corrections, error: correctionsError } = await supabase
      .from('reply_corrections')
      .select('*')
      .eq('style_id', styleId)
      .eq('analysis_completed', false)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (correctionsError || !corrections?.length) {
      return NextResponse.json({ error: 'No corrections found' }, { status: 404 });
    }
    
    // Reanalyze with corrections
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const content = `You have a user's writing style analysis and recent corrections they made to AI-generated replies.
    
Original Style Analysis:
${JSON.stringify(style.style_analysis, null, 2)}

Original Sample Tweets:
${style.sample_tweets.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

Recent Corrections (what the AI generated vs what the user actually wanted):
${corrections.map((c, i) => `
${i + 1}. Context: Replying to "${c.original_tweet}" with idea "${c.response_idea}"
   AI Generated: "${c.generated_reply}"
   User Corrected to: "${c.corrected_reply}"
   Notes: ${c.correction_notes || 'None'}
`).join('\n')}

Based on these corrections, create an UPDATED and MORE ACCURATE style analysis. 
Pay special attention to:
1. Patterns in how the user consistently changed the AI's attempts
2. Specific words/phrases the user prefers or avoids
3. Subtle style elements the AI initially missed
4. Any consistent corrections that reveal deeper patterns

Return the updated analysis in the same JSON format, but with more accurate and specific details based on what you've learned from the corrections.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
    });

    if (!response.choices[0].message.content) {
      throw new Error('Failed to get analysis from GPT-4o');
    }

    const updatedAnalysis = JSON.parse(response.choices[0].message.content);
    
    // Update the style with new analysis
    const { error: updateError } = await supabase
      .from('user_styles')
      .update({
        style_analysis: updatedAnalysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', styleId);
      
    if (updateError) {
      throw updateError;
    }
    
    // Mark corrections as analyzed
    const { error: markError } = await supabase
      .from('reply_corrections')
      .update({
        analysis_completed: true,
        analyzed_at: new Date().toISOString(),
        analysis_results: { included_in_reanalysis: true }
      })
      .eq('style_id', styleId)
      .eq('analysis_completed', false);
      
    if (markError) {
      console.error('Error marking corrections as analyzed:', markError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Style reanalyzed successfully',
      correctionCount: corrections.length,
      updatedAnalysis
    });
    
  } catch (error) {
    console.error('Error reanalyzing style:', error);
    return NextResponse.json(
      { error: 'Failed to reanalyze style' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if any styles need reanalysis
export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get user's styles
    const { data: styles, error: stylesError } = await supabase
      .from('user_styles')
      .select('id, name')
      .eq('user_id', user.id);
      
    if (stylesError || !styles?.length) {
      return NextResponse.json({ styles: [] });
    }
    
    // Check each style for pending corrections
    const styleStatuses = await Promise.all(
      styles.map(async (style) => {
        const { count } = await supabase
          .from('reply_corrections')
          .select('id', { count: 'exact', head: true })
          .eq('style_id', style.id)
          .eq('analysis_completed', false);
          
        return {
          ...style,
          pendingCorrections: count || 0,
          needsReanalysis: (count || 0) >= 5
        };
      })
    );
    
    return NextResponse.json({ 
      styles: styleStatuses.filter(s => s.pendingCorrections > 0) 
    });
    
  } catch (error) {
    console.error('Error checking styles:', error);
    return NextResponse.json(
      { error: 'Failed to check styles' },
      { status: 500 }
    );
  }
}