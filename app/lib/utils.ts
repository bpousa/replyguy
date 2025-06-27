import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function truncateTweet(tweet: string, maxLength: number = 100): string {
  if (tweet.length <= maxLength) return tweet;
  return tweet.substring(0, maxLength - 3) + '...';
}

export function validateTweet(tweet: string, maxLength: number = 500): { valid: boolean; error?: string } {
  if (!tweet || tweet.trim().length === 0) {
    return { valid: false, error: 'Tweet cannot be empty' };
  }
  
  if (tweet.length > maxLength) {
    return { valid: false, error: `Tweet is too long (max ${maxLength} characters for context)` };
  }
  
  return { valid: true };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/\s+/g, ' '); // Normalize whitespace
}

export function extractHashtags(tweet: string): string[] {
  const hashtags = tweet.match(/#\w+/g) || [];
  return hashtags.map(tag => tag.toLowerCase());
}

export function extractMentions(tweet: string): string[] {
  const mentions = tweet.match(/@\w+/g) || [];
  return mentions;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}