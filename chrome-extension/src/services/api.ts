import { 
  GenerateReplyRequest, 
  GenerateReplyResponse, 
  SuggestionsResponse, 
  UsageLimits,
  User 
} from '@/types';

const API_BASE_URL = 'https://replyguy.appendment.com/api';

class APIService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
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
    return this.fetchWithAuth('/user');
  }
}

export const apiService = new APIService();