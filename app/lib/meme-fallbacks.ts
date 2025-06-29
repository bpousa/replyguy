// Popular meme texts that are known to work well with Imgflip's automeme
export const FALLBACK_MEME_TEXTS = [
  // Classic formats
  'this is fine',
  'y u no work',
  'not sure if bug or feature',
  'one does not simply',
  'shut up and take my money',
  'why not both',
  'bugs everywhere',
  'ain\'t nobody got time for that',
  'such wow much amaze',
  'i don\'t always test but when i do',
  
  // Short and simple
  'nailed it',
  'seems legit',
  'challenge accepted',
  'not bad',
  'me gusta',
  'true story',
  'forever alone',
  'close enough',
  
  // Tech/dev related
  'it works on my machine',
  'stackoverflow to the rescue',
  'undefined is not a function',
  'git push force',
  'deploy on friday',
  
  // Reactions
  'mind blown',
  'wait what',
  'oh really',
  'seriously',
  'bruh',
  'big brain time',
  'confused screaming',
  'visible confusion'
];

// Get a random fallback text
export function getRandomFallback(): string {
  return FALLBACK_MEME_TEXTS[Math.floor(Math.random() * FALLBACK_MEME_TEXTS.length)];
}

// Get fallback based on tone
export function getFallbackByTone(tone: string): string {
  const toneMap: Record<string, string[]> = {
    sarcastic: [
      'oh really',
      'sure jan',
      'seems legit',
      'this is fine',
      'y u no work'
    ],
    humorous: [
      'why not both',
      'shut up and take my money',
      'nailed it',
      'such wow much amaze'
    ],
    professional: [
      'challenge accepted',
      'one does not simply',
      'not sure if bug or feature',
      'it works on my machine'
    ],
    supportive: [
      'you got this',
      'not bad',
      'nailed it',
      'me gusta'
    ],
    critical: [
      'y u no work',
      'seriously',
      'wait what',
      'visible confusion'
    ]
  };
  
  const options = toneMap[tone] || toneMap.professional;
  return options[Math.floor(Math.random() * options.length)];
}