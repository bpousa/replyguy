import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { StyleAnalyzer, TweetStyle } from '@/app/lib/services/style-analyzer.service';
import { AntiAIDetector } from '@/app/lib/services/anti-ai-detector.service';
import { REPLY_LENGTHS } from '@/app/lib/constants';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
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
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
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
    
    // Get character limit based on reply length
    const replyLength = validated.replyLength || 'short';
    const charLimit = REPLY_LENGTHS.find(l => l.value === replyLength)?.maxChars || 280;
    
    // Analyze style if enabled
    let styleInstructions = '';
    if (validated.enableStyleMatching && process.env.OPENAI_API_KEY) {
      try {
        const styleAnalyzer = new StyleAnalyzer(process.env.OPENAI_API_KEY);
        const tweetStyle = await styleAnalyzer.analyzeTweetStyle(validated.originalTweet);
        styleInstructions = StyleAnalyzer.generateStyleInstructions(tweetStyle, 0.5);
      } catch (error) {
        console.error('Style analysis failed:', error);
      }
    }

    // Get custom style if enabled
    let customStyleInstructions = '';
    if (validated.useCustomStyle && validated.userId) {
      try {
        const { createServerClient } = await import('@/app/lib/auth');
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        const supabase = createServerClient(cookieStore);
        
        const { data: activeStyle } = await supabase
          .rpc('get_user_active_style', { p_user_id: validated.userId })
          .single() as { data: { style_instructions?: string } | null };
          
        if (activeStyle?.style_instructions) {
          customStyleInstructions = activeStyle.style_instructions;
        }
      } catch (error) {
        console.error('Failed to get custom style:', error);
      }
    }

    // Build generation prompt
    const prompt = buildGenerationPrompt(validated, charLimit, styleInstructions, replyLength);
    
    console.log('\n📋 === GENERATION PROMPT ===');
    console.log('Has perplexity data in validated:', !!validated.perplexityData);
    console.log('Perplexity data preview:', validated.perplexityData?.substring(0, 200));
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
    const researchBuffer = hasResearch ? 1.3 : 1.0; // 30% extra for research complexity
    
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
    
    console.log(`\n🔢 Token calculation: charLimit=${charLimit}, maxTokens=${maxTokens}, hasResearch=${hasResearch}`);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature: 0.8,
      system: `You are typing a ${replyLength === 'extra-long' ? 'detailed thread-style' : replyLength === 'long' ? 'comprehensive' : replyLength === 'medium' ? 'thoughtful' : 'quick'} reply on Twitter/X. Write exactly like a real person would - casual, direct, sometimes imperfect. The user told you what they want to say, so say it naturally. ${replyLength === 'short' ? 'Keep it punchy - one main point.' : replyLength === 'medium' ? 'You have room for 2-3 sentences to develop your thought.' : 'Take the space to fully develop your thoughts while keeping it conversational.'} When stats/research are included, drop them in naturally like you're sharing something you just learned.`,
      messages: [{ role: 'user', content: prompt }],
    });

    let reply = message.content[0].type === 'text' ? message.content[0].text : '';
    
    console.log('\n🤖 === CLAUDE GENERATION RESPONSE ===');
    console.log('Raw reply:', reply);
    
    // Apply anti-AI processing (now async to support dynamic patterns)
    reply = await AntiAIDetector.process(reply);
    
    console.log('\n🔧 === AFTER ANTI-AI PROCESSING ===');
    console.log('Processed reply:', reply);
    
    // Clean and validate the reply
    reply = cleanReply(reply, charLimit);
    
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

    return NextResponse.json({
      data: {
        reply,
        tokensUsed,
        cost,
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
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}


function buildGenerationPrompt(input: any, charLimit: number, styleInstructions: string, replyLength: string): string {
  const antiAIPrompt = `
Write like real people actually write on Twitter:
- Start mid-thought sometimes: "honestly the worst part is..." or "nah that's not even..."
- Use casual language: "tbh", "ngl", "idk", "lol" (but sparingly)
- Drop subjects sometimes: "can't believe this" instead of "I can't believe this"
- Natural reactions: "wait what", "oh damn", "yikes", "lmao okay"
- Imperfect punctuation: occasional missing periods, lowercase starts
- Real disagreement: "nah", "eh", "not really", "hard disagree"
- Natural enthusiasm: "this is sick", "love this", "so good"
- Skip perfect transitions - just jump to your point
- One emoji max (and only if it really fits)

When sharing facts/stats:
- Lead with reaction: "wait this is wild - [stat]"
- Or casual discovery: "just found out [fact] and now i can't stop thinking about it"
- Or simple share: "fun fact: [stat]"

${replyLength === 'short' ? 'BE BRIEF. Keep it to 1-2 sentences max. Make your point quickly.' : replyLength === 'medium' ? 'You have space for a thoughtful response. Use 2-4 sentences to properly develop your idea. Don\'t rush - you have 560 characters to work with.' : replyLength === 'long' ? 'Take your time to fully express the idea. Use multiple sentences to make your point clear. You have 1000 characters - enough for a detailed paragraph.' : 'This is an extra-long reply. Fully develop your thoughts with detailed explanations, multiple points, and comprehensive coverage of the topic. Use the full 2000 character limit available.'}

Even if the user's suggestion sounds good, always put it in your own words. Never copy their phrasing exactly.`

  const currentYear = new Date().getFullYear();
  
  let customStylePrompt = '';
  if (input.useCustomStyle && input.customStyle) {
    customStylePrompt = `

--- YOUR CUSTOM STYLE ---
Your writing style has been analyzed as:
- Tone: ${input.customStyle.tone}
- Formality: ${input.customStyle.formality}
- Vocabulary: ${input.customStyle.vocabulary}
- Sentence Structure: ${input.customStyle.sentenceStructure}
- Emoji Usage: ${input.customStyle.emojiUsage}
- Capitalization: ${input.customStyle.capitalization}
- Punctuation: ${input.customStyle.punctuation}
- Personality Traits: ${input.customStyle.personalityTraits.join(', ')}

Follow this style closely.
--- END CUSTOM STYLE ---
`;
  }

  return `
🎯 YOUR MAIN TASK: Write a REPLY to this tweet: "${input.originalTweet}"

The tweet author said: "${input.originalTweet}"

You need to RESPOND TO THEM expressing this idea: "${input.responseIdea}"

IMPORTANT: Never repeat the user's suggested response verbatim. Always rephrase and adapt it to sound natural while preserving the intended message.

${input.perplexityData ? `
📊 RESEARCH DATA TO INCLUDE IN YOUR REPLY:
<<RESEARCH_BLOCK>>
${input.perplexityData}
<<RESEARCH_BLOCK>>

CRITICAL: You are REPLYING TO THE TWEET ABOVE. The research should support your response, but you must:
1. Address the tweet author directly (use "you" when appropriate)
2. Reference what they said in their tweet
3. Make it clear you're responding to their specific point
4. Use the research to strengthen YOUR RESPONSE to THEIR TWEET
5. This is a CONVERSATION, not a blog post or article
` : ''}

${input.perplexityData ? `
REQUIREMENTS (in order of importance):
1. Reply directly to the tweet above - you're responding to what they said
2. Express the user's core message: "${input.responseIdea}" (but rephrase it in your own words)
3. Incorporate the research data naturally into your response
4. Make it sound conversational and human
5. Follow the ${input.selectedType.name} style pattern
6. Maintain ${input.tone} tone
7. Target length: ${replyLength === 'short' ? '140-280' : replyLength === 'medium' ? '400-560' : replyLength === 'long' ? '700-1000' : '1500-2000'} characters (limit: ${charLimit})

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
5. Target length: ${replyLength === 'short' ? '140-280' : replyLength === 'medium' ? '400-560' : replyLength === 'long' ? '700-1000' : '1500-2000'} characters (limit: ${charLimit})`}

Style guidance:
- Pattern: ${input.selectedType.pattern}
- Style rules: ${input.selectedType.styleRules}
${customStylePrompt ? customStylePrompt : styleInstructions}

${antiAIPrompt}

Write the reply (just the text, no quotes):`;
}


function cleanReply(reply: string, charLimit: number): string {
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
  
  // Ensure first letter is capitalized
  if (reply.length > 0) {
    reply = reply[0].toUpperCase() + reply.substring(1);
  }

  return reply;
}