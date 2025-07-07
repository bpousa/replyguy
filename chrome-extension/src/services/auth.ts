import { AuthState } from '@/types';
import { apiService } from './api';

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
  };

  async checkSupabaseSession(): Promise<AuthState> {
    try {
      console.log('[Auth] Checking Supabase session...');
      
      // Get all cookies from appendment.com domain
      const cookies = await chrome.cookies.getAll({
        domain: '.appendment.com'
      });
      
      console.log('[Auth] Found cookies:', cookies.map(c => ({
        name: c.name,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite
      })));

      // Look for Supabase auth token with exact pattern
      // Format: sb-<project-ref>-auth-token or sb-<project-ref>-auth-token.0
      const projectRef = 'aaplsgskmoeyvvedjzxp';
      const authTokenName = `sb-${projectRef}-auth-token`;
      
      // Find all auth token parts (chunked cookies)
      const authTokenParts = cookies.filter(c => 
        c.name === authTokenName || c.name.startsWith(`${authTokenName}.`)
      ).sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('[Auth] Auth token parts found:', authTokenParts.length);
      
      if (authTokenParts.length === 0) {
        console.log('[Auth] No auth token found');
        return { isAuthenticated: false };
      }
      
      // Reconstruct token from parts if chunked
      let accessToken = '';
      if (authTokenParts.length === 1) {
        accessToken = authTokenParts[0].value;
      } else {
        // Chunked cookie - reconstruct
        accessToken = authTokenParts.map(p => p.value).join('');
      }
      
      console.log('[Auth] Token reconstructed, length:', accessToken.length);

      // Instead of using Bearer token, we'll check session directly
      try {
        // Call a simple endpoint that just checks if user is authenticated
        const response = await fetch('https://replyguy.appendment.com/api/auth/extension', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
          }
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
              },
              token: accessToken
            };
            
            // Set token for other API calls
            apiService.setToken(accessToken);
            
            console.log('[Auth] Authentication successful');
            return this.authState;
          }
        }
      } catch (error) {
        console.error('[Auth] Session check error:', error);
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