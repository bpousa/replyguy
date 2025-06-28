import OpenAI from 'openai';

interface MemeTextOptions {
  userText?: string;
  reply: string;
  tone: string;
  enhance: boolean;
}

export class OpenAIMemeService {
  private openai: OpenAI | null = null;
  
  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }
  
  /**
   * Generate or enhance meme text using GPT-4o
   */
  async generateMemeText(options: MemeTextOptions): Promise<string> {
    const { userText, reply, tone, enhance } = options;
    
    try {
      let prompt: string;
      
      if (userText && !enhance) {
        // User wants exact text - return as-is
        console.log('[OpenAIMeme] Using exact user text:', userText);
        return userText;
      } else if (userText && enhance) {
        // Enhance user's meme idea
        prompt = `You are a meme text expert. Take this meme idea and make it funnier while keeping the core concept:

User's idea: "${userText}"
Context: This is for a ${tone} reply that says: "${reply.substring(0, 200)}..."

Make it funnier using popular meme formats and internet humor. Keep it under 10 words.
Reply with ONLY the enhanced meme text, nothing else.`;
        console.log('[OpenAIMeme] Enhancing user text:', userText);
      } else {
        // Generate from scratch based on reply
        prompt = `You are a meme text expert. Create a hilarious meme caption based on this context:

Reply: "${reply.substring(0, 300)}..."
Tone: ${tone}

Use popular meme formats like:
- "one does not simply..."
- "y u no..."
- "not sure if... or..."
- "this is fine"
- "but that's none of my business"
- Or any other popular meme format

The meme should capture the essence of the reply in a funny way.
Keep it under 10 words for maximum impact.
Reply with ONLY the meme text, nothing else.`;
        console.log('[OpenAIMeme] Generating meme from reply');
      }
      
      const startTime = Date.now();
      const completion = await this.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a meme text generator. You create short, funny captions for memes. Always respond with just the meme text, no explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Higher creativity for memes
        max_tokens: 50,
        presence_penalty: 0.5, // Encourage variety
        frequency_penalty: 0.5 // Avoid repetition
      });
      
      const memeText = completion.choices[0].message.content?.trim() || 'this is fine';
      const processingTime = Date.now() - startTime;
      
      // Calculate cost (GPT-4o pricing)
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000; // $5/$15 per 1M tokens
      
      console.log('[OpenAIMeme] Generated meme text:', {
        original: userText,
        generated: memeText,
        enhanced: enhance,
        processingTime: `${processingTime}ms`,
        tokens: { input: inputTokens, output: outputTokens },
        cost: `$${cost.toFixed(4)}`
      });
      
      return memeText;
    } catch (error) {
      console.error('[OpenAIMeme] Error generating meme text:', error);
      
      // Fallback to simple generation if GPT-4o fails
      if (userText) {
        return userText;
      }
      
      // Basic fallback based on tone
      const fallbacks: Record<string, string[]> = {
        sarcastic: ['this is fine', 'sure that will work', 'oh really'],
        humorous: ['why not both', 'shut up and take my money', 'but why'],
        professional: ['one does not simply ignore best practices', 'I should document this'],
        default: ['this is fine', 'not sure if serious', 'y u no work']
      };
      
      const toneOptions = fallbacks[tone] || fallbacks.default;
      return toneOptions[Math.floor(Math.random() * toneOptions.length)];
    }
  }
  
  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

// Export singleton
export const openAIMemeService = new OpenAIMemeService();