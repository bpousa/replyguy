// Core types for the ReplyGuy application

export type ResponseType = 'agree' | 'disagree' | 'neutral' | 'other';

// Subscription and plan types
export interface SubscriptionPlan {
  id: string;
  name: string;
  monthly_limit: number;
  suggestion_limit: number;
  meme_limit: number;
  max_reply_length: number;
  enable_memes: boolean;
  enable_style_matching: boolean;
  enable_write_like_me: boolean;
  enable_perplexity_guidance: boolean;
  enable_long_replies: boolean;
  enable_sentiment_boost: boolean;
  enable_humor_boost: boolean;
  enable_formality_control: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

export type Tone = 
  | 'humorous' 
  | 'professional' 
  | 'casual' 
  | 'supportive' 
  | 'witty' 
  | 'sarcastic' 
  | 'empathetic'
  | 'informative'
  | 'friendly'
  | 'formal';

export type ReplyLength = 'short' | 'medium' | 'long' | 'extra-long';

export interface UserInput {
  originalTweet: string;
  responseIdea: string;
  responseType: ResponseType;
  tone: Tone;
  needsResearch: boolean;
  replyLength?: ReplyLength;
  perplexityGuidance?: string;
  enableStyleMatching?: boolean;
  includeMeme?: boolean;
  memeText?: string;
  memeTextMode?: 'exact' | 'enhance';
  useCustomStyle?: boolean;
}

export interface ReplyType {
  id: string;
  name: string;
  category: string;
  pattern: string;
  styleRules: string;
  examples: string[];
  tags: string[];
  complexity: number;
}

export interface ProcessingContext {
  input: UserInput;
  perplexityData?: string;
  selectedReplyTypes?: ReplyType[];
  chosenReplyType?: ReplyType;
  costs: CostBreakdown;
  startTime: number;
}

export interface CostBreakdown {
  perplexityQuery?: number;
  classification: number;
  reasoning: number;
  generation: number;
  imageGeneration?: number;
  total: number;
}

export interface GeneratedReply {
  reply: string;
  replyType: string;
  cost: number;
  processingTime: number;
  perplexityData?: string;
  imageUrl?: string;
  memeUrl?: string;
  memePageUrl?: string;
  costs?: CostBreakdown;
  citations?: Array<{
    url: string;
    title?: string;
  }>;
  debugInfo?: {
    memeRequested: boolean;
    memeDecided: boolean;
    memeText?: string;
    memeSkipReason?: string;
  };
  // Metadata for feedback
  originalTweet?: string;
  responseIdea?: string;
  // Tracking status
  trackingStatus?: {
    success: boolean;
    error?: string;
    date?: string;
    timezone?: string;
  };
}

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  details?: any;
}

// Database types
export interface ReplyTypeMapping {
  id: number;
  responseType: ResponseType;
  tone: Tone;
  replyTypeId: string;
  priority: number;
  usageCount: number;
  successRate: number;
}

// Service configuration
export interface ModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ServiceConfig {
  openai: {
    apiKey: string;
    models: {
      cheap: string;
      mid: string;
      premium: string;
    };
  };
  anthropic: {
    apiKey: string;
    models: {
      cheap: string;
      mid: string;
      premium: string;
    };
  };
  perplexity: {
    apiKey: string;
  };
}