export interface User {
  id: string;
  email: string;
  plan?: 'free' | 'pro' | 'enterprise';
}

export interface UsageLimits {
  repliesRemaining: number;
  repliesTotal: number;
  suggestionsRemaining: number;
  suggestionsTotal: number;
  memesRemaining: number;
  memesTotal: number;
}

export interface GenerateReplyRequest {
  originalTweet: string;
  userInput?: string;
  tone: string;
  responseType: 'agree' | 'disagree' | 'neutral' | 'other';
}

export interface GenerateReplyResponse {
  reply: string;
  tokens: number;
}

export interface SuggestionsResponse {
  suggestions: string[];
}

export interface ChromeMessage {
  action: 'generateReply' | 'getSuggestions' | 'generateMeme' | 'checkAuth' | 'getUsageLimits' | 'openLogin' | 'authStateChanged';
  data?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  token?: string;
}