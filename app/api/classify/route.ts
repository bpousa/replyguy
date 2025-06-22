import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { ReplyType } from '@/app/lib/types';
import replyTypesData from '@/data/reply-types.json';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(500),
  responseType: z.enum(['agree', 'disagree', 'neutral', 'other']),
  tone: z.string(),
  perplexityData: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Filter reply types based on response type and tone
    const relevantTypes = filterReplyTypes(
      validated.responseType,
      validated.tone
    );

    // Build classification prompt
    const prompt = buildClassificationPrompt(validated, relevantTypes);

    // Call OpenAI for classification
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at matching tweet contexts to appropriate reply patterns. Return only the numbers of your top 3 choices, separated by commas.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const response = completion.choices[0].message.content || '';
    const selectedIndices = parseClassificationResponse(response);
    const selectedTypes = selectedIndices
      .map(i => relevantTypes[i - 1])
      .filter(Boolean)
      .slice(0, 3);

    // Calculate cost
    const tokensUsed = completion.usage?.total_tokens || 0;
    const cost = tokensUsed * 0.000002; // GPT-3.5 pricing

    return NextResponse.json({
      data: {
        selectedTypes,
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

    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify reply types' },
      { status: 500 }
    );
  }
}

function filterReplyTypes(responseType: string, tone: string): ReplyType[] {
  // Simple filtering based on category mapping
  const categoryMap: Record<string, string[]> = {
    agree: ['Agreement & Relatability', 'Praise & Support'],
    disagree: ['Opinion & Challenge'],
    neutral: ['Value & Information', 'Conversation Starter'],
    other: ['Humor & Wit', 'Creative & Interactive'],
  };

  const relevantCategories = categoryMap[responseType] || [];
  
  return replyTypesData
    .filter(type => relevantCategories.includes(type.category))
    .map(type => ({
      id: type.reply_name.toLowerCase().replace(/\s+/g, '_'),
      name: type.reply_name,
      category: type.category,
      pattern: type.description,
      styleRules: `Match the style of: ${type.example_reply}`,
      examples: [type.example_reply],
      tags: extractTags(type),
      complexity: 1,
    }));
}

function extractTags(type: any): string[] {
  const tags = [type.category.toLowerCase()];
  if (type.description.includes('question')) tags.push('question');
  if (type.description.includes('humor')) tags.push('humor');
  if (type.description.includes('support')) tags.push('supportive');
  return tags;
}

function buildClassificationPrompt(
  input: any,
  candidates: ReplyType[]
): string {
  const candidateList = candidates
    .map((c, i) => `${i + 1}. ${c.name}: ${c.pattern}`)
    .join('\n');

  return `
Given this tweet: "${input.originalTweet}"
Tone: ${input.tone}
${input.perplexityData ? `Additional context: ${input.perplexityData}` : ''}

Select the 3 best reply patterns from these options:
${candidateList}

Consider which patterns best match the tone and context.
Return only the numbers of your top 3 choices, separated by commas.`;
}

function parseClassificationResponse(response: string): number[] {
  const numbers = response.match(/\d+/g)?.map(Number) || [];
  return numbers.filter(n => n > 0);
}