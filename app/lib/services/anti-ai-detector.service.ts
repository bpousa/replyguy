/**
 * Anti-AI Pattern Detection Service
 * Detects and removes common AI writing patterns to make replies sound more human
 */

export class AntiAIDetector {
  // Cache for dynamic patterns
  private static dynamicPatterns: Array<{
    pattern: string;
    pattern_type: string;
    category: string;
    replacement: string | null;
  }> | null = null;
  private static patternsCacheTime: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Banned words and phrases
  private static readonly BANNED_TRANSITIONS = [
    'Moreover', 'Furthermore', 'Additionally', 'Indeed', 'Notably',
    'However', 'Nevertheless', 'Nonetheless',
    'Consequently', 'Therefore', 'Thus', 'Hence', 'Accordingly',
    'In conclusion', 'In summary', 'To summarize',
    'It is worth noting', 'It should be noted', 'Worth mentioning',
    'One might argue', 'One could say', 'One would think',
    'Firstly', 'Secondly', 'Subsequently', 'Lastly',
    'In essence', 'Essentially', 'Fundamentally',
    'Having said that', 'That being said', 'With that said',
    'On the other hand', 'On a related note', 'By the way',
    'Speaking of which', 'Incidentally', 'Coincidentally'
  ];

  private static readonly BANNED_OPENINGS = [
    'Great point!', 'Excellent question!', 'Good question!',
    'I think', 'I believe', 'I feel like', 'I would say',
    'Absolutely!', 'Definitely!', 'Exactly!', 'Precisely!',
    'Interesting', 'Fascinating', 'Intriguing', 'Compelling',
    'Fair enough', "That's true", "That's valid", "That's fair",
    'Well,', 'So,', 'Oh,', 'Ah,', 'Um,', 'Hmm,',
    "Let's dive in", "Let's explore", "Let's delve into", "Let's unpack",
    'Indeed,', 'Certainly,', 'Surely,', 'Clearly,',
    'To be honest', 'To be fair', 'In my opinion', 'From my perspective',
    'Actually,', 'Honestly,', 'Frankly,', 'Admittedly,',
    'You raise a', 'You make a', 'You bring up'
  ];

  private static readonly BANNED_CLICHES = [
    'Unlock', 'Unleash', 'the potential', 'the power of',
    'Revolutionary', 'Game-changer', 'Game changer', 'Cutting-edge', 'State-of-the-art',
    'Leverage', 'Optimize', 'Facilitate', 'Streamline', 'Utilize',
    'Paradigm shift', 'Synergy', 'Best practices', 'Ecosystem',
    'Robust', 'Comprehensive', 'Innovative', 'Dynamic', 'Holistic',
    'Seamless', 'Transformative', 'Groundbreaking', 'Pioneering',
    'Delve into', 'Navigate the complexities', 'Dive deeper', 'Deep dive', 'Dive in',
    "In today's digital age", 'In the modern era', 'In this day and age',
    'At the forefront', 'Pave the way', 'Leading the charge', 'Leading the way in',
    'Harness the power', 'Capitalize on', 'Tap into',
    'Foster a culture', 'Drive innovation', 'Cultivate growth',
    "It's important to note that", "It's essential to understand", "It's essential to",
    'Rest assured', 'Look no further', 'Without a doubt',
    'In the realm of', 'In the landscape of', 'In the world of',
    'Actionable insights', 'Value proposition', 'Core competencies',
    'Scalable solution', 'End-to-end', 'Thought leadership',
    'At the end of the day', 'Moving forward', 'Going forward',
    // New additions from user's list
    'Picture this', 'Top-notch', 'Unveil', "We've got you covered",
    'Transition', 'Transitioning', 'Optimal', 'Assessing',
    'We know', 'We understand', 'Testament', 'Captivating',
    'Eager', 'Refreshing', 'Edge of my seat', 'Breath of fresh air', 'Breath of fresh',
    'To consider', 'It is important to consider', 'There are a few considerations',
    'To sum up', 'In terms of', 'With regard to',
    "It's worth mentioning", "It's interesting to note",
    'Significantly', 'Notably', 'As such', 'Interestingly',
    'In essence', 'Noteworthy', 'Bear in mind', "It's crucial to note",
    'One might argue', "It's widely acknowledged", 'Predominantly',
    'From this perspective', 'In this context', 'This demonstrates',
    'Arguably', "It's common knowledge", 'Undoubtedly',
    'This raises the question', 'In a nutshell',
    // Marketing-speak additions
    'Unveiled', 'Elevate', 'Revolutionize', 'Transform', 'Propel',
    'Amplify', 'Empower', 'Seamlessly', 'Integrated',
    'Synergize', 'Unprecedented', 'Tailored', 'Evolve',
    'Streamline', 'Illuminate', 'At your fingertips',
    'Imagine a world where', 'Designed with you in mind',
    'Take it to the next level', 'Experience the difference',
    'Push the boundaries of', 'Reimagine what\'s possible',
    'Step into the future', 'The future is here',
    'Innovation at its finest', 'Set yourself apart',
    'Your journey starts here', 'Delivering results',
    'Breaking barriers', 'Beyond expectations',
    'Your solution awaits', 'Transform your life', 'Transform your business',
    'Transform your experience', 'Redefine how you', 'Redefining',
    'Join the revolution'
  ];

  private static readonly BANNED_WORDS = [
    'Crucial', 'Pivotal', 'Vital', 'Essential', 'Paramount',
    'Meticulous', 'Intricate', 'Nuanced',
    'Realm', 'Landscape', 'Arena', 'Domain',
    'Embark', 'Journey', 'Endeavor', 'Venture',
    'Elevate', 'Amplify', 'Enhance', 'Bolster',
    'Tapestry', 'Mosaic', 'Spectrum',
    'Resonate', 'Underscore', 'Highlight',
    'Moreover', 'Albeit', 'Wherein',
    'Myriad', 'Plethora', 'Multifaceted',
    // Additional from user's list
    'Navigating', 'Unleash', 'Unlock', 'Unveil',
    'Daunting', 'Ensure', 'Strive', 'Striving',
    'Furthermore', 'Comprehensive', 'Firstly',
    'Secondly', 'Lastly', 'Essentially', 'Therefore',
    'Thus', 'Significantly', 'Notably', 'Noteworthy',
    'Arguably', 'Undoubtedly', 'Unveiled', 'Harness',
    'Revolutionize', 'Propel', 'Empower', 'Seamlessly',
    'Robust', 'State-of-the-art', 'Cutting-edge',
    'Integrated', 'Synergize', 'Unprecedented',
    'Tailored', 'Dynamic', 'Pioneering', 'Optimize',
    'Illuminate', 'Reimagine', 'Redefine', 'Redefining'
  ];

  private static readonly BANNED_PATTERNS = [
    /It's not just .+, it's .+/gi,
    /The result\? .+/gi,
    /But here's the thing: .+/gi,
    /Whether it's .+, .+, or .+/gi,
    /From .+ to .+, .+/gi,
    // New patterns for AI-sounding constructions
    /They're not just .+, they're .+/gi,
    /You're onto something .+ - and it's even more .+/gi,
    /That's .+ in context/gi,
    /They're .+ the pace of/gi,
    /\. They're not just .+, they're .+/gi,
    /This is .+ - .+ hit .+ by/gi,
    /part of a massive .+ added in/gi
  ];

  /**
   * Check if text contains AI patterns
   */
  static hasAIPatterns(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for banned transitions
    for (const phrase of this.BANNED_TRANSITIONS) {
      if (lowerText.includes(phrase.toLowerCase())) return true;
    }
    
    // Check for banned openings
    for (const phrase of this.BANNED_OPENINGS) {
      if (lowerText.startsWith(phrase.toLowerCase())) return true;
    }
    
    // Check for banned cliches
    for (const phrase of this.BANNED_CLICHES) {
      if (lowerText.includes(phrase.toLowerCase())) return true;
    }
    
    // Check for banned words
    const words = lowerText.split(/\s+/);
    for (const word of this.BANNED_WORDS) {
      if (words.includes(word.toLowerCase())) return true;
    }
    
    // Check for banned patterns
    for (const pattern of this.BANNED_PATTERNS) {
      if (pattern.test(text)) return true;
    }
    
    // Check for excessive punctuation patterns
    if (text.includes('—')) return true; // em dash
    if ((text.match(/!/g) || []).length > 1) return true; // multiple exclamations
    if (text.includes(';') && text.length < 280) return true; // semicolon in short text
    
    return false;
  }

  /**
   * Remove AI patterns and rewrite text to sound more human
   */
  static humanize(text: string): string {
    let result = text;
    
    // Remove banned transitions
    for (const phrase of this.BANNED_TRANSITIONS) {
      const regex = new RegExp(`\\b${phrase}\\b[,.]?\\s*`, 'gi');
      result = result.replace(regex, '');
    }
    
    // Remove banned openings
    for (const phrase of this.BANNED_OPENINGS) {
      if (result.toLowerCase().startsWith(phrase.toLowerCase())) {
        const regex = new RegExp(`^${phrase}[!.]?\\s*`, 'i');
        result = result.replace(regex, '');
      }
    }
    
    // Replace banned cliches
    result = result.replace(/unlock(ing)? the (potential|power) of/gi, '');
    result = result.replace(/game[- ]?changer/gi, 'big deal');
    result = result.replace(/cutting[- ]?edge/gi, 'new');
    result = result.replace(/state[- ]?of[- ]?the[- ]?art/gi, 'latest');
    result = result.replace(/leverage/gi, 'use');
    result = result.replace(/optimize/gi, 'improve');
    result = result.replace(/facilitate/gi, 'help');
    result = result.replace(/streamline/gi, 'simplify');
    result = result.replace(/robust/gi, 'solid');
    result = result.replace(/comprehensive/gi, 'complete');
    result = result.replace(/innovative/gi, 'new');
    result = result.replace(/seamless(ly)?/gi, 'smooth');
    result = result.replace(/delve into/gi, 'look at');
    result = result.replace(/redefin(e|ing) the/gi, 'changing the');
    result = result.replace(/staggering/gi, 'big');
    result = result.replace(/transform(ing)?/gi, 'change');
    
    // Replace banned words
    result = result.replace(/\bcrucial\b/gi, 'important');
    result = result.replace(/\bpivotal\b/gi, 'key');
    result = result.replace(/\bvital\b/gi, 'important');
    result = result.replace(/\bessential\b/gi, 'needed');
    result = result.replace(/\bmeticulous\b/gi, 'careful');
    result = result.replace(/\bintricate\b/gi, 'complex');
    result = result.replace(/\brealm\b/gi, 'area');
    result = result.replace(/\blandscape\b/gi, 'space');
    result = result.replace(/\bembark\b/gi, 'start');
    result = result.replace(/\bjourney\b/gi, 'process');
    result = result.replace(/\belevate\b/gi, 'improve');
    result = result.replace(/\bamplify\b/gi, 'increase');
    result = result.replace(/\benhance\b/gi, 'improve');
    result = result.replace(/\bmyriad\b/gi, 'many');
    result = result.replace(/\bplethora\b/gi, 'lots of');
    result = result.replace(/\bnavigate\b/gi, 'deal with');
    result = result.replace(/\bnavigating\b/gi, 'dealing with');
    result = result.replace(/\bunleash\b/gi, 'release');
    result = result.replace(/\bunlock\b/gi, 'open');
    result = result.replace(/\bunveil\b/gi, 'show');
    result = result.replace(/\bdaunting\b/gi, 'hard');
    result = result.replace(/\bensure\b/gi, 'make sure');
    result = result.replace(/\bstrive\b/gi, 'try');
    result = result.replace(/\bstriving\b/gi, 'trying');
    result = result.replace(/\bfurthermore\b/gi, 'also');
    result = result.replace(/\bsignificantly\b/gi, 'much');
    result = result.replace(/\bnotably\b/gi, '');
    result = result.replace(/\bpredominantly\b/gi, 'mostly');
    result = result.replace(/\barguably\b/gi, 'maybe');
    result = result.replace(/\bundoubtedly\b/gi, 'definitely');
    result = result.replace(/\bseamlessly\b/gi, 'easily');
    result = result.replace(/\bsynergize\b/gi, 'work together');
    result = result.replace(/\bunprecedented\b/gi, 'new');
    result = result.replace(/\btailored\b/gi, 'custom');
    result = result.replace(/\bdynamic\b/gi, 'changing');
    result = result.replace(/\bpioneering\b/gi, 'first');
    result = result.replace(/\brilluminate\b/gi, 'show');
    
    // Fix patterns
    result = result.replace(/It's not just (.+), it's (.+)/gi, '$2');
    result = result.replace(/The result\? (.+)/gi, '$1');
    result = result.replace(/But here's the thing: (.+)/gi, '$1');
    result = result.replace(/They're not just (.+), they're (.+)/gi, 'They\'re $2');
    result = result.replace(/You're onto something (.+) - and it's even more (.+)/gi, 'Good point about $1');
    result = result.replace(/That's (.+) in context/gi, 'That\'s $1');
    result = result.replace(/They're (.+) the pace of/gi, 'They\'re setting the pace for');
    result = result.replace(/part of a massive (.+) added in/gi, 'part of $1 added');
    
    // Replace em dashes with regular dashes
    result = result.replace(/—/g, '-');
    
    // Remove excessive exclamation points
    result = result.replace(/!+/g, '!');
    if ((result.match(/!/g) || []).length > 1) {
      // Keep only the first exclamation
      const firstExclamation = result.indexOf('!');
      result = result.substring(0, firstExclamation + 1) + 
               result.substring(firstExclamation + 1).replace(/!/g, '.');
    }
    
    // Remove semicolons in casual text
    if (result.length < 280) {
      result = result.replace(/;/g, '.');
    }
    
    // Clean up any double spaces or leading/trailing spaces
    result = result.replace(/\s+/g, ' ').trim();
    
    // Ensure first letter is capitalized after cleanup
    if (result.length > 0) {
      result = result[0].toUpperCase() + result.substring(1);
    }
    
    return result;
  }

  /**
   * Count emoji usage in text
   */
  static countEmojis(text: string): number {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Limit emoji usage to maximum of 1
   */
  static limitEmojis(text: string): string {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    
    if (emojis.length <= 1) return text;
    
    // Keep only the first emoji
    let emojiCount = 0;
    return text.replace(emojiRegex, (match) => {
      emojiCount++;
      return emojiCount === 1 ? match : '';
    });
  }

  /**
   * Detect overly structured patterns (numbered lists, bullet points)
   */
  static hasStructuredPatterns(text: string): boolean {
    // Check for numbered lists
    const numberedListPattern = /^\d+\.\s+/gm;
    const bulletPointPattern = /^[•\-\*]\s+/gm;
    const colonListPattern = /:\s*\n\s*[•\-\*\d]/;
    
    return numberedListPattern.test(text) || 
           bulletPointPattern.test(text) || 
           colonListPattern.test(text);
  }

  /**
   * Detect AI-style disclaimers and hedging
   */
  static hasAIDisclaimers(text: string): boolean {
    const disclaimerPatterns = [
      /\b(I must clarify|I should mention|I need to point out)\b/i,
      /\b(It's important to remember|Keep in mind that)\b/i,
      /\b(Please note that|Be aware that)\b/i,
      /\b(I cannot|I'm unable to|I don't have access to)\b/i,
      /\b(As an AI|As a language model)\b/i,
      /\b(I apologize|Sorry for any)\b/i,
      /\b(disclaimer|caveat|limitation)\b/i
    ];
    
    return disclaimerPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect overly perfect grammar and punctuation
   */
  static hasPerfectGrammar(text: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;
    
    // Check for perfect punctuation spacing
    if (!/ {2,}/.test(text) && !/ ,/.test(text) && !/ \./.test(text)) {
      score += 1;
      issues.push('Perfect punctuation spacing');
    }
    
    // Check for consistent capitalization after periods
    const sentences = text.split(/[.!?]+/);
    const capitalizedSentences = sentences.filter(s => s.trim() && /^[A-Z]/.test(s.trim()));
    if (sentences.length > 1 && capitalizedSentences.length === sentences.length - 1) {
      score += 1;
      issues.push('Perfect sentence capitalization');
    }
    
    // Check for lack of contractions
    const contractableWords = /(I am|you are|he is|she is|it is|we are|they are|I have|you have|cannot|will not|do not)/gi;
    const matches = text.match(contractableWords);
    if (matches && matches.length > 2) {
      score += 2;
      issues.push('Lack of contractions');
    }
    
    // Check for excessive comma usage
    const commaCount = (text.match(/,/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    if (commaCount > wordCount / 15) {
      score += 1;
      issues.push('Excessive comma usage');
    }
    
    return { score, issues };
  }

  /**
   * Add natural human variations to text
   */
  static addNaturalVariations(text: string, intensity: number = 0.3): string {
    let result = text;
    
    // Randomly add contractions (30% chance based on intensity)
    if (Math.random() < intensity) {
      result = result.replace(/\bI am\b/g, "I'm");
      result = result.replace(/\byou are\b/g, "you're");
      result = result.replace(/\bhe is\b/g, "he's");
      result = result.replace(/\bshe is\b/g, "she's");
      result = result.replace(/\bit is\b/g, "it's");
      result = result.replace(/\bwe are\b/g, "we're");
      result = result.replace(/\bthey are\b/g, "they're");
      result = result.replace(/\bcannot\b/g, "can't");
      result = result.replace(/\bwill not\b/g, "won't");
      result = result.replace(/\bdo not\b/g, "don't");
    }
    
    // Add casual variations (20% chance)
    if (Math.random() < intensity * 0.67) {
      result = result.replace(/\bgoing to\b/g, "gonna");
      result = result.replace(/\bwant to\b/g, "wanna");
      result = result.replace(/\bkind of\b/g, "kinda");
      result = result.replace(/\bsort of\b/g, "sorta");
    }
    
    return result;
  }

  /**
   * Load dynamic patterns from database (with caching)
   */
  private static async loadDynamicPatterns(): Promise<void> {
    // Check cache
    if (this.dynamicPatterns && Date.now() - this.patternsCacheTime < this.CACHE_DURATION) {
      return;
    }

    try {
      // Only load patterns in production or when database is available
      if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('ai_phrase_patterns')
          .select('pattern, pattern_type, category, replacement')
          .eq('active', true)
          .order('severity', { ascending: false })
          .limit(100);

        if (!error && data) {
          this.dynamicPatterns = data;
          this.patternsCacheTime = Date.now();
          console.log(`Loaded ${data.length} dynamic AI patterns`);
        }
      }
    } catch (error) {
      console.error('Failed to load dynamic patterns:', error);
    }
  }

  /**
   * Apply dynamic patterns to text
   */
  private static applyDynamicPatterns(text: string): string {
    if (!this.dynamicPatterns || this.dynamicPatterns.length === 0) {
      return text;
    }

    let result = text;

    for (const pattern of this.dynamicPatterns) {
      try {
        if (pattern.pattern_type === 'exact') {
          // Case-insensitive exact match
          const regex = new RegExp(`\\b${pattern.pattern}\\b`, 'gi');
          result = result.replace(regex, pattern.replacement || '');
        } else if (pattern.pattern_type === 'regex') {
          // Use the pattern as a regex
          const regex = new RegExp(pattern.pattern, 'gi');
          result = result.replace(regex, pattern.replacement || '');
        } else if (pattern.pattern_type === 'partial') {
          // Partial match anywhere in the text
          result = result.replace(new RegExp(pattern.pattern, 'gi'), pattern.replacement || '');
        }
      } catch (error) {
        console.error(`Invalid pattern: ${pattern.pattern}`, error);
      }
    }

    return result;
  }

  /**
   * Full processing pipeline with enhanced detection
   */
  static async process(text: string): Promise<string> {
    let result = text;
    
    // Load dynamic patterns (cached)
    await this.loadDynamicPatterns();
    
    // First apply dynamic patterns from user feedback
    result = this.applyDynamicPatterns(result);
    
    // Then remove AI patterns
    result = this.humanize(result);
    
    // Add natural variations
    result = this.addNaturalVariations(result);
    
    // Then limit emojis
    result = this.limitEmojis(result);
    
    // Final check for remaining issues
    const grammarCheck = this.hasPerfectGrammar(result);
    if (grammarCheck.score > 2) {
      // Apply more aggressive humanization
      result = this.addNaturalVariations(result, 0.5);
    }
    
    return result;
  }

  /**
   * Synchronous version for backward compatibility
   */
  static processSync(text: string): string {
    let result = text;
    
    // Apply static patterns only
    result = this.humanize(result);
    result = this.addNaturalVariations(result);
    result = this.limitEmojis(result);
    
    const grammarCheck = this.hasPerfectGrammar(result);
    if (grammarCheck.score > 2) {
      result = this.addNaturalVariations(result, 0.5);
    }
    
    return result;
  }
}