import { MEME_PATTERNS } from './meme-patterns';
import { Tone } from './types';

/**
 * Generate appropriate meme text based on the reply content and tone
 * This is used when the user doesn't provide custom meme text
 */
export function generateMemeText(reply: string, tone: Tone): string {
  const replyLower = reply.toLowerCase();
  
  // Friday deployment detection
  if (replyLower.includes('friday') && (replyLower.includes('deploy') || replyLower.includes('release') || replyLower.includes('push'))) {
    return 'i too like to live dangerously';
  }
  
  // Bug/debugging related
  if (replyLower.includes('bug') || replyLower.includes('debug')) {
    const bugMemes = [
      'bugs everywhere',
      'y u no work',
      'not sure if feature or bug',
      'one does not simply fix all bugs'
    ];
    return bugMemes[Math.floor(Math.random() * bugMemes.length)];
  }
  
  // Meeting related
  if (replyLower.includes('meeting') || replyLower.includes('zoom') || replyLower.includes('teams')) {
    return 'this meeting should have been an email';
  }
  
  // Testing/production
  if (replyLower.includes('test') && replyLower.includes('production')) {
    return 'i don\'t always test but when i do it\'s in production';
  }
  
  // Documentation
  if (replyLower.includes('documentation') || replyLower.includes('docs')) {
    return 'ain\'t nobody got time for that';
  }
  
  // Tone-based selections
  switch (tone) {
    case 'sarcastic':
      const sarcasticMemes = [
        'this is fine',
        'oh really tell me more',
        'what could go wrong',
        'sure that will work'
      ];
      return sarcasticMemes[Math.floor(Math.random() * sarcasticMemes.length)];
      
    case 'humorous':
    case 'witty':
      const funnyMemes = [
        'why not both',
        'shut up and take my money',
        'x all the things',
        'but that\'s none of my business'
      ];
      return funnyMemes[Math.floor(Math.random() * funnyMemes.length)];
      
    case 'friendly':
      return 'shut up and take my money';
      
    case 'formal':
      return 'one does not simply proceed without proper authorization';
      
    default:
      // Fallback: pick a random safe pattern
      const safeMemes = [
        'one does not simply ' + extractKeyPhrase(reply),
        'not sure if ' + extractKeyPhrase(reply) + ' or just me',
        extractKeyPhrase(reply) + ' everywhere'
      ];
      return safeMemes[Math.floor(Math.random() * safeMemes.length)];
  }
}

/**
 * Extract a key phrase from the reply for meme generation
 */
function extractKeyPhrase(reply: string): string {
  // Remove common words and get the most meaningful phrase
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were'];
  
  const words = reply.toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .split(' ')
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  if (words.length === 0) {
    return 'this';
  }
  
  // Return the most interesting word/phrase
  return words[0];
}

/**
 * Validate if the meme text follows a known pattern
 * This helps ensure the text will work with Imgflip
 */
export function validateMemeText(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }
  
  if (text.length > 100) {
    return false;
  }
  
  // Check if it follows any known pattern
  const lowerText = text.toLowerCase();
  return MEME_PATTERNS.some(({ pattern }) => {
    const regex = pattern
      .replace(/X/g, '.+')
      .replace(/Y/g, '.+')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    return new RegExp(regex, 'i').test(lowerText);
  });
}

/**
 * Get meme suggestions based on context
 */
export function getMemeSuggestions(reply: string, tone: Tone): string[] {
  const suggestions: string[] = [];
  const replyLower = reply.toLowerCase();
  
  // Context-based suggestions
  if (replyLower.includes('friday')) {
    suggestions.push('i too like to live dangerously');
  }
  
  if (replyLower.includes('bug')) {
    suggestions.push('bugs everywhere');
  }
  
  // Tone-based suggestions
  if (tone === 'sarcastic') {
    suggestions.push('this is fine');
  }
  
  // Add some random patterns if we don't have enough
  if (suggestions.length < 3) {
    const randomPatterns = [
      'one does not simply',
      'not sure if',
      'y u no',
      'but that\'s none of my business'
    ];
    
    randomPatterns.forEach(pattern => {
      if (!suggestions.includes(pattern) && suggestions.length < 3) {
        suggestions.push(pattern);
      }
    });
  }
  
  return suggestions.slice(0, 3);
}