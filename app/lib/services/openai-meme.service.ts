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
          
        prompt = `You are a meme text expert. Create a contextually appropriate meme caption.

${contextInfo}
Tone: ${tone}

ANALYZE THE CONTEXT:
1. What is the main topic? (AI, tech, business, social, etc.)
2. What emotion/situation is being expressed? (excitement, frustration, success, confusion, etc.)
3. What is the purpose of the reply? (helping, disagreeing, celebrating, questioning, etc.)

CREATE MEME TEXT THAT:
1. RELATES DIRECTLY to the conversation topic or emotion
2. Is SHORT (under 8 words) and punchy
3. Uses common meme language when it fits the context
4. Captures the essence of the reply's message

CONTEXT-BASED EXAMPLES:
- Tech/AI discussion + helpful tone → "sharing the knowledge" or "spreading ai wisdom"
- Bug/error discussion + frustrated → "debugging intensifies" or "error 404 sanity not found"
- Success/achievement + excited → "nailed it" or "achievement unlocked"
- Learning/education + motivated → "knowledge is power" or "learning mode activated"
- Disagreement + sarcastic → "sure about that" or "doubt intensifies"

GOOD FORMATS FOR DIFFERENT CONTEXTS:
- Questions/confusion: "but why though", "confused stonks", "visible confusion"
- Success/wins: "task failed successfully", "winning", "absolute win"
- Problems/bugs: "it's not a bug it's a feature", "everything is broken"
- Knowledge sharing: "big brain time", "sharing is caring"
- Disagreements: "press x to doubt", "gonna have to disagree"

AVOID:
- Generic phrases that don't relate to the context
- Overused fallbacks unless they genuinely fit
- Complex sentences or abstract concepts

Reply with ONLY the meme text that best fits THIS SPECIFIC conversation.`;
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
      
      const memeText = completion.choices[0].message.content?.trim() || 'mind blown';
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
      
      // Context-aware fallback based on tone and common scenarios
      const contextualFallbacks: Record<string, string[]> = {
        sarcastic: ['doubt intensifies', 'sure about that', 'seems totally legit', 'oh really now'],
        humorous: ['task failed successfully', 'why not both', 'but why though', 'confused stonks'],
        professional: ['knowledge is power', 'best practices matter', 'documentation needed', 'optimize this'],
        supportive: ['you got this', 'keep going', 'almost there', 'progress'],
        empathetic: ['i feel you', 'been there', 'totally understand', 'same energy'],
        friendly: ['sharing is caring', 'happy to help', 'team work', 'lets go'],
        witty: ['big brain time', 'galaxy brain', 'mind = blown', '200 iq play'],
        informative: ['fun fact incoming', 'the more you know', 'knowledge dropped', 'learning time'],
        default: ['interesting point', 'makes sense', 'good thinking', 'i see']
      };
      
      // Try to match reply content to better fallbacks
      const replyLower = reply?.toLowerCase() || '';
      if (replyLower.includes('bug') || replyLower.includes('error')) {
        return 'debugging intensifies';
      } else if (replyLower.includes('success') || replyLower.includes('work')) {
        return 'it worked';
      } else if (replyLower.includes('learn') || replyLower.includes('know')) {
        return 'knowledge is power';
      } else if (replyLower.includes('help') || replyLower.includes('tip')) {
        return 'sharing wisdom';
      }
      
      const toneOptions = contextualFallbacks[tone] || contextualFallbacks.default;
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
   * Distribute text appropriately for multi-box templates
   */
  distributeTextForTemplate(templateName: string, text: string, boxCount: number): { topText?: string; bottomText?: string; text0?: string; text1?: string; text2?: string; text3?: string } {
    // Handle specific templates with known patterns
    const lowerName = templateName.toLowerCase();
    
    if (lowerName.includes('drake')) {
      // Drake format: reject X, prefer Y
      const parts = text.split(/\s+(?:but|prefer|instead|rather)\s+/i);
      if (parts.length >= 2) {
        return { topText: parts[0], bottomText: parts[1] };
      }
      // Fallback: split in half
      const mid = Math.floor(text.length / 2);
      return { topText: text.substring(0, mid), bottomText: text.substring(mid) };
    }
    
    if (lowerName.includes('expanding brain') || lowerName.includes('brain')) {
      // Progressive levels - split into equal parts
      const words = text.split(' ');
      const wordsPerBox = Math.ceil(words.length / boxCount);
      const result: any = {};
      
      for (let i = 0; i < boxCount && i < 4; i++) {
        const start = i * wordsPerBox;
        const end = Math.min((i + 1) * wordsPerBox, words.length);
        result[`text${i}`] = words.slice(start, end).join(' ');
      }
      return result;
    }
    
    if (lowerName.includes('distracted boyfriend')) {
      // Requires 3 distinct labels
      const parts = text.split(/[,;]|\s+(?:vs|or|not)\s+/i);
      if (parts.length >= 3) {
        return { text0: parts[0].trim(), text1: parts[1].trim(), text2: parts[2].trim() };
      }
      // Fallback: use generic labels
      return { text0: 'current', text1: text, text2: 'better option' };
    }
    
    // Generic multi-box handling
    if (boxCount === 2) {
      // Try to split at natural break points
      const breakPoints = [' but ', ' and ', ' vs ', ' or ', ', ', '; '];
      for (const breakPoint of breakPoints) {
        if (text.includes(breakPoint)) {
          const parts = text.split(breakPoint);
          if (parts.length >= 2) {
            return { topText: parts[0].trim(), bottomText: parts.slice(1).join(breakPoint).trim() };
          }
        }
      }
      
      // Fallback: split in half
      const mid = Math.floor(text.length / 2);
      const spaceNearMid = text.lastIndexOf(' ', mid);
      const splitPoint = spaceNearMid > 0 ? spaceNearMid : mid;
      return { topText: text.substring(0, splitPoint).trim(), bottomText: text.substring(splitPoint).trim() };
    }
    
    // For templates with more boxes, distribute evenly
    if (boxCount > 2) {
      const words = text.split(' ');
      const wordsPerBox = Math.ceil(words.length / boxCount);
      const result: any = {};
      
      for (let i = 0; i < boxCount && i < 4; i++) {
        const start = i * wordsPerBox;
        const end = Math.min((i + 1) * wordsPerBox, words.length);
        const boxText = words.slice(start, end).join(' ');
        
        if (i === 0) result.topText = boxText;
        else if (i === 1) result.bottomText = boxText;
        else result[`text${i}`] = boxText;
      }
      return result;
    }
    
    // Single box or unknown - return as is
    return { topText: text };
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

CONTEXT ANALYSIS:
1. Main topic: What is being discussed? (AI, tech, business, social issues, etc.)
2. Emotional context: What feeling does the reply convey? (helpful, frustrated, excited, confused, etc.)
3. Reply purpose: What is the reply trying to achieve? (inform, agree, disagree, joke, support, etc.)

TEMPLATE SELECTION RULES:
1. Match the template to the SPECIFIC CONTEXT, not just generic emotion
2. Consider these context-template matches:
   - Sharing knowledge/tips → Expanding Brain, Drake, One Does Not Simply
   - Success/Achievement → Success Kid, Leonardo DiCaprio Cheers, Disaster Girl
   - Confusion/Questions → Confused Math Lady, Is This A Pigeon, Distracted Boyfriend
   - Problems/Bugs → This Is Fine, Disaster Girl, Hide The Pain Harold
   - Learning/Growth → Expanding Brain, Drake, Change My Mind
   - Disagreement → Drake, Woman Yelling At Cat, Change My Mind
   - Excitement → Excited Kid, Success Kid, Leonardo DiCaprio Cheers
   - Technical discussions → Expanding Brain, Drake, One Does Not Simply
   
3. For multi-box templates, distribute text logically:
   - Drake: top = reject this, bottom = prefer this
   - Distracted Boyfriend: requires 3 distinct labels
   - Expanding Brain: progressive levels of understanding
   
4. Keep text SHORT and CONTEXTUAL - reference the actual topic being discussed

EXAMPLES OF EXCELLENT CONTEXT MATCHING:
- AI tips discussion + helpful reply → Expanding Brain (basic AI use / advanced AI integration / AI-human teamwork)
- Bug report + frustrated reply → This Is Fine (sitting in bugs / everything crashes)
- Success story + excited reply → Success Kid (implemented new feature / zero bugs found)
- Learning discussion + motivated → Drake (learning alone ❌ / learning with community ✓)

Respond in JSON format:
{
  "templateIndex": <number 1-30>,
  "templateName": "<exact name from list>",
  "reasoning": "<explain why this template fits the specific context>",
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
      
      // Generate context-aware text even for fallback
      const fallbackText = tone === 'sarcastic' ? 'interesting choice' :
                          tone === 'humorous' ? 'why not' :
                          tone === 'professional' ? 'lets discuss' :
                          'good point';
      
      return {
        templateId: fallbackTemplate.id,
        templateName: fallbackTemplate.name,
        text: fallbackText
      };
    }
  }
}

// Export singleton
export const openAIMemeService = new OpenAIMemeService();