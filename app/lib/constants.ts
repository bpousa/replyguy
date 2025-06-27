// Application constants

export const APP_NAME = 'ReplyGuy';
export const APP_VERSION = '1.0.0';

export const RESPONSE_TYPES = [
  { value: 'agree', label: 'Agree', description: 'Support or relate to the tweet' },
  { value: 'disagree', label: 'Disagree', description: 'Respectfully counter the point' },
  { value: 'neutral', label: 'Neutral', description: 'Add information or ask questions' },
  { value: 'other', label: 'Other', description: 'Creative or unique responses' },
] as const;

export const TONES = [
  { value: 'humorous', label: 'Humorous', emoji: '😄' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'casual', label: 'Casual', emoji: '👋' },
  { value: 'supportive', label: 'Supportive', emoji: '🤝' },
  { value: 'witty', label: 'Witty', emoji: '🎯' },
  { value: 'sarcastic', label: 'Sarcastic', emoji: '😏' },
  { value: 'empathetic', label: 'Empathetic', emoji: '❤️' },
  { value: 'informative', label: 'Informative', emoji: '📚' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'formal', label: 'Formal', emoji: '🎩' },
] as const;

export const PLACEHOLDER_TWEETS = [
  "Just spent 3 hours debugging only to find a missing semicolon 😭",
  "Why does coffee taste better on Monday mornings?",
  "Finally finished that project I've been procrastinating on for weeks!",
  "Unpopular opinion: pineapple belongs on pizza",
  "The best code is the code you don't have to write",
  "Anyone else feel like this year is flying by?",
];

export const PLACEHOLDER_IDEAS = [
  "Share a similar experience",
  "Offer encouragement",
  "Add a helpful tip",
  "Make a witty observation",
  "Ask a follow-up question",
  "Provide relevant information",
];

export const REPLY_LENGTHS = [
  { value: 'short', label: 'Short', description: 'Up to 280 characters', maxChars: 280 },
  { value: 'medium', label: 'Medium', description: 'Up to 560 characters', maxChars: 560 },
  { value: 'long', label: 'Long', description: 'Up to 1000 characters', maxChars: 1000 },
  { value: 'extra-long', label: 'Extra Long', description: 'Up to 2000 characters', maxChars: 2000 },
] as const;

export const API_ENDPOINTS = {
  classify: '/api/classify',
  research: '/api/research',
  reason: '/api/reason',
  generate: '/api/generate',
} as const;

export const COST_LIMITS = {
  daily: Number(process.env.DAILY_COST_LIMIT) || 100,
  perRequest: Number(process.env.REQUEST_COST_LIMIT) || 0.05,
} as const;

export const CACHE_DURATION = {
  classification: 3600, // 1 hour
  research: 1800, // 30 minutes
  generation: 300, // 5 minutes
} as const;

export const ERROR_MESSAGES = {
  RATE_LIMIT: 'Too many requests. Please try again later.',
  INVALID_INPUT: 'Please check your input and try again.',
  API_ERROR: 'Failed to process your request. Please try again.',
  COST_LIMIT: 'Daily cost limit reached. Please try again tomorrow.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;