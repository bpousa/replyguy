import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';
import { z } from 'zod';

// Define example types for variety
const EXAMPLE_TYPES = [
  'reaction',
  'opinion', 
  'joke',
  'question',
  'story',
  'advice',
  'observation',
  'complaint',
  'excitement',
  'reflection'
];

// Validation schemas
const startRefinementSchema = z.object({
  styleId: z.string().uuid(),
});

const submitFeedbackSchema = z.object({
  sessionId: z.string().uuid(),
  exampleIndex: z.number().min(0).max(9),
  originalExample: z.string(),
  userRevision: z.string(),
  feedback: z.string().optional(),
});

// Generate a sample tweet based on the style analysis
async function generateStyleExample(
  styleAnalysis: any,
  exampleType: string,
  previousExamples: any[] = []
): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const previousExamplesText = previousExamples.length > 0
    ? `\n\nPrevious examples and user corrections:\n${previousExamples.map((ex, i) => 
        `${i + 1}. Generated: "${ex.original}"\n   User revised to: "${ex.revised}"\n   Feedback: ${ex.feedback || 'None'}`
      ).join('\n\n')}`
    : '';

  const content = `Based on this writing style analysis, generate a ${exampleType} tweet that perfectly matches this person's voice:

Style Analysis:
${JSON.stringify(styleAnalysis, null, 2)}
${previousExamplesText}

Generate a tweet that would be a ${exampleType}. Make it sound EXACTLY like this person would write it.
Use their specific patterns, vocabulary, punctuation, and quirks.
Tweet (just the text, no quotes):`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      temperature: 0.8,
      max_tokens: 280,
    });

    return response.choices[0].message.content?.trim() || '';
  } catch (error) {
    console.error('Error generating example:', error);
    throw new Error('Failed to generate example');
  }
}

// Start a new refinement session
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { styleId } = startRefinementSchema.parse(body);

    // Get the style and its analysis
    const { data: style, error: styleError } = await supabase
      .from('user_styles')
      .select('*')
      .eq('id', styleId)
      .eq('user_id', user.id)
      .single();

    if (styleError || !style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('style_refinement_sessions')
      .select('*')
      .eq('style_id', styleId)
      .eq('session_state', 'active')
      .single();

    if (existingSession) {
      // Resume existing session
      const nextExample = await generateStyleExample(
        style.style_analysis,
        EXAMPLE_TYPES[existingSession.current_example_index],
        existingSession.examples
      );

      return NextResponse.json({
        session: existingSession,
        currentExample: {
          index: existingSession.current_example_index,
          type: EXAMPLE_TYPES[existingSession.current_example_index],
          text: nextExample,
        }
      });
    }

    // Create new session
    const { data: session, error: sessionError } = await supabase
      .from('style_refinement_sessions')
      .insert({
        style_id: styleId,
        user_id: user.id,
        total_examples: 10,
      })
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    // Generate first example
    const firstExample = await generateStyleExample(
      style.style_analysis,
      EXAMPLE_TYPES[0]
    );

    return NextResponse.json({
      session,
      currentExample: {
        index: 0,
        type: EXAMPLE_TYPES[0],
        text: firstExample,
      }
    });
  } catch (error) {
    console.error('Error starting refinement:', error);
    return NextResponse.json({ error: 'Failed to start refinement' }, { status: 500 });
  }
}

// Submit feedback and get next example
export async function PUT(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId, exampleIndex, originalExample, userRevision, feedback } = 
      submitFeedbackSchema.parse(body);

    // Get session and validate ownership
    const { data: session, error: sessionError } = await supabase
      .from('style_refinement_sessions')
      .select('*, user_styles!inner(*)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update examples array
    const updatedExamples = [...(session.examples || [])];
    updatedExamples[exampleIndex] = {
      type: EXAMPLE_TYPES[exampleIndex],
      original: originalExample,
      revised: userRevision,
      feedback: feedback || null,
      timestamp: new Date().toISOString(),
    };

    const nextIndex = exampleIndex + 1;
    const isComplete = nextIndex >= session.total_examples;

    // Update session
    const { error: updateError } = await supabase
      .from('style_refinement_sessions')
      .update({
        examples: updatedExamples,
        current_example_index: nextIndex,
        session_state: isComplete ? 'completed' : 'active',
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    // If complete, update the style with refined data
    if (isComplete) {
      // Re-analyze with the refined examples
      const refinedAnalysis = await analyzeRefinedStyle(
        session.user_styles.style_analysis,
        updatedExamples
      );

      await supabase
        .from('user_styles')
        .update({
          style_analysis: refinedAnalysis,
          refinement_examples: updatedExamples,
          is_refined: true,
          refined_at: new Date().toISOString(),
        })
        .eq('id', session.style_id);

      return NextResponse.json({
        complete: true,
        message: 'Style refinement complete!',
        refinedAnalysis,
      });
    }

    // Generate next example
    const nextExample = await generateStyleExample(
      session.user_styles.style_analysis,
      EXAMPLE_TYPES[nextIndex],
      updatedExamples
    );

    return NextResponse.json({
      complete: false,
      currentExample: {
        index: nextIndex,
        type: EXAMPLE_TYPES[nextIndex],
        text: nextExample,
      },
      progress: {
        current: nextIndex + 1,
        total: session.total_examples,
      }
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// Analyze refined style with user corrections
async function analyzeRefinedStyle(
  originalAnalysis: any,
  refinementExamples: any[]
): Promise<any> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const content = `You have an initial style analysis and a series of refinement examples where the user corrected AI-generated tweets to match their actual voice.

Original Analysis:
${JSON.stringify(originalAnalysis, null, 2)}

Refinement Examples:
${refinementExamples.map((ex, i) => 
  `${i + 1}. Type: ${ex.type}
   AI Generated: "${ex.original}"
   User Corrected to: "${ex.revised}"
   Feedback: ${ex.feedback || 'None'}`
).join('\n\n')}

Based on these corrections, create an updated and more accurate style analysis. Pay special attention to:
1. Patterns in how the user changed the AI's attempts
2. Specific words/phrases the user prefers
3. Subtle style elements the AI initially missed
4. Any consistent corrections across multiple examples

Return the same JSON format as the original analysis but with refined, more accurate details.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
    });

    if (response.choices[0].message.content) {
      return JSON.parse(response.choices[0].message.content);
    }
    throw new Error('Failed to get valid JSON response');
  } catch (error) {
    console.error('Error analyzing refined style:', error);
    throw new Error('Failed to analyze refined style');
  }
}