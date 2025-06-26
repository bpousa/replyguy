/**
 * Imgflip Automeme Patterns
 * 
 * These patterns have been tested to work reliably with Imgflip's automeme API.
 * The AI should generate meme text following these patterns for best results.
 */

export const MEME_PATTERNS = [
  {
    pattern: "one does not simply X",
    example: "one does not simply deploy on friday",
    usage: "For pointing out something that's harder than it seems"
  },
  {
    pattern: "i don't always X, but when I do Y",
    example: "i don't always test my code, but when I do it's in production",
    usage: "For ironic or unexpected behaviors"
  },
  {
    pattern: "X, X everywhere",
    example: "bugs, bugs everywhere",
    usage: "When something is overwhelming or omnipresent"
  },
  {
    pattern: "not sure if X or Y",
    example: "not sure if feature or bug",
    usage: "For expressing confusion between two possibilities"
  },
  {
    pattern: "X y u no Y",
    example: "code y u no work",
    usage: "Frustrated questioning of why something doesn't work"
  },
  {
    pattern: "y u no X",
    example: "y u no commit your changes",
    usage: "Simpler frustrated questioning"
  },
  {
    pattern: "brace yourself X",
    example: "brace yourself merge conflicts are coming",
    usage: "Warning about something incoming"
  },
  {
    pattern: "X all the Y",
    example: "refactor all the code",
    usage: "Enthusiastic or excessive action"
  },
  {
    pattern: "X that would be great",
    example: "if you could fix that bug that would be great",
    usage: "Passive-aggressive requests"
  },
  {
    pattern: "X too damn Y",
    example: "the build time is too damn high",
    usage: "Complaining about excess"
  },
  {
    pattern: "yo dawg X",
    example: "yo dawg I heard you like bugs so I put a bug in your bugfix",
    usage: "Recursive or meta humor"
  },
  {
    pattern: "X gonna have a bad time",
    example: "if you deploy without testing you're gonna have a bad time",
    usage: "Warning about consequences"
  },
  {
    pattern: "am I the only one around here X",
    example: "am I the only one around here who writes tests",
    usage: "Expressing frustration about being alone in good practices"
  },
  {
    pattern: "what if I told you X",
    example: "what if I told you the bug was a feature",
    usage: "Revealing surprising truths"
  },
  {
    pattern: "X ain't nobody got time for that",
    example: "documentation ain't nobody got time for that",
    usage: "Dismissing time-consuming tasks"
  },
  {
    pattern: "X I guarantee it",
    example: "this will break in production I guarantee it",
    usage: "Confident predictions"
  },
  {
    pattern: "X annnnd it's gone",
    example: "deployed to production annnnd it's gone",
    usage: "Things disappearing or breaking quickly"
  },
  {
    pattern: "X bats an eye Y loses their minds",
    example: "add a bug nobody bats an eye remove a feature everyone loses their minds",
    usage: "Double standards or ironic reactions"
  },
  {
    pattern: "back in my day X",
    example: "back in my day we debugged with print statements",
    usage: "Nostalgic or 'old-timer' perspectives"
  },
  {
    pattern: "X but that's none of my business",
    example: "they deployed on friday but that's none of my business",
    usage: "Passive-aggressive observations"
  },
  {
    pattern: "you get X you get X everybody gets X",
    example: "you get a bug you get a bug everybody gets a bug",
    usage: "Everyone receiving the same thing (often negative)"
  }
];

/**
 * Helper function to get a random meme pattern
 */
export function getRandomMemePattern() {
  return MEME_PATTERNS[Math.floor(Math.random() * MEME_PATTERNS.length)];
}

/**
 * Helper function to validate if text follows a known pattern
 */
export function followsMemePattern(text: string): boolean {
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