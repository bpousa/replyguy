import { 
  GenerateReplyRequest, 
  GenerateReplyResponse, 
  UsageLimits,
  UserPlan,
  User 
} from '../types';

const API_BASE_URL = 'https://replyguy.appendment.com/api';

class APIService {
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated');
      }
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('[API] Error response:', errorData);
      
      // If there are validation details, include them in the error message
      if (errorData.details) {
        const detailsStr = JSON.stringify(errorData.details);
        throw new Error(`${errorData.error}: ${detailsStr}`);
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async generateReply(request: GenerateReplyRequest): Promise<GenerateReplyResponse> {
    return this.fetchWithAuth('/process', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSuggestions(params: { 
    tweet: string; 
    responseType?: string; 
    tone?: string 
  }): Promise<{ suggestion: string }> {
    return this.fetchWithAuth('/suggest', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getSuggestResearch(params: {
    originalTweet: string;
    responseIdea: string;
    responseType: string;
    tone: string;
  }): Promise<{ suggestions: string[] }> {
    return this.fetchWithAuth('/suggest-research', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async generateMeme(params: {
    memeTextSource: 'tweet' | 'reply' | 'custom';
    originalTweet?: string;
    generatedReply?: string;
    customText?: string;
    enhance?: boolean;
  }): Promise<{ imageUrl: string; pageUrl: string }> {
    return this.fetchWithAuth('/meme/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getUsageLimits(): Promise<UsageLimits> {
    try {
      const response = await this.fetchWithAuth('/check-limits', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      const { limits } = response;
      
      const userPlan: UserPlan = {
        name: limits.plan_name || 'Free',
        max_tweet_length: limits.max_tweet_length || 280,
        max_response_idea_length: limits.max_response_idea_length || 200,
        max_reply_length: limits.max_reply_length || 280,
        enable_long_replies: limits.enable_long_replies || false,
        enable_style_matching: limits.enable_style_matching || false,
        enable_perplexity_guidance: limits.enable_perplexity_guidance || false,
        enable_memes: limits.enable_memes || false,
        enable_write_like_me: limits.enable_write_like_me || false,
        meme_limit: limits.meme_limit || 0,
        memes_used: limits.memes_used || 0,
        suggestion_limit: limits.suggestion_limit || 0,
        suggestions_used: limits.suggestions_used || 0,
        reply_limit: limits.reply_limit || 10,
        replies_used: limits.replies_used || 0,
      };
      
      return {
        repliesRemaining: limits.repliesRemaining,
        repliesTotal: limits.reply_limit,
        suggestionsRemaining: limits.suggestionsRemaining,
        suggestionsTotal: limits.suggestion_limit,
        memesRemaining: limits.memesRemaining,
        memesTotal: limits.meme_limit,
        dailyCount: limits.dailyCount,
        dailyGoal: limits.dailyGoal,
        userPlan
      };
    } catch (error) {
      console.error('[API] Failed to get usage limits:', error);
      // Return default free plan limits
      return {
        repliesRemaining: 10,
        repliesTotal: 10,
        suggestionsRemaining: 0,
        suggestionsTotal: 0,
        memesRemaining: 0,
        memesTotal: 0,
        userPlan: {
          name: 'Free',
          max_tweet_length: 280,
          max_response_idea_length: 200,
          max_reply_length: 280,
          enable_long_replies: false,
          enable_style_matching: false,
          enable_perplexity_guidance: false,
          enable_memes: false,
          enable_write_like_me: false,
          meme_limit: 0,
          memes_used: 0,
          suggestion_limit: 0,
          suggestions_used: 0,
          reply_limit: 10,
          replies_used: 0,
        }
      };
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.fetchWithAuth('/auth/session');
  }

  async updateDailyGoal(goal: number): Promise<{ success: boolean; dailyGoal: number }> {
    return this.fetchWithAuth('/user/daily-goal', {
      method: 'POST',
      body: JSON.stringify({ dailyGoal: goal }),
    });
  }

  async submitCorrection(params: {
    styleId?: string;
    originalTweet: string;
    responseIdea: string;
    replyType: string;
    tone: string;
    generatedReply: string;
    correctedReply: string;
    correctionNotes?: string;
  }): Promise<{ success: boolean; message: string; needsReanalysis?: boolean }> {
    return this.fetchWithAuth('/user-style/corrections', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

export const apiService = new APIService();