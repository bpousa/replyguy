import OpenAI from 'openai';

export interface TweetStyle {
  tone: string;
  formality: 'casual' | 'neutral' | 'formal';
  vocabulary: 'simple' | 'moderate' | 'complex';
  punctuation: {
    exclamations: boolean;
    questions: boolean;
    ellipsis: boolean;
    allCaps: boolean;
  };
  sentenceLength: 'short' | 'medium' | 'long';
  hasEmojis: boolean;
  hasHashtags: boolean;
  characteristics: string[];
}

export class StyleAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze the style of a tweet
   */
  async analyzeTweetStyle(tweet: string): Promise<TweetStyle> {
    const prompt = `Analyze the writing style of this tweet and return a JSON object:

Tweet: "${tweet}"

Analyze these aspects:
1. tone: The emotional tone (e.g., excited, angry, sad, humorous, serious, etc.)
2. formality: casual, neutral, or formal
3. vocabulary: simple, moderate, or complex
4. punctuation: Check for exclamations, questions, ellipsis, ALL CAPS
5. sentenceLength: short, medium, or long
6. hasEmojis: true/false
7. hasHashtags: true/false
8. characteristics: List 2-3 distinctive style features (e.g., "uses slang", "rhetorical questions", "fragmented sentences")

Return ONLY a JSON object with these exact fields, no other text.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a text style analyzer. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0].message.content || '{}';
      const style = JSON.parse(response) as TweetStyle;

      // Ensure all required fields exist with defaults
      return {
        tone: style.tone || 'neutral',
        formality: style.formality || 'neutral',
        vocabulary: style.vocabulary || 'moderate',
        punctuation: {
          exclamations: style.punctuation?.exclamations || false,
          questions: style.punctuation?.questions || false,
          ellipsis: style.punctuation?.ellipsis || false,
          allCaps: style.punctuation?.allCaps || false
        },
        sentenceLength: style.sentenceLength || 'medium',
        hasEmojis: style.hasEmojis || false,
        hasHashtags: style.hasHashtags || false,
        characteristics: style.characteristics || []
      };
    } catch (error) {
      console.error('Style analysis error:', error);
      // Return default style on error
      return this.getDefaultStyle();
    }
  }

  /**
   * Generate style instructions for reply generation
   */
  static generateStyleInstructions(originalStyle: TweetStyle, weight: number = 0.5): string {
    const instructions: string[] = [];

    // Apply style with specified weight (0.5 = 50% influence)
    if (weight > 0) {
      // Formality matching
      if (originalStyle.formality === 'casual' && weight > 0.3) {
        instructions.push('Keep the tone casual and conversational');
      } else if (originalStyle.formality === 'formal' && weight > 0.3) {
        instructions.push('Maintain a more formal tone');
      }

      // Vocabulary matching
      if (originalStyle.vocabulary === 'simple' && weight > 0.4) {
        instructions.push('Use simple, everyday language');
      } else if (originalStyle.vocabulary === 'complex' && weight > 0.4) {
        instructions.push('Use more sophisticated vocabulary where appropriate');
      }

      // Punctuation style
      if (originalStyle.punctuation.exclamations && weight > 0.5) {
        instructions.push('You can use an exclamation point for emphasis');
      }
      if (originalStyle.punctuation.questions && weight > 0.4) {
        instructions.push('Consider using a rhetorical question');
      }
      if (originalStyle.punctuation.ellipsis && weight > 0.5) {
        instructions.push('You can use ellipsis (...) for effect');
      }

      // Sentence length
      if (originalStyle.sentenceLength === 'short' && weight > 0.3) {
        instructions.push('Keep sentences short and punchy');
      } else if (originalStyle.sentenceLength === 'long' && weight > 0.3) {
        instructions.push('You can use longer, more complex sentences');
      }

      // Special characteristics
      for (const characteristic of originalStyle.characteristics) {
        if (weight > 0.6) {
          instructions.push(`Try to incorporate: ${characteristic}`);
        }
      }
    }

    return instructions.length > 0 
      ? `\nStyle matching (${Math.round(weight * 100)}% influence):\n- ${instructions.join('\n- ')}`
      : '';
  }

  /**
   * Quick style check without API call
   */
  static quickAnalyze(tweet: string): Partial<TweetStyle> {
    return {
      punctuation: {
        exclamations: tweet.includes('!'),
        questions: tweet.includes('?'),
        ellipsis: tweet.includes('...'),
        allCaps: /\b[A-Z]{2,}\b/.test(tweet)
      },
      hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/u.test(tweet),
      hasHashtags: tweet.includes('#'),
      sentenceLength: tweet.length < 50 ? 'short' : tweet.length > 150 ? 'long' : 'medium'
    };
  }

  private getDefaultStyle(): TweetStyle {
    return {
      tone: 'neutral',
      formality: 'neutral',
      vocabulary: 'moderate',
      punctuation: {
        exclamations: false,
        questions: false,
        ellipsis: false,
        allCaps: false
      },
      sentenceLength: 'medium',
      hasEmojis: false,
      hasHashtags: false,
      characteristics: []
    };
  }

  /**
   * Calculate cost for style analysis
   */
  static calculateCost(tokensUsed: number): number {
    // GPT-3.5-turbo pricing
    return tokensUsed * 0.000001; // $1 per 1M tokens
  }
}