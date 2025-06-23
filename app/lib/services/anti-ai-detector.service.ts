/**
 * Anti-AI Pattern Detection Service
 * Detects and removes common AI writing patterns to make replies sound more human
 */

export class AntiAIDetector {
  // Banned words and phrases
  private static readonly BANNED_TRANSITIONS = [
    'Moreover', 'Furthermore', 'Additionally', 'Indeed', 'Notably',
    'However', 'Nevertheless', 'Nonetheless',
    'Consequently', 'Therefore', 'Thus', 'Hence', 'Accordingly',
    'In conclusion', 'In summary', 'To summarize',
    'It is worth noting', 'It should be noted',
    'One might argue', 'One could say',
    'Firstly', 'Secondly', 'Subsequently',
    'In essence', 'Essentially', 'Fundamentally'
  ];

  private static readonly BANNED_OPENINGS = [
    'Great point!', 'Excellent question!',
    'I think', 'I believe',
    'Absolutely!', 'Definitely!',
    'Interesting', 'Fascinating',
    'Fair enough', "That's true",
    'Well,', 'So,', 'Oh,', 'Ah,',
    "Let's dive in", "Let's explore", "Let's delve into",
    'Indeed,', 'Certainly,'
  ];

  private static readonly BANNED_CLICHES = [
    'Unlock', 'Unleash', 'the potential', 'the power of',
    'Revolutionary', 'Game-changer', 'Cutting-edge', 'State-of-the-art',
    'Leverage', 'Optimize', 'Facilitate', 'Streamline',
    'Paradigm shift', 'Synergy', 'Best practices',
    'Robust', 'Comprehensive', 'Innovative', 'Dynamic',
    'Seamless', 'Transformative', 'Groundbreaking',
    'Delve into', 'Navigate the complexities',
    "In today's digital age", 'In the modern era',
    'At the forefront', 'Pave the way',
    'Harness the power', 'Capitalize on',
    'Foster a culture', 'Drive innovation',
    "It's important to note that",
    'Rest assured', 'Look no further'
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
    'Myriad', 'Plethora', 'Multifaceted'
  ];

  private static readonly BANNED_PATTERNS = [
    /It's not just .+, it's .+/gi,
    /The result\? .+/gi,
    /But here's the thing: .+/gi,
    /Whether it's .+, .+, or .+/gi,
    /From .+ to .+, .+/gi
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
    result = result.replace(/seamless/gi, 'smooth');
    result = result.replace(/delve into/gi, 'look at');
    
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
    
    // Fix patterns
    result = result.replace(/It's not just (.+), it's (.+)/gi, '$2');
    result = result.replace(/The result\? (.+)/gi, '$1');
    result = result.replace(/But here's the thing: (.+)/gi, '$1');
    
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
   * Full processing pipeline
   */
  static process(text: string): string {
    let result = text;
    
    // First remove AI patterns
    result = this.humanize(result);
    
    // Then limit emojis
    result = this.limitEmojis(result);
    
    return result;
  }
}