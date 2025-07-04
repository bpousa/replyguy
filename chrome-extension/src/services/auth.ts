import { AuthState } from '@/types';
import { apiService } from './api';

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
  };

  async checkSupabaseSession(): Promise<AuthState> {
    try {
      // Get Supabase session cookies
      const cookies = await chrome.cookies.getAll({
        domain: '.appendment.com'
      });

      const accessToken = cookies.find(c => c.name === 'sb-access-token')?.value;
      const refreshToken = cookies.find(c => c.name === 'sb-refresh-token')?.value;

      if (!accessToken) {
        return { isAuthenticated: false };
      }

      // Set token for API service
      apiService.setToken(accessToken);

      // Verify token by fetching user
      const user = await apiService.getCurrentUser();

      this.authState = {
        isAuthenticated: true,
        user,
        token: accessToken,
      };

      return this.authState;
    } catch (error) {
      console.error('Auth check failed:', error);
      return { isAuthenticated: false };
    }
  }

  async waitForLogin(): Promise<AuthState> {
    // Open Reply Guy login page
    chrome.tabs.create({
      url: 'https://replyguy.appendment.com/login?extension=true'
    });

    // Poll for auth cookies
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const state = await this.checkSupabaseSession();
        if (state.isAuthenticated) {
          clearInterval(checkInterval);
          resolve(state);
        }
      }, 2000); // Check every 2 seconds

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve({ isAuthenticated: false });
      }, 300000);
    });
  }

  getAuthState(): AuthState {
    return this.authState;
  }

  async logout() {
    // Clear auth state
    this.authState = { isAuthenticated: false };
    
    // Remove cookies
    const cookies = await chrome.cookies.getAll({
      domain: '.appendment.com'
    });

    for (const cookie of cookies) {
      if (cookie.name.startsWith('sb-')) {
        await chrome.cookies.remove({
          url: `https://${cookie.domain}${cookie.path}`,
          name: cookie.name,
        });
      }
    }
  }
}

export const authService = new AuthService();