import { AuthState } from '@/types';
import { apiService } from './api';

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
  };

  async checkSupabaseSession(): Promise<AuthState> {
    try {
      console.log('[Auth] Checking Supabase session...');
      
      // Call the auth endpoint with credentials included
      // The browser will automatically send the appropriate cookies
      const response = await fetch('https://replyguy.appendment.com/api/auth/extension', {
        method: 'GET',
        credentials: 'include' // This tells the browser to include cookies
      });
      
      console.log('[Auth] Session check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Auth] Session data:', data);
        
        // Check if authenticated
        if (data.authenticated && data.user) {
          this.authState = {
            isAuthenticated: true,
            user: {
              id: data.user.id,
              email: data.user.email
            }
          };
          
          console.log('[Auth] Authentication successful');
          return this.authState;
        }
      }

      console.log('[Auth] Authentication failed');
      return { isAuthenticated: false };
    } catch (error) {
      console.error('[Auth] Auth check failed:', error);
      return { isAuthenticated: false };
    }
  }

  async waitForLogin(): Promise<AuthState> {
    // Open Reply Guy login page
    chrome.tabs.create({
      url: 'https://replyguy.appendment.com/auth/login?extension=true'
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
    
    // Note: We can't remove httpOnly cookies from the extension
    // The user needs to logout from the main website
    console.log('[Auth] Logged out locally. Visit website to fully logout.');
  }
}

export const authService = new AuthService();