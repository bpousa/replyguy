import { MEME_PATTERNS } from './meme-patterns';
import { Tone } from './types';

// Track recently used memes to avoid repetition
const recentMemes = new Map<string, string[]>();
const RECENT_MEME_LIMIT = 10;

/**
 * Enhanced meme text generator with more creativity and less repetition
 */
export function generateMemeTextV2(reply: string, tone: Tone, userId?: string): string {
  const replyLower = reply.toLowerCase();
  const userKey = userId || 'anonymous';
  
  // Get user's recent memes to avoid
  const userRecentMemes = recentMemes.get(userKey) || [];
  
  // Extract key concepts from the reply for more creative matching
  const concepts = extractConcepts(reply);
  
  // Generate multiple candidates
  const candidates: string[] = [];
  
  // 1. Pattern-based candidates (existing logic but with variations)
  if (replyLower.includes('friday') && (replyLower.includes('deploy') || replyLower.includes('release'))) {
    candidates.push(
      'i too like to live dangerously',
      'deploy on friday what could go wrong',
      'friday deploys y u no wait till monday',
      'brace yourself friday deployment is coming'
    );
  }
  
  if (replyLower.includes('bug') || replyLower.includes('debug')) {
    candidates.push(
      'bugs everywhere',
      'y u no work',
      'not sure if feature or bug',
      'one does not simply fix all bugs',
      'debugging be like finding a needle in a haystack',
      'that moment when the bug was a feature',
      'fixed one bug created two more'
    );
  }
  
  // 2. Concept-based generation (more creative)
  concepts.forEach(concept => {
    switch(concept) {
      case 'success':
      case 'win':
      case 'achievement':
        candidates.push(
          'success kid approves',
          'nailed it',
          'mission accomplished',
          'like a boss'
        );
        break;
      
      case 'fail':
      case 'error':
      case 'mistake':
        candidates.push(
          'task failed successfully',
          'this is fine',
          'i have made a huge mistake',
          'well that escalated quickly'
        );
        break;
      
      case 'waiting':
      case 'slow':
      case 'loading':
        candidates.push(
          'still waiting',
          'ain\'t nobody got time for that',
          'waiting skeleton meme here',
          'it\'s been 84 years'
        );
        break;
    }
  });
  
  // 3. Tone-based with more variety
  const toneBasedMemes = getToneBasedMemes(tone, concepts);
  candidates.push(...toneBasedMemes);
  
  // 4. AI-style generation using reply keywords
  const aiGeneratedOptions = generateAIStyleMemes(reply, tone);
  candidates.push(...aiGeneratedOptions);
  
  // 5. Filter out recently used memes
  const freshCandidates = candidates.filter(meme => !userRecentMemes.includes(meme));
  
  // If all candidates were recently used, use all candidates anyway
  const finalCandidates = freshCandidates.length > 0 ? freshCandidates : candidates;
  
  // Pick a random one
  const selected = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  
  // Track this selection
  updateRecentMemes(userKey, selected);
  
  return selected || 'this is fine'; // Fallback
}

/**
 * Extract key concepts from the reply for better meme matching
 */
function extractConcepts(reply: string): string[] {
  const concepts: string[] = [];
  const lower = reply.toLowerCase();
  
  // Success/failure concepts
  if (lower.match(/\b(work|works|working|fixed|solved|success|win|great)\b/)) {
    concepts.push('success');
  }
  if (lower.match(/\b(fail|failed|failing|broken|error|wrong|bad)\b/)) {
    concepts.push('fail');
  }
  
  // Time-based concepts
  if (lower.match(/\b(wait|waiting|slow|loading|forever|hours|days)\b/)) {
    concepts.push('waiting');
  }
  if (lower.match(/\b(fast|quick|instant|immediately|now)\b/)) {
    concepts.push('speed');
  }
  
  // Emotion concepts
  if (lower.match(/\b(angry|mad|furious|rage|hate)\b/)) {
    concepts.push('anger');
  }
  if (lower.match(/\b(happy|joy|excited|love|awesome)\b/)) {
    concepts.push('happiness');
  }
  
  return concepts;
}

/**
 * Get tone-based memes with more variety
 */
function getToneBasedMemes(tone: Tone, concepts: string[]): string[] {
  const memes: string[] = [];
  
  switch(tone) {
    case 'sarcastic':
      memes.push(
        'this is fine',
        'oh really tell me more',
        'what could go wrong',
        'sure that will work',
        'seems legit',
        'doubt',
        'press x to doubt',
        'visible confusion'
      );
      break;
      
    case 'humorous':
    case 'witty':
      memes.push(
        'why not both',
        'shut up and take my money',
        'but that\'s none of my business',
        'is this a pigeon',
        'distracted boyfriend meme',
        'expanding brain meme',
        'drake meme format'
      );
      break;
      
    case 'professional':
    case 'formal':
      memes.push(
        'one does not simply ' + extractKeyPhrase(concepts),
        'i should ' + extractKeyPhrase(concepts),
        'not sure if serious or',
        'the most interesting man in the world'
      );
      break;
  }
  
  return memes;
}

/**
 * Generate AI-style meme text based on reply content
 */
function generateAIStyleMemes(reply: string, tone: Tone): string[] {
  const memes: string[] = [];
  const words = reply.toLowerCase().split(/\s+/);
  
  // Template-based generation
  if (words.length > 5) {
    const keyWord = findMostInterestingWord(words);
    memes.push(
      `${keyWord} everywhere`,
      `y u no ${keyWord}`,
      `one does not simply ${keyWord}`,
      `not sure if ${keyWord} or just me`,
      `but why ${keyWord}`,
      `${keyWord} all the things`
    );
  }
  
  // Reaction-based
  if (tone === 'sarcastic' || tone === 'humorous') {
    memes.push(
      'i\'m not saying it\'s ' + findMostInterestingWord(words) + ' but',
      'that moment when ' + words.slice(0, 3).join(' '),
      'me trying to understand ' + findMostInterestingWord(words)
    );
  }
  
  return memes;
}

function findMostInterestingWord(words: string[]): string {
  const boring = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are'];
  const interesting = words.filter(w => w.length > 3 && !boring.includes(w));
  return interesting[Math.floor(Math.random() * interesting.length)] || 'this';
}

function extractKeyPhrase(concepts: string[]): string {
  if (concepts.includes('success')) return 'succeed at everything';
  if (concepts.includes('fail')) return 'fix this mess';
  if (concepts.includes('waiting')) return 'wait patiently';
  return 'understand this';
}

/**
 * Track recent memes to avoid repetition
 */
function updateRecentMemes(userId: string, meme: string) {
  const userMemes = recentMemes.get(userId) || [];
  userMemes.unshift(meme);
  
  // Keep only recent ones
  if (userMemes.length > RECENT_MEME_LIMIT) {
    userMemes.pop();
  }
  
  recentMemes.set(userId, userMemes);
}

// Export both versions
export { generateMemeText } from './meme-generator';
export { generateMemeTextV2 as generateCreativeMemeText };