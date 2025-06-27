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
  replyLength: z.enum(['short', 'medium', 'long']).optional(),
  enableStyleMatching: z.boolean().optional(),
  useCustomStyle: z.boolean().optional(),
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
    const prompt = buildGenerationPrompt(validated, charLimit, styleInstructions, customStyleInstructions);
    
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
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: Math.min(charLimit / 4, 300), // Adjust tokens based on length
      temperature: 0.8,
      system: `You are a real person on Twitter having a genuine conversation. Your PRIMARY job is to express the user's intended message while sounding natural and human. The user has told you exactly what they want to say - honor that above all else. Never ignore or override their intent. Make it sound authentic and conversational, but the core message must be what they requested.`,
      messages: [{ role: 'user', content: prompt }],
    });

    let reply = message.content[0].type === 'text' ? message.content[0].text : '';
    
    console.log('\n🤖 === CLAUDE GENERATION RESPONSE ===');
    console.log('Raw reply:', reply);
    
    // Apply anti-AI processing
    reply = AntiAIDetector.process(reply);
    
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

function buildGenerationPrompt(input: any, charLimit: number, styleInstructions: string, customStyleInstructions: string = ''): string {
  const antiAIPrompt = `
CRITICAL - Avoid these AI patterns:
- NEVER start with: "Great point", "Absolutely", "I think", "Indeed", "Fascinating", "Fair enough", "Well,", "So,", "Oh,"
- NO transitions like: Moreover, Furthermore, Additionally, Nevertheless, However, Thus, Hence
- NO corporate words: leverage, optimize, streamline, robust, comprehensive, innovative
- NO phrases like: "It's worth noting", "One might argue", "In essence"
- MAXIMUM 1 emoji per reply (prefer zero)
- NO excessive positivity or enthusiasm
- NO em dashes (—) or semicolons
- Write like you're texting a friend, not writing an essay

EXCEPTION: When including research data/statistics, be precise with numbers and facts. Stats should sound natural, not overly formal.`;

  return `
Original tweet: "${input.originalTweet}"

${input.perplexityData ? `
🚨 CRITICAL RESEARCH DATA - MUST INCLUDE IN YOUR REPLY:
<<RESEARCH_BLOCK>>
${input.perplexityData}
<<RESEARCH_BLOCK>>

The user specifically requested this factual information. You MUST incorporate these statistics/facts into your response. Make them a natural part of your reply while expressing the user's intended message.
` : ''}

Your task: Create a reply that expresses this message: "${input.responseIdea}"

${input.perplexityData ? `
REQUIREMENTS (in order of importance):
1. Include the research data/statistics provided above
2. Express the user's core message: "${input.responseIdea}"
3. Make it sound natural and conversational
4. Follow the ${input.selectedType.name} style pattern
5. Maintain ${input.tone} tone
6. Stay under ${charLimit} characters` : `
REQUIREMENTS:
1. Express the user's core message: "${input.responseIdea}"
2. Use the ${input.selectedType.name} pattern as a style guide
3. Maintain ${input.tone} tone
4. Stay under ${charLimit} characters`}

Style guidance:
- Pattern: ${input.selectedType.pattern}
- Style rules: ${input.selectedType.styleRules}
${customStyleInstructions ? customStyleInstructions : styleInstructions}

${antiAIPrompt}

${input.perplexityData ? `
⚠️ FINAL CHECK: Before writing your reply, ensure you've included the statistics/facts from the research data above. They should feel like a natural part of your response, not an afterthought.` : ''}

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