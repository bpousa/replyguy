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
        prompt = `You are a meme text expert. Enhance this meme idea to work better with Imgflip:

User's idea: "${userText}"
Context: This is for a ${tone} reply

RULES:
1. Keep the user's core concept but make it simpler
2. Use common meme language (y u no, such/much, etc.)
3. Maximum 8 words
4. Remove complex punctuation
5. Make it match popular meme formats

Examples of enhancements:
- "this isn't working" → "y u no work"
- "there are problems everywhere" → "bugs everywhere"
- "I'm confused" → "not sure if serious"
- "everything is chaotic" → "this is fine"

Reply with ONLY the enhanced meme text, nothing else.`;
        console.log('[OpenAIMeme] Enhancing user text:', userText);
      } else {
        // Generate from scratch based on reply
        prompt = `You are a meme text expert. Create a SHORT meme caption for this context:

Reply: "${reply.substring(0, 300)}..."
Tone: ${tone}

IMPORTANT RULES:
1. Use SIMPLE, COMMON meme phrases that work with Imgflip's automeme
2. Keep it UNDER 8 WORDS - shorter is better!
3. Avoid complex sentences or punctuation
4. Stick to these PROVEN formats:
   - "this is fine"
   - "y u no [action]"
   - "not sure if [x] or [y]"
   - "one does not simply [action]"
   - "shut up and take my money"
   - "why not both"
   - "[noun] everywhere"
   - "ain't nobody got time for that"
   - "such [adjective] much [noun]"
   - "i don't always [x] but when i do [y]"

Examples of GOOD meme text:
- "this is fine" 
- "y u no work"
- "bugs everywhere"
- "not sure if bug or feature"
- "one does not simply deploy on friday"

Examples of BAD meme text (too complex):
- "when you realize the bug was in production all along"
- "that moment when your code works but you don't know why"

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