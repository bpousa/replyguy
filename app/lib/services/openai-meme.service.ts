import OpenAI from 'openai';

interface MemeTextOptions {
  userText?: string;
  reply: string;
  originalTweet?: string;
  tone: string;
  enhance: boolean;
}

interface TemplateSelectionOptions {
  originalTweet: string;
  reply: string;
  tone: string;
  templates: Array<{
    id: string;
    name: string;
    url: string;
    box_count: number;
  }>;
}

interface TemplateSelectionResult {
  templateId: string;
  templateName: string;
  topText?: string;
  bottomText?: string;
  text?: string; // For single text templates
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
    const { userText, reply, originalTweet, tone, enhance } = options;
    
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
        const contextInfo = originalTweet 
          ? `Original tweet: "${originalTweet.substring(0, 200)}..."
Reply: "${reply.substring(0, 200)}..."`
          : `Reply: "${reply.substring(0, 300)}..."`;
          
        prompt = `You are a meme text expert. Create a SHORT meme caption for this context:

${contextInfo}
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

  /**
   * Select best meme template based on context
   */
  async selectMemeTemplate(options: TemplateSelectionOptions): Promise<TemplateSelectionResult> {
    const { originalTweet, reply, tone, templates } = options;
    
    try {
      // Create a simplified template list for GPT-4o
      const templateList = templates
        .slice(0, 30) // Limit to top 30 to save tokens
        .map((t, i) => `${i + 1}. "${t.name}" (${t.box_count} text ${t.box_count === 1 ? 'box' : 'boxes'})`)
        .join('\n');
      
      const prompt = `You are a meme expert. Select the MOST contextually appropriate meme template and create text for it.

CONVERSATION CONTEXT:
Original tweet: "${originalTweet}"
Reply being sent: "${reply}"
Tone: ${tone}

AVAILABLE MEME TEMPLATES:
${templateList}

IMPORTANT RULES:
1. Select a template that relates to the CONVERSATION TOPIC or the EMOTION/SITUATION being expressed
2. If the reply is about engagement/goals, pick templates about motivation or action
3. If the reply disagrees, pick templates about disagreement or confusion
4. Consider the tone - sarcastic replies need sarcastic memes
5. Create SHORT, PUNCHY text that works with the chosen template

EXAMPLES OF GOOD CONTEXT MATCHING:
- Tweet about deployment + excited reply → Success Kid ("deployed successfully / nothing broke")
- Tweet about bugs + frustrated reply → This Is Fine (surrounded by bugs)
- Tweet about learning + motivated reply → Drake (reject: tutorials / prefer: diving in)

Respond in JSON format:
{
  "templateIndex": <number 1-30>,
  "templateName": "<exact name from list>",
  "reasoning": "<brief explanation>",
  "topText": "<text for top box if multi-box>",
  "bottomText": "<text for bottom box if multi-box>",
  "text": "<text if single box>"
}`;

      const completion = await this.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a meme expert who selects contextually appropriate memes. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });
      
      const response = completion.choices[0].message.content;
      const parsed = JSON.parse(response || '{}');
      
      // Get the selected template
      const templateIndex = parsed.templateIndex - 1;
      const selectedTemplate = templates[templateIndex];
      
      if (!selectedTemplate) {
        throw new Error('Invalid template selection');
      }
      
      console.log('[OpenAIMeme] Template selection:', {
        selected: selectedTemplate.name,
        reasoning: parsed.reasoning,
        originalContext: originalTweet.substring(0, 50) + '...',
        replyContext: reply.substring(0, 50) + '...'
      });
      
      return {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        topText: parsed.topText,
        bottomText: parsed.bottomText,
        text: parsed.text
      };
      
    } catch (error) {
      console.error('[OpenAIMeme] Template selection error:', error);
      
      // Fallback to popular template based on tone
      const fallbackTemplates: Record<string, string> = {
        sarcastic: '55311130', // This Is Fine
        humorous: '181913649', // Drake Hotline Bling
        professional: '61579', // One Does Not Simply
        default: '61544' // Success Kid
      };
      
      const fallbackId = fallbackTemplates[tone] || fallbackTemplates.default;
      const fallbackTemplate = templates.find(t => t.id === fallbackId) || templates[0];
      
      return {
        templateId: fallbackTemplate.id,
        templateName: fallbackTemplate.name,
        text: 'this is fine'
      };
    }
  }
}

// Export singleton
export const openAIMemeService = new OpenAIMemeService();