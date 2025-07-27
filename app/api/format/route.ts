import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

// Input validation schema
const requestSchema = z.object({
  text: z.string().min(1).max(2000),
  replyLength: z.enum(['short', 'medium', 'long', 'extra-long']).optional()
});

// Initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function POST(req: NextRequest) {
  try {
    // Check if formatting LLM is enabled
    const formattingEnabled = process.env.ENABLE_FORMATTING_LLM === 'true';
    if (!formattingEnabled) {
      return NextResponse.json(
        { error: 'Formatting LLM is disabled' },
        { status: 503 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    console.log('[format] Formatting request:', {
      textLength: validated.text.length,
      replyLength: validated.replyLength,
      preview: validated.text.substring(0, 100) + '...'
    });

    // If text already has line breaks, just return it
    if (validated.text.includes('\n')) {
      console.log('[format] Text already has line breaks, returning as-is');
      return NextResponse.json({
        data: {
          formattedText: validated.text,
          wasFormatted: false,
          cost: 0
        }
      });
    }

    // Determine ideal paragraph count based on length
    const textLength = validated.text.length;
    const targetParagraphs = 
      textLength < 200 ? 1 :
      textLength < 400 ? 2 :
      textLength < 700 ? 3 :
      4;

    // Create formatting prompt
    const prompt = `Format this Twitter/X reply by adding line breaks to create ${targetParagraphs} paragraphs.

RULES:
- Keep EVERY word exactly the same - do not change any text
- Only add line breaks (double line breaks) between paragraphs  
- Each paragraph should be 1-3 sentences
- Break at natural transition points (e.g., "reminds me of", "what's really", "turns out")
- Make it easy to read on mobile

Text to format:
"${validated.text}"

Reply with ONLY the formatted text, nothing else:`;

    const startTime = Date.now();
    
    // Call GPT-3.5-turbo for formatting
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a formatting assistant. You add line breaks to text without changing any words.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent formatting
      max_tokens: Math.ceil(validated.text.length * 1.5), // Allow some extra space for line breaks
    });

    const formattedText = completion.choices[0]?.message?.content?.trim() || validated.text;
    
    // Remove quotes if the model wrapped the response in quotes
    const cleanedText = formattedText
      .replace(/^["']/, '')
      .replace(/["']$/, '')
      .trim();

    // Calculate cost
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.0000005) + (outputTokens * 0.0000015); // GPT-3.5-turbo pricing

    const processingTime = Date.now() - startTime;

    console.log('[format] Formatting complete:', {
      originalLength: validated.text.length,
      formattedLength: cleanedText.length,
      hasLineBreaks: cleanedText.includes('\n'),
      paragraphCount: cleanedText.split('\n\n').length,
      tokensUsed: inputTokens + outputTokens,
      cost: cost.toFixed(6),
      processingTime: processingTime + 'ms'
    });

    return NextResponse.json({
      data: {
        formattedText: cleanedText,
        wasFormatted: true,
        cost,
        tokensUsed: inputTokens + outputTokens,
        processingTime
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[format] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to format text',
      },
      { status: 500 }
    );
  }
}