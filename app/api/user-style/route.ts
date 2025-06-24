import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { StyleAnalyzer } from '@/app/lib/services/style-analyzer.service';

// Request validation schemas
const createStyleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  sampleTweets: z.array(z.string().min(1).max(500)).min(3).max(20),
});

const updateStyleSchema = z.object({
  styleId: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  sampleTweets: z.array(z.string().min(1).max(500)).min(3).max(20).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's styles
    const { data: styles, error } = await supabase
      .from('user_styles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ styles });
  } catch (error) {
    console.error('Get styles error:', error);
    return NextResponse.json(
      { error: 'Failed to get styles' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user's subscription for Write Like Me feature
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        subscription_plans (
          enable_write_like_me
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single() as { data: { subscription_plans: { enable_write_like_me: boolean } | null } | null };

    if (!subscription?.subscription_plans?.enable_write_like_me) {
      return NextResponse.json(
        { error: 'Write Like Me feature requires Pro or Business plan' },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validated = createStyleSchema.parse(body);

    // Analyze the style using AI
    let styleAnalysis = null;
    let styleInstructions = '';

    if (process.env.OPENAI_API_KEY) {
      try {
        const analyzer = new StyleAnalyzer(process.env.OPENAI_API_KEY);
        
        // Analyze each sample tweet
        const analyses = await Promise.all(
          validated.sampleTweets.map(tweet => analyzer.analyzeTweetStyle(tweet))
        );

        // Aggregate the analyses
        const aggregated = {
          tone: mostCommon(analyses.map(a => a.tone)),
          formality: mostCommon(analyses.map(a => a.formality)),
          vocabulary: mostCommon(analyses.map(a => a.vocabulary)),
          sentenceLength: mostCommon(analyses.map(a => a.sentenceLength)),
          hasEmojis: analyses.some(a => a.hasEmojis),
          hasHashtags: analyses.some(a => a.hasHashtags),
          punctuation: {
            exclamations: analyses.some(a => a.punctuation.exclamations),
            questions: analyses.some(a => a.punctuation.questions),
            ellipsis: analyses.some(a => a.punctuation.ellipsis),
            allCaps: analyses.some(a => a.punctuation.allCaps),
          },
          characteristics: [...new Set(analyses.flatMap(a => a.characteristics))].slice(0, 5),
        };

        styleAnalysis = aggregated;

        // Generate style instructions
        styleInstructions = generateStyleInstructions(aggregated, validated.sampleTweets);
      } catch (error) {
        console.error('Style analysis failed:', error);
      }
    }

    // Create the style in database
    const { data: style, error: createError } = await supabase
      .from('user_styles')
      .insert({
        user_id: user.id,
        name: validated.name || 'My Style',
        sample_tweets: validated.sampleTweets,
        tone: styleAnalysis?.tone,
        formality: styleAnalysis?.formality,
        vocabulary: styleAnalysis?.vocabulary,
        sentence_length: styleAnalysis?.sentenceLength,
        has_emojis: styleAnalysis?.hasEmojis,
        has_hashtags: styleAnalysis?.hasHashtags,
        uses_punctuation: styleAnalysis?.punctuation || {},
        characteristics: styleAnalysis?.characteristics || [],
        style_instructions: styleInstructions,
        analyzed_at: styleAnalysis ? new Date().toISOString() : null,
        is_active: true, // Make new style active by default
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({ style });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create style error:', error);
    return NextResponse.json(
      { error: 'Failed to create style' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validated = updateStyleSchema.parse(body);

    // Update the style
    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive;

    if (validated.sampleTweets) {
      updateData.sample_tweets = validated.sampleTweets;
      
      // Re-analyze if samples changed
      if (process.env.OPENAI_API_KEY) {
        try {
          const analyzer = new StyleAnalyzer(process.env.OPENAI_API_KEY);
          const analyses = await Promise.all(
            validated.sampleTweets.map(tweet => analyzer.analyzeTweetStyle(tweet))
          );

          const aggregated = {
            tone: mostCommon(analyses.map(a => a.tone)),
            formality: mostCommon(analyses.map(a => a.formality)),
            vocabulary: mostCommon(analyses.map(a => a.vocabulary)),
            sentenceLength: mostCommon(analyses.map(a => a.sentenceLength)),
            hasEmojis: analyses.some(a => a.hasEmojis),
            hasHashtags: analyses.some(a => a.hasHashtags),
            punctuation: {
              exclamations: analyses.some(a => a.punctuation.exclamations),
              questions: analyses.some(a => a.punctuation.questions),
              ellipsis: analyses.some(a => a.punctuation.ellipsis),
              allCaps: analyses.some(a => a.punctuation.allCaps),
            },
            characteristics: [...new Set(analyses.flatMap(a => a.characteristics))].slice(0, 5),
          };

          updateData.tone = aggregated.tone;
          updateData.formality = aggregated.formality;
          updateData.vocabulary = aggregated.vocabulary;
          updateData.sentence_length = aggregated.sentenceLength;
          updateData.has_emojis = aggregated.hasEmojis;
          updateData.has_hashtags = aggregated.hasHashtags;
          updateData.uses_punctuation = aggregated.punctuation;
          updateData.characteristics = aggregated.characteristics;
          updateData.style_instructions = generateStyleInstructions(aggregated, validated.sampleTweets);
          updateData.analyzed_at = new Date().toISOString();
        } catch (error) {
          console.error('Style re-analysis failed:', error);
        }
      }
    }

    const { data: style, error: updateError } = await supabase
      .from('user_styles')
      .update(updateData)
      .eq('id', validated.styleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ style });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update style error:', error);
    return NextResponse.json(
      { error: 'Failed to update style' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const styleId = searchParams.get('styleId');

    if (!styleId) {
      return NextResponse.json(
        { error: 'Style ID required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('user_styles')
      .delete()
      .eq('id', styleId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete style error:', error);
    return NextResponse.json(
      { error: 'Failed to delete style' },
      { status: 500 }
    );
  }
}

// Helper function to find most common value
function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  
  let maxCount = 0;
  let mostCommonItem = arr[0];
  
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonItem = item;
    }
  }
  
  return mostCommonItem;
}

// Generate style instructions for AI
function generateStyleInstructions(analysis: any, samples: string[]): string {
  const instructions = [`
CRITICAL: Write in the exact style of these sample tweets:

${samples.slice(0, 5).map((s, i) => `Example ${i + 1}: "${s}"`).join('\n')}

Style characteristics:
- Tone: ${analysis.tone}
- Formality: ${analysis.formality}
- Vocabulary: ${analysis.vocabulary}
- Sentence length: ${analysis.sentenceLength}
${analysis.hasEmojis ? '- Uses emojis naturally' : '- Rarely/never uses emojis'}
${analysis.hasHashtags ? '- Includes hashtags' : '- No hashtags'}
${analysis.characteristics.length > 0 ? `- Key patterns: ${analysis.characteristics.join(', ')}` : ''}

Punctuation style:
${analysis.punctuation.exclamations ? '- Uses exclamation points for emphasis' : '- Minimal exclamation points'}
${analysis.punctuation.questions ? '- Asks questions' : '- Makes statements rather than asking'}
${analysis.punctuation.ellipsis ? '- Uses ellipsis (...) for effect' : '- Complete sentences without ellipsis'}
${analysis.punctuation.allCaps ? '- Sometimes uses ALL CAPS for emphasis' : '- No ALL CAPS'}

Match this EXACT voice and style. Don't just follow the rules - actually write like these examples.
`];

  return instructions.join('\n').trim();
}