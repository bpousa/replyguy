import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { ReplyType } from '@/app/lib/types';
import replyTypesData from '@/data/all-reply-types.json';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(500),
  responseIdea: z.string().min(1).max(2000),
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

    // Call GPT-4o for classification
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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

    // Calculate cost - GPT-4o pricing
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const tokensUsed = promptTokens + completionTokens;
    const cost = (promptTokens * 0.0000025) + (completionTokens * 0.00001); // $2.50/$10 per 1M tokens

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
  // Map response types to relevant categories
  const categoryMap: Record<string, string[]> = {
    agree: ['Agreement & Relatability', 'Praise & Support', 'Supportive Community', 'Emotional & Empathetic'],
    disagree: ['Opinion & Challenge', 'Analytical & Thoughtful'],
    neutral: ['Value & Information', 'Conversation Starter', 'Professional & Networking', 'Analytical & Thoughtful'],
    other: ['Humor & Wit', 'Creative & Interactive', 'Meta & Platform-Specific', 'Playful & Flirty'],
  };

  const relevantCategories = categoryMap[responseType] || [];
  
  // Also consider tone for additional filtering
  const toneCategories: Record<string, string[]> = {
    professional: ['Professional & Networking', 'Analytical & Thoughtful', 'Value & Information'],
    casual: ['Humor & Wit', 'Creative & Interactive', 'Agreement & Relatability'],
    empathetic: ['Emotional & Empathetic', 'Supportive Community', 'Praise & Support'],
    sarcastic: ['Humor & Wit', 'Opinion & Challenge', 'Meta & Platform-Specific'],
    enthusiastic: ['Praise & Support', 'Supportive Community', 'Creative & Interactive'],
    analytical: ['Analytical & Thoughtful', 'Value & Information', 'Opinion & Challenge'],
  };

  const toneCats = toneCategories[tone.toLowerCase()] || [];
  const allRelevantCategories = [...new Set([...relevantCategories, ...toneCats])];
  
  return replyTypesData
    .filter((type: any) => allRelevantCategories.includes(type.category))
    .map((type: any) => ({
      id: type.reply_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
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
  const tags = [type.category.toLowerCase().replace(/[^a-z0-9]/g, '_')];
  const desc = type.description.toLowerCase();
  
  // Extract various tags based on description content
  if (desc.includes('question')) tags.push('question');
  if (desc.includes('humor') || desc.includes('funny') || desc.includes('comedic')) tags.push('humor');
  if (desc.includes('support') || desc.includes('encourage')) tags.push('supportive');
  if (desc.includes('sarcas')) tags.push('sarcastic');
  if (desc.includes('empat')) tags.push('empathetic');
  if (desc.includes('debate') || desc.includes('argument')) tags.push('debate');
  if (desc.includes('data') || desc.includes('fact')) tags.push('informative');
  if (desc.includes('personal')) tags.push('personal');
  if (desc.includes('profession')) tags.push('professional');
  if (desc.includes('emotion')) tags.push('emotional');
  
  return [...new Set(tags)];
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
User wants to say: "${input.responseIdea}"
Tone: ${input.tone}
${input.perplexityData ? `Additional context: ${input.perplexityData}` : ''}

Select the 3 best reply patterns that would allow the user to naturally express their idea:
${candidateList}

CRITICAL: Choose patterns that best support expressing the user's intended message.
Consider:
1. Which patterns allow the user to say what they want?
2. Which match the desired tone?
3. Which fit the context?

Return only the numbers of your top 3 choices, separated by commas.`;
}

function parseClassificationResponse(response: string): number[] {
  const numbers = response.match(/\d+/g)?.map(Number) || [];
  return numbers.filter(n => n > 0);
}