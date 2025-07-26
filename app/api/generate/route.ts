import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { StyleAnalyzer, TweetStyle } from '@/app/lib/services/style-analyzer.service';
import { AntiAIDetector } from '@/app/lib/services/anti-ai-detector.service';
import { REPLY_LENGTHS } from '@/app/lib/constants';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 20000, // 20 second timeout for API calls
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string(),
  responseIdea: z.string(),
  tone: z.string(),
  selectedType: z.object({
    id: z.string(),
    name: z.string(),
    pattern: z.string(),
    styleRules: z.string(),
    examples: z.array(z.string()),
  }),
  perplexityData: z.string().optional(),
  replyLength: z.enum(['short', 'medium', 'long', 'extra-long']).optional(),
  enableStyleMatching: z.boolean().optional(),
  useCustomStyle: z.boolean().optional(),
  customStyle: z.any().optional(),
  customStyleExamples: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  
  try {
    // Validate request body
    const body = await req.json();
    console.log('🎯 Generation endpoint received:', {
      hasPerplexityData: !!body.perplexityData,
      perplexityDataType: typeof body.perplexityData,
      perplexityDataLength: body.perplexityData?.length || 0,
      perplexityDataPreview: body.perplexityData?.substring(0, 100)
    });
    const validated = requestSchema.parse(body);
    timings.validation = Date.now() - startTime;
    
    // Get character limit based on reply length
    const replyLength = validated.replyLength || 'short';
    const charLimit = REPLY_LENGTHS.find(l => l.value === replyLength)?.maxChars || 280;
    
    // Concurrently fetch style analysis and custom style
    let styleInstructions = '';
    let customStyleInstructions = '';

    const promises = [];

    // Style analysis promise
    if (validated.enableStyleMatching && process.env.OPENAI_API_KEY) {
      promises.push(
        (async () => {
          try {
            const styleAnalyzer = new StyleAnalyzer(process.env.OPENAI_API_KEY!);
            const tweetStyle = await styleAnalyzer.analyzeTweetStyle(validated.originalTweet);
            styleInstructions = StyleAnalyzer.generateStyleInstructions(tweetStyle, 0.5);
          } catch (error) {
            console.error('Style analysis failed:', error);
          }
        })()
      );
    }

    // Custom style promise with corrections
    let recentCorrections: any[] = [];
    let forbiddenPatterns: string[] = [];
    
    if (validated.useCustomStyle && validated.userId) {
      promises.push(
        (async () => {
          try {
            const { createServerClient } = await import('@/app/lib/auth');
            const { cookies } = await import('next/headers');
            const cookieStore = cookies();
            const supabase = createServerClient(cookieStore);
            
            const { data: activeStyle, error } = await supabase
              .rpc('get_user_active_style', { p_user_id: validated.userId })
              .single();
              
            if (error) {
              console.error('Error calling get_user_active_style:', error);
              // Fallback to getting style directly if function doesn't exist yet
              const { data: style } = await supabase
                .from('user_styles')
                .select('style_analysis')
                .eq('user_id', validated.userId)
                .eq('is_active', true)
                .single();
                
              if (style?.style_analysis) {
                customStyleInstructions = JSON.stringify(style.style_analysis);
              }
            } else if (activeStyle) {
              customStyleInstructions = activeStyle.style_instructions;
              recentCorrections = activeStyle.recent_corrections || [];
              forbiddenPatterns = activeStyle.forbidden_patterns || [];
              
              console.log('📝 Loaded corrections:', recentCorrections.length);
              console.log('🚫 Forbidden patterns:', forbiddenPatterns);
            }
          } catch (error) {
            console.error('Failed to get custom style:', error);
          }
        })()
      );
    }

    await Promise.all(promises);
    timings.dataFetching = Date.now() - startTime - timings.validation;

    // Build generation prompt
    const shouldUseWriteLikeMe = validated.useCustomStyle && validated.customStyle;
    
    console.log('\n🔍 === PROMPT SELECTION DEBUG ===');
    console.log('useCustomStyle flag:', validated.useCustomStyle);
    console.log('customStyle exists:', !!validated.customStyle);
    console.log('customStyle type:', typeof validated.customStyle);
    if (validated.customStyle) {
      console.log('customStyle keys:', Object.keys(validated.customStyle));
    }
    console.log('Will use Write Like Me:', shouldUseWriteLikeMe);
    
    const prompt = buildPrompt(validated, charLimit, replyLength, styleInstructions, recentCorrections, forbiddenPatterns);
    
    console.log('\n📋 === GENERATION PROMPT ===');
    console.log('Using Write Like Me:', validated.useCustomStyle && validated.customStyle);
    console.log('Has perplexity data in validated:', !!validated.perplexityData);
    console.log('Perplexity data preview:', validated.perplexityData?.substring(0, 200));
    console.log('Prompt length (chars):', prompt.length);
    console.log('Estimated tokens:', Math.ceil(prompt.length / 4));
    if (prompt.length > 4000) {
      console.warn('⚠️ LARGE PROMPT DETECTED:', prompt.length, 'chars');
    }
    console.log(prompt);
    
    console.log('\n📊 === GENERATION INPUT ANALYSIS ===');
    console.log('Has Perplexity data:', !!validated.perplexityData);
    console.log('Perplexity data length:', validated.perplexityData?.length || 0);
    console.log('Response idea:', validated.responseIdea);
    console.log('Selected type:', validated.selectedType.name);
    console.log('Prompt includes research section:', prompt.includes('CRITICAL RESEARCH DATA'));
    
    // SENTINEL TOKEN VALIDATION - Guard against prompt-builder edits losing research
    if (validated.perplexityData) {
      const hasResearchBlocks = prompt.includes('<<RESEARCH_BLOCK>>');
      const blockCount = (prompt.match(/<<RESEARCH_BLOCK>>/g) || []).length;
      console.log('🛡️ Sentinel token check:', hasResearchBlocks ? '✅ PRESENT' : '❌ MISSING');
      console.log('🛡️ Research block count:', blockCount, '(should be 2)');
      
      if (!hasResearchBlocks || blockCount !== 2) {
        console.error('❌ CRITICAL: Research data sentinel tokens missing or malformed!');
        console.error('This indicates prompt-builder lost research data');
        throw new Error('Internal error: Research data protection failed');
      }
    }

    // Call Claude 3.5 Sonnet for final generation
    // Calculate appropriate max_tokens based on character limit
    // Token allocation based on typical Twitter writing patterns:
    // - Short tweets are more compressed (~2.8 chars/token)
    // - Longer content allows more natural language (~3.6 chars/token)
    let maxTokens;
    const hasResearch = !!validated.perplexityData;
    const hasCustomStyle = validated.useCustomStyle && validated.customStyle;
    // Increase buffer when both research and custom style are used
    const researchBuffer = hasResearch && hasCustomStyle ? 1.5 : hasResearch ? 1.3 : 1.0;
    
    if (charLimit >= 2000) {
      // Extra-long: 2000 chars / ~3.6 chars per token = 550 tokens
      maxTokens = Math.ceil(550 * researchBuffer);
    } else if (charLimit >= 1000) {
      // Long: 1000 chars / ~3.3 chars per token = 300 tokens  
      maxTokens = Math.ceil(300 * researchBuffer);
    } else if (charLimit >= 560) {
      // Medium: 560 chars / ~3.1 chars per token = 180 tokens
      maxTokens = Math.ceil(180 * researchBuffer);
    } else {
      // Short: 280 chars / ~2.8 chars per token = 100 tokens
      maxTokens = Math.ceil(100 * researchBuffer);
    }
    
    console.log(`\n🔢 Token calculation: charLimit=${charLimit}, maxTokens=${maxTokens}, hasResearch=${hasResearch}, hasCustomStyle=${hasCustomStyle}`);
    
    // Use different system prompt for Write Like Me
    // Extract complex expressions to avoid template literal parsing issues
    let replyTypeDesc = '';
    let replyLengthInstr = '';
    
    if (!validated.useCustomStyle || !validated.customStyle) {
      // Determine reply type description
      if (replyLength === 'extra-long') {
        replyTypeDesc = 'detailed thread-style';
      } else if (replyLength === 'long') {
        replyTypeDesc = 'comprehensive';
      } else if (replyLength === 'medium') {
        replyTypeDesc = 'thoughtful';
      } else {
        replyTypeDesc = 'quick';
      }
      
      // Determine reply length instruction
      if (replyLength === 'short') {
        replyLengthInstr = 'Keep it punchy - one main point.';
      } else if (replyLength === 'medium') {
        replyLengthInstr = 'You have room for 2-3 sentences to develop your thought.';
      } else {
        replyLengthInstr = 'Take the space to fully develop your thoughts while keeping it conversational.';
      }
    }
    
    const systemPrompt = validated.useCustomStyle && validated.customStyle
      ? `You are helping someone express THEIR SPECIFIC MESSAGE in their unique writing style on Twitter/X. IMPORTANT: This person is actively teaching you their preferences through corrections. Your job is to:
1) Deliver their exact message (not a similar theme)
2) Use their general voice/tone BUT be adaptive to their feedback
3) AVOID patterns they've corrected away from (especially technical/coding language if that keeps appearing in corrections)
4) Create fresh, original phrasing - never copy examples verbatim
5) Respect that styles evolve - honor their current preferences over historical patterns`
      : `You are typing a ${replyTypeDesc} reply on Twitter/X. Write exactly like a real person would - casual, direct, sometimes imperfect. The user told you what they want to say, so say it naturally. ${replyLengthInstr} When stats/research are included, drop them in naturally like you're sharing something you just learned.`;

    console.log('\n🚀 === CALLING ANTHROPIC API ===');
    console.log('Model:', 'claude-3-5-sonnet-20241022');
    console.log('Max tokens:', maxTokens);
    console.log('System prompt length:', systemPrompt.length);
    console.log('User prompt length:', prompt.length);
    console.log('Total prompt tokens (estimate):', Math.ceil((systemPrompt.length + prompt.length) / 4));
    
    const anthropicStartTime = Date.now();
    let message;
    try {
      message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature: validated.useCustomStyle && validated.customStyle ? 0.85 : 0.8,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      timings.anthropicCall = Date.now() - anthropicStartTime;
    } catch (anthropicError: any) {
      console.error('❌ ANTHROPIC API ERROR:', anthropicError);
      console.error('Error type:', anthropicError.constructor.name);
      console.error('Error message:', anthropicError.message);
      if (anthropicError.response) {
        console.error('Response status:', anthropicError.response.status);
        console.error('Response data:', anthropicError.response.data);
      }
      throw anthropicError;
    }

    let reply = message.content[0].type === 'text' ? message.content[0].text : '';
    
    console.log('\n🤖 === CLAUDE GENERATION RESPONSE ===');
    console.log('Raw reply:', reply);
    
    // Check for verbatim copying in Write Like Me mode
    if (validated.useCustomStyle && validated.customStyle && validated.customStyleExamples) {
      const replyLower = reply.toLowerCase();
      const commonPatterns = [
        'what i ended up doing was',
        'i tell people that',
        'life is like',
        'ever think about how',
        'ever feel like'
      ];
      
      for (const pattern of commonPatterns) {
        if (replyLower.startsWith(pattern)) {
          console.warn('⚠️ WARNING: Reply starts with common pattern from examples:', pattern);
          console.warn('This suggests verbatim copying is occurring despite instructions');
        }
      }
    }
    
    // Skip anti-AI processing for Write Like Me to preserve user's style
    if (!validated.useCustomStyle || !validated.customStyle) {
      // Apply anti-AI processing (now async to support dynamic patterns)
      reply = await AntiAIDetector.process(reply);
      
      console.log('\n🔧 === AFTER ANTI-AI PROCESSING ===');
      console.log('Processed reply:', reply);
    } else {
      console.log('\n🔧 === ANTI-AI PROCESSING SKIPPED (Write Like Me) ===');
    }
    
    // Clean and validate the reply
    reply = cleanReply(reply, charLimit, validated.useCustomStyle && validated.customStyle);
    
    console.log('\n✨ === FINAL CLEANED REPLY ===');
    console.log('Final reply:', reply);
    console.log('Character count:', reply.length);
    console.log('Contains numbers/stats:', /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(reply));

    // Calculate cost
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
    const inputCost = message.usage.input_tokens * 0.000003; // $3 per 1M input tokens
    const outputCost = message.usage.output_tokens * 0.000015; // $15 per 1M output tokens
    const cost = inputCost + outputCost;
    
    // Debug token vs character ratio
    console.log('\n📊 === TOKEN VS CHARACTER ANALYSIS ===');
    console.log('Output tokens used:', message.usage.output_tokens);
    console.log('Max tokens allowed:', maxTokens);
    console.log('Characters generated:', reply.length);
    console.log('Character limit:', charLimit);
    console.log('Chars per token ratio:', reply.length / message.usage.output_tokens);
    
    if (reply.length < charLimit * 0.8 && message.usage.output_tokens >= maxTokens * 0.95) {
      console.warn('⚠️ Reply may have been truncated by token limit');
      console.warn(`Generated only ${reply.length}/${charLimit} chars but used ${message.usage.output_tokens}/${maxTokens} tokens`);
    }

    timings.totalTime = Date.now() - startTime;
    console.log('\n⏱️ === PERFORMANCE TIMINGS ===');
    console.log('Validation:', timings.validation, 'ms');
    console.log('Data fetching (DB/style):', timings.dataFetching || 0, 'ms');
    console.log('Anthropic API call:', timings.anthropicCall, 'ms');
    console.log('Total time:', timings.totalTime, 'ms');
    
    return NextResponse.json({
      data: {
        reply,
        tokensUsed,
        cost,
        timings, // Include timing info for debugging
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Generation error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to generate reply';
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for Anthropic-specific errors
      if (error.message.includes('context length') || error.message.includes('token')) {
        errorMessage = 'Request too large - try disabling some features or using shorter inputs';
        errorDetails.hint = 'The combination of research data, custom style, and examples exceeded limits';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limited - please try again in a moment';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out - the response was taking too long';
      }
      
      errorDetails.originalError = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails 
      },
      { status: 500 }
    );
  }
}


// Helper function to ensure diversity in examples
function diversifyExamples(examples: string[], maxExamples: number): string[] {
  if (!examples || examples.length === 0) return [];
  
  // Group examples by their opening pattern (first 5-10 words)
  const patternGroups = new Map<string, string[]>();
  
  examples.forEach(example => {
    const words = example.toLowerCase().split(' ');
    const opening = words.slice(0, Math.min(5, words.length)).join(' ');
    if (!patternGroups.has(opening)) {
      patternGroups.set(opening, []);
    }
    patternGroups.get(opening)!.push(example);
  });
  
  // Select diverse examples, avoiding repetitive openings
  const diverse: string[] = [];
  const usedPatterns = new Set<string>();
  
  // First pass: get one example from each unique pattern
  for (const [pattern, examplesInGroup] of patternGroups) {
    if (diverse.length >= maxExamples) break;
    diverse.push(examplesInGroup[0]);
    usedPatterns.add(pattern);
  }
  
  // Second pass: if we need more examples, add from groups with different patterns
  if (diverse.length < maxExamples) {
    for (const example of examples) {
      if (diverse.length >= maxExamples) break;
      if (!diverse.includes(example)) {
        diverse.push(example);
      }
    }
  }
  
  return diverse.slice(0, maxExamples);
}

function buildPrompt(input: any, charLimit: number, replyLength: string, styleInstructions: string, recentCorrections: any[] = [], forbiddenPatterns: string[] = []): string {
  const isWriteLikeMe = input.useCustomStyle && input.customStyle;

  const lengthGuide = replyLength === 'short' ? '1-2 sentences max' : 
                      replyLength === 'medium' ? '2-4 sentences' : 
                      replyLength === 'long' ? 'a detailed paragraph' : 
                      'multiple paragraphs';
                      
  // Extract target length range to avoid complex ternary in template literal
  let targetLengthRange = '';
  if (replyLength === 'short') {
    targetLengthRange = '140-280';
  } else if (replyLength === 'medium') {
    targetLengthRange = '400-560';
  } else if (replyLength === 'long') {
    targetLengthRange = '700-1000';
  } else {
    targetLengthRange = '1500-2000';
  }

  const researchBlock = input.perplexityData ? `
📊 RESEARCH DATA TO INCLUDE IN YOUR REPLY:
<<RESEARCH_BLOCK>>
${input.perplexityData}
<<RESEARCH_BLOCK>>
` : ''

  if (isWriteLikeMe) {
    // Use fewer examples when multiple features are enabled to reduce cognitive load
    const maxExamples = input.perplexityData ? 3 : 5;
    let diverseExamples = input.customStyleExamples ? diversifyExamples(input.customStyleExamples, maxExamples) : [];
    
    // Filter out examples that contain forbidden patterns
    if (forbiddenPatterns.length > 0 && diverseExamples.length > 0) {
      const originalCount = diverseExamples.length;
      diverseExamples = diverseExamples.filter((example: string) => {
        const lowerExample = example.toLowerCase();
        // Check for coding language patterns
        if (forbiddenPatterns.includes('coding_language') && 
            (lowerExample.includes('function') || lowerExample.includes('code') || 
             lowerExample.includes('implementation') || lowerExample.includes('algorithm'))) {
          return false;
        }
        // Check for verbatim openings
        if (forbiddenPatterns.includes('what_i_ended_up_doing') && lowerExample.startsWith('what i ended up doing')) {
          return false;
        }
        if (forbiddenPatterns.includes('i_tell_people') && lowerExample.startsWith('i tell people')) {
          return false;
        }
        return true;
      });
      
      console.log(`Filtered examples from ${originalCount} to ${diverseExamples.length} based on forbidden patterns`);
    }
    
    // When research is enabled, use a more compact style representation
    const styleToShow = input.perplexityData ? {
      tone: input.customStyle.tone,
      formality: input.customStyle.formality,
      vocabulary: { level: input.customStyle.vocabulary?.level, uniqueWords: input.customStyle.vocabulary?.uniqueWords?.slice(0, 5) },
      uniqueQuirks: input.customStyle.uniqueQuirks?.slice(0, 3),
      doNotUse: input.customStyle.doNotUse
    } : input.customStyle;
    
    // Build correction guidance
    let correctionGuidance = '';
    if (recentCorrections.length > 0) {
      const correctionExamples = recentCorrections.slice(0, 3).map((c: any) => 
        `   ❌ NOT: "${c.original.substring(0, 60)}..."\n   ✅ BUT: "${c.corrected.substring(0, 60)}..."`
      ).join('\n\n');
      
      correctionGuidance = `\n\n⚠️ IMPORTANT - Learn from these recent corrections:
${correctionExamples}

The user keeps correcting these patterns, so AVOID them completely!`;
    }
    
    return `Based on this writing style analysis, write a reply that captures the SPIRIT of this person while being ADAPTABLE to their feedback:

Style Analysis:
${JSON.stringify(styleToShow, null, 2)}

${diverseExamples.length > 0 ? `\nExample tweets in this style (showing variety):\n${diverseExamples.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}\n` : ''}
${correctionGuidance}

Context:
- You're replying to: "${input.originalTweet}"
- 🎯 REQUIRED MESSAGE TO EXPRESS: "${input.responseIdea}"
- ⚠️ This is what the user wants to say - express THIS message in their style
- Tone: ${input.tone}
- Length: ${lengthGuide} (max ${charLimit} characters)
${researchBlock}

${(input.perplexityData || input.includeMeme) ? `SIMPLIFIED INSTRUCTIONS (Multi-feature mode):
1. PRIORITY: Express "${input.responseIdea}" in their style
2. NO COPYING: Create fresh phrasing - don't copy from examples
${input.perplexityData ? '3. INCLUDE: Weave in the research data naturally\n' : ''}4. STYLE: Match their energy/tone but with original words
5. LENGTH: Keep it concise - ${lengthGuide}

Reply (just the text, no quotes):` : `ADAPTIVE INSTRUCTIONS:
1. EXPRESS THE EXACT MESSAGE: The "REQUIRED MESSAGE TO EXPRESS" is what the user wants to say - deliver THIS specific message, not something thematically similar
2. LEARN FROM CORRECTIONS: Pay special attention to the correction examples above. The user is teaching you what they DON'T want
3. FORBIDDEN PATTERNS: ${forbiddenPatterns.length > 0 ? forbiddenPatterns.map(p => {
   if (p === 'coding_language') return 'NO programming/technical language';
   if (p === 'what_i_ended_up_doing') return 'NEVER start with "what I ended up doing"';
   if (p === 'i_tell_people') return 'NEVER start with "I tell people"';
   return `Avoid: ${p.replace(/_/g, ' ')}`;
}).join('; ') : 'Watch for patterns the user corrects'}
4. STYLE FLEXIBILITY: Capture their voice's SPIRIT but be open to evolution. They may be trying to move away from certain patterns
5. FRESH PHRASING: Create original expressions that feel authentic to them WITHOUT copying examples verbatim
6. AVOID LOCKED-IN PATTERNS: If the style analysis suggests certain themes (like coding) but corrections show they don't want that, IGNORE those themes
7. NATURAL VARIETY: Draw from their full range of expression, not just dominant patterns
8. EMOJI RULE: Use emojis VERY SPARINGLY - only about 1 in 10 replies should have an emoji
9. RESPECT USER INTENT: The user's message and corrections are more important than rigid style matching
10. BE ADAPTIVE: Writing styles evolve. Honor their current preferences over past patterns

Reply (just the text, no quotes):`}`;
  } else {
    // Extract length guidance to avoid complex expressions in template literal
    let lengthGuidance = '';
    if (replyLength === 'short') {
      lengthGuidance = 'BE BRIEF. Keep it to 1-2 sentences max. Make your point quickly.';
    } else if (replyLength === 'medium') {
      lengthGuidance = 'You have space for a thoughtful response. Use 2-4 sentences to properly develop your idea. Don\'t rush - you have 560 characters to work with.';
    } else if (replyLength === 'long') {
      lengthGuidance = 'Take your time to fully express the idea. Use multiple sentences to make your point clear. You have 1000 characters - enough for a detailed paragraph.';
    } else {
      lengthGuidance = 'This is an extra-long reply. Fully develop your thoughts with detailed explanations, multiple points, and comprehensive coverage of the topic. Use the full 2000 character limit available.';
    }

    const antiAIPrompt = `
Write like real people actually write on Twitter:
- Start mid-thought sometimes: "honestly the worst part is..." or "nah that\'s not even..."
- Use casual language: "tbh", "ngl", "idk", "lol" (but sparingly)
- Drop subjects sometimes: "can\'t believe this" instead of "I can\'t believe this"
- Natural reactions: "wait what", "oh damn", "yikes", "lmao okay"
- Imperfect punctuation: occasional missing periods, lowercase starts
- Real disagreement: "nah", "eh", "not really", "hard disagree"
- Natural enthusiasm: "this is sick", "love this", "so good"
- Skip perfect transitions - just jump to your point
- EMOJI RULE: Use emojis VERY RARELY - only about 1 in 10 replies should have an emoji. When you do use one, it should feel absolutely necessary for the context. Most replies should have ZERO emojis. Professional and informative tones should NEVER have emojis.

When sharing facts/stats:
- Lead with reaction: "wait this is wild - [stat]"
- Or casual discovery: "just found out [fact] and now i can\'t stop thinking about it"
- Or simple share: "fun fact: [stat]"

${lengthGuidance}

Even if the user\'s suggestion sounds good, always put it in your own words. Never copy their phrasing exactly.`;

    const currentYear = new Date().getFullYear();
    
    let customStylePrompt = '';
    if (input.useCustomStyle && input.customStyle) {
      const style = input.customStyle;
      customStylePrompt = `

--- YOUR CUSTOM STYLE ---
Your writing style has been analyzed in detail:

Tone & Voice: ${style.tone}
Formality: ${style.formality}
${style.vocabulary?.level ? `Vocabulary Level: ${style.vocabulary.level}` : ''}
${style.vocabulary?.uniqueWords?.length > 0 ? `Unique words you use: ${style.vocabulary.uniqueWords.join(', ')}` : ''}
${style.vocabulary?.slang?.length > 0 ? `Your slang: ${style.vocabulary.slang.join(', ')}` : ''}

Sentence Patterns:
${style.sentencePatterns?.structure ? `- Structure: ${style.sentencePatterns.structure}` : ''}
${style.sentencePatterns?.openings?.length > 0 ? `- Common openings: ${style.sentencePatterns.openings.join(', ')}` : ''}
${style.sentencePatterns?.closings?.length > 0 ? `- Common closings: ${style.sentencePatterns.closings.join(', ')}` : ''}

Punctuation Style:
${style.punctuation?.style ? `- General style: ${style.punctuation.style}` : ''}
${style.punctuation?.specificPatterns?.length > 0 ? `- Specific patterns: ${style.punctuation.specificPatterns.join(', ')}` : ''}

${style.emojiPatterns?.frequency !== 'none' ? `Emoji usage: ${style.emojiPatterns.frequency} (but use even less frequently - only when absolutely necessary)` : 'NO EMOJIS'}
${style.emojiPatterns?.specific?.length > 0 ? `If you must use an emoji (rarely): ${style.emojiPatterns.specific.join(' ')}` : ''}

${style.capitalization?.style ? `Capitalization: ${style.capitalization.style}` : ''}

${style.linguisticFeatures?.contractions ? `Contractions: ${style.linguisticFeatures.contractions}` : ''}

${style.contentPatterns?.humor ? `Humor style: ${style.contentPatterns.humor}` : ''}

${style.uniqueQuirks?.length > 0 ? `\nUnique quirks:\n${style.uniqueQuirks.map((q: string) => `- ${q}`).join('\n')}` : ''}

${style.examplePhrases?.length > 0 ? `\nExample phrases that capture your voice:\n${style.examplePhrases.map((p: string) => `"${p}"`).join('\n')}` : ''}

${style.doNotUse?.length > 0 ? `\nNEVER use these patterns (they would seem inauthentic):\n${style.doNotUse.map((d: string) => `- ${d}`).join('\n')}` : ''}

CRITICAL: Match this style EXACTLY. Use the specific patterns, phrases, and quirks identified above.
--- END CUSTOM STYLE ---
`;
    }

    return `
🎯 YOUR MAIN TASK: Write a REPLY to this tweet: "${input.originalTweet}"

The tweet author said: "${input.originalTweet}"

You need to RESPOND TO THEM expressing this idea: "${input.responseIdea}"

IMPORTANT: Never repeat the user's suggested response verbatim. Always rephrase and adapt it to sound natural while preserving the intended message.
${researchBlock}

${input.perplexityData ? `
REQUIREMENTS (in order of importance):
1. Reply directly to the tweet above - you're responding to what they said
2. Express the user's core message: "${input.responseIdea}" (but rephrase it in your own words)
3. Incorporate the research data naturally into your response
4. Make it sound conversational and human
5. Follow the ${input.selectedType.name} style pattern
6. Maintain ${input.tone} tone
7. Target length: ${targetLengthRange} characters (limit: ${charLimit})

CRITICAL REMINDERS:
- You are REPLYING TO THE SPECIFIC TWEET ABOVE - acknowledge what they said
- Start with addressing their point, then weave in supporting research
- Use conversational transitions like "That's why...", "Actually...", "You're right that..."
- The research backs up YOUR RESPONSE to THEIR TWEET
- This is a Twitter reply, not an informational article
- If using stats, prefer ${currentYear} data when available` : `
REQUIREMENTS:
1. Reply directly to the tweet above
2. Express the user's core message: "${input.responseIdea}" (but rephrase it in your own words)
3. Use the ${input.selectedType.name} pattern as a style guide
4. Maintain ${input.tone} tone
5. Target length: ${targetLengthRange} characters (limit: ${charLimit})`}

Style guidance:
- Pattern: ${input.selectedType.pattern}
- Style rules: ${input.selectedType.styleRules}
${customStylePrompt ? customStylePrompt : styleInstructions}

${antiAIPrompt}

Write the reply (just the text, no quotes):`;
  }
}


function cleanReply(reply: string, charLimit: number, isWriteLikeMe: boolean = false): string {
  // Basic cleanup
  reply = reply.trim();
  
  // Remove quotes if the entire reply is quoted
  if (reply.startsWith('"') && reply.endsWith('"')) {
    reply = reply.slice(1, -1);
  }
  
  // Remove any leading/trailing quotes or asterisks
  reply = reply.replace(/^["'*]+|["'*]+$/g, '');

  // Ensure it's not too long
  if (reply.length > charLimit) {
    // Try to cut at a sentence boundary
    const sentences = reply.match(/[^.!?]+[.!?]+/g) || [reply];
    let truncated = '';
    
    for (const sentence of sentences) {
      if (truncated.length + sentence.length <= charLimit - 3) {
        truncated += sentence;
      } else {
        break;
      }
    }
    
    reply = truncated || reply.substring(0, charLimit - 3) + '...';
  }
  
  // Final cleanup
  reply = reply.trim();
  
  // Skip capitalization for Write Like Me to preserve user's style
  if (!isWriteLikeMe && reply.length > 0) {
    reply = reply[0].toUpperCase() + reply.substring(1);
  }

  return reply;
}