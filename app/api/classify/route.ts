import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { ReplyType } from '@/app/lib/types';
import replyTypesData from '@/data/all-reply-types.json';

// Check if OpenAI API key is configured
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey || apiKey.trim() === '') {
  console.error('[classify] OpenAI API key is not configured');
}

// Initialize OpenAI client
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
}) : null;

// Request validation schema
const requestSchema = z.object({
  originalTweet: z.string().min(1).max(2000),
  responseIdea: z.string().min(1).max(2000),
  responseType: z.enum(['agree', 'disagree', 'neutral', 'other']),
  tone: z.string(),
  perplexityData: z.string().optional(),
});

// Fallback reply types for when classification fails
const FALLBACK_TYPES: ReplyType[] = [
  {
    id: 'helpful-tip',
    name: 'The Helpful Tip',
    category: 'Value & Information',
    pattern: 'Share useful advice or insights',
    styleRules: 'Be helpful and constructive. Focus on providing value.',
    examples: ['Here\'s something that might help...', 'One thing to consider is...'],
    tags: ['helpful', 'informative'],
    complexity: 1,
  },
  {
    id: 'supportive-response',
    name: 'The Supportive Response',
    category: 'Supportive Community',
    pattern: 'Show understanding and support',
    styleRules: 'Be empathetic and encouraging. Show you understand their perspective.',
    examples: ['I completely understand...', 'That makes a lot of sense...'],
    tags: ['supportive', 'empathetic'],
    complexity: 1,
  },
  {
    id: 'thoughtful-reply',
    name: 'The Thoughtful Reply',
    category: 'Analytical & Thoughtful',
    pattern: 'Provide a considered, thoughtful response',
    styleRules: 'Be analytical but accessible. Show you\'ve thought about the topic.',
    examples: ['That\'s an interesting point...', 'I\'ve been thinking about this too...'],
    tags: ['analytical', 'thoughtful'],
    complexity: 1,
  }
];

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    // Check if OpenAI client is available
    if (!openai) {
      console.warn('[classify] OpenAI client not initialized, using fallback classification');
      const relevantTypes = filterReplyTypes(
        validated.responseType,
        validated.tone
      );
      
      // Return first 3 relevant types or fallbacks
      const selectedTypes = relevantTypes.length > 0 
        ? relevantTypes.slice(0, 3)
        : FALLBACK_TYPES;
      
      return NextResponse.json({
        data: {
          selectedTypes,
          tokensUsed: 0,
          cost: 0,
          fallback: true,
        },
      });
    }

    // Filter reply types based on response type and tone
    const relevantTypes = filterReplyTypes(
      validated.responseType,
      validated.tone
    );
    
    // Log classification input and filtered results
    console.log(`[classify] Processing request - ResponseType: ${validated.responseType}, Tone: ${validated.tone}`);
    console.log(`[classify] Found ${relevantTypes.length} relevant reply types`);
    
    // If no relevant types found, use fallbacks immediately
    if (relevantTypes.length === 0) {
      console.warn(`[classify] No relevant types found for responseType: ${validated.responseType}, tone: ${validated.tone}. Using fallbacks.`);
      return NextResponse.json({
        data: {
          selectedTypes: FALLBACK_TYPES,
          tokensUsed: 0,
          cost: 0,
          fallback: true,
          message: 'Using default reply types due to no matches found',
        },
      });
    }

    // Build classification prompt
    const prompt = buildClassificationPrompt(validated, relevantTypes);

    // Call GPT-3.5-turbo for classification (cost-efficient)
    let completion;
    try {
      completion = await openai.chat.completions.create({
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
    } catch (apiError) {
      console.error('[classify] OpenAI API error:', apiError);
      
      // Return fallback types on API error
      const selectedTypes = relevantTypes.length > 0 
        ? relevantTypes.slice(0, 3)
        : FALLBACK_TYPES;
      
      return NextResponse.json({
        data: {
          selectedTypes,
          tokensUsed: 0,
          cost: 0,
          fallback: true,
          error: 'Classification API temporarily unavailable',
        },
      });
    }

    const response = completion.choices[0].message.content || '';
    const selectedIndices = parseClassificationResponse(response);
    let selectedTypes = selectedIndices
      .map(i => relevantTypes[i - 1])
      .filter(Boolean)
      .slice(0, 3);
    
    // If no types were selected, use fallbacks
    if (selectedTypes.length === 0) {
      console.warn('[classify] No types selected from classification, using fallbacks');
      selectedTypes = relevantTypes.length > 0 
        ? relevantTypes.slice(0, 3)
        : FALLBACK_TYPES;
    }

    // Calculate cost - GPT-3.5-turbo pricing
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const tokensUsed = promptTokens + completionTokens;
    const cost = (promptTokens * 0.0000005) + (completionTokens * 0.0000015); // $0.50/$1.50 per 1M tokens

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
    informative: ['Value & Information', 'Analytical & Thoughtful', 'Professional & Networking'],
    humorous: ['Humor & Wit', 'Creative & Interactive', 'Meta & Platform-Specific'],
    supportive: ['Supportive Community', 'Praise & Support', 'Emotional & Empathetic'],
    witty: ['Humor & Wit', 'Opinion & Challenge', 'Creative & Interactive'],
    friendly: ['Agreement & Relatability', 'Supportive Community', 'Conversation Starter'],
    formal: ['Professional & Networking', 'Analytical & Thoughtful', 'Value & Information'],
  };

  const normalizedTone = tone.toLowerCase();
  let toneCats = toneCategories[normalizedTone] || [];
  
  // Log if tone is not found in mapping
  if (!toneCategories[normalizedTone] && tone) {
    console.warn(`[classify] Unknown tone: "${tone}". Using default categories. Known tones: ${Object.keys(toneCategories).join(', ')}`);
    // Use a sensible default for unknown tones
    toneCats = ['Value & Information', 'Analytical & Thoughtful'];
  }
  
  const allRelevantCategories = [...new Set([...relevantCategories, ...toneCats])];
  
  // Log category filtering details
  if (allRelevantCategories.length === 0) {
    console.error(`[classify] No categories found for responseType: ${responseType}, tone: ${tone}`);
  }
  
  const filteredTypes = replyTypesData
    .filter((type: any) => allRelevantCategories.includes(type.category));
    
  if (filteredTypes.length === 0) {
    console.error(`[classify] No reply types matched categories: ${allRelevantCategories.join(', ')}`);
  }
  
  return filteredTypes.map((type: any) => ({
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