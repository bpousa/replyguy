import { 
  GenerateReplyRequest, 
  GenerateReplyResponse, 
  SuggestionsResponse, 
  UsageLimits,
  User 
} from '@/types';

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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async generateReply(request: GenerateReplyRequest): Promise<GenerateReplyResponse> {
    return this.fetchWithAuth('/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSuggestions(tweet: string): Promise<SuggestionsResponse> {
    return this.fetchWithAuth('/suggest', {
      method: 'POST',
      body: JSON.stringify({ tweet }),
    });
  }

  async generateMeme(text: string, context: string): Promise<{ url: string }> {
    return this.fetchWithAuth('/meme', {
      method: 'POST',
      body: JSON.stringify({ text, context }),
    });
  }

  async getUsageLimits(): Promise<UsageLimits> {
    const [limits, plan] = await Promise.all([
      this.fetchWithAuth('/check-limits'),
      this.fetchWithAuth('/user/plan'),
    ]);
    
    return {
      repliesRemaining: limits.repliesRemaining,
      repliesTotal: plan.limits.replies,
      suggestionsRemaining: limits.suggestionsRemaining,
      suggestionsTotal: plan.limits.suggestions,
      memesRemaining: limits.memesRemaining,
      memesTotal: plan.limits.memes,
    };
  }

  async getCurrentUser(): Promise<User> {
    return this.fetchWithAuth('/auth/session');
  }
}

export const apiService = new APIService();