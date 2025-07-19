export interface User {
  id: string;
  email: string;
  plan?: 'free' | 'basic' | 'pro' | 'business';
}

export interface UserPlan {
  name: string;
  max_tweet_length: number;
  max_response_idea_length: number;
  max_reply_length: number;
  enable_long_replies: boolean;
  enable_style_matching: boolean;
  enable_perplexity_guidance: boolean;
  enable_memes: boolean;
  enable_write_like_me: boolean;
  meme_limit: number;
  memes_used: number;
  suggestion_limit: number;
  suggestions_used: number;
  reply_limit: number;
  replies_used: number;
}

export interface UsageLimits {
  repliesRemaining: number;
  repliesTotal: number;
  suggestionsRemaining: number;
  suggestionsTotal: number;
  memesRemaining: number;
  memesTotal: number;
  dailyCount?: number;
  dailyGoal?: number;
  userPlan?: UserPlan;
}

export interface GenerateReplyRequest {
  originalTweet: string;
  responseIdea: string;
  responseType: 'agree' | 'disagree' | 'neutral' | 'other';
  tone: string;
  replyLength?: 'short' | 'medium' | 'long' | 'extra-long';
  needsResearch?: boolean;
  perplexityGuidance?: string;
  includeMeme?: boolean;
  memeText?: string;
  memeTextMode?: 'tweet' | 'reply' | 'custom';
  useCustomStyle?: boolean;
  enableStyleMatching?: boolean;
}

export interface GenerateReplyResponse {
  reply: string;
  tokens: number;
}

export interface SuggestionsResponse {
  suggestions: string[];
}

export interface ChromeMessage {
  action: 'generateReply' | 'getSuggestions' | 'getSuggestResearch' | 'generateMeme' | 'checkAuth' | 'getUsageLimits' | 'openLogin' | 'authStateChanged' | 'updateDailyGoal' | 'checkForCelebration' | 'triggerPopupCelebration' | 'showCelebration' | 'submitCorrection';
  data?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  token?: string;
}