// Utility to help migrate from localStorage to cookie-based auth
export function migrateAuthFromLocalStorage() {
  if (typeof window === 'undefined') return;
  
  // Check if we have auth data in localStorage
  const localStorageKey = 'replyguy-auth';
  const authData = window.localStorage.getItem(localStorageKey);
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      console.log('[auth-migration] Found auth data in localStorage, will let Supabase handle migration');
      
      // Don't manually set cookies - let Supabase handle it through proper auth flow
      // The createBrowserClient with cookie support will handle this automatically
      
      // Clear localStorage after Supabase migrates to cookies
      setTimeout(() => {
        // Check if cookies were set successfully
        const hasCookies = document.cookie.includes('sb-');
        if (hasCookies) {
          console.log('[auth-migration] Cookies set successfully, clearing localStorage');
          window.localStorage.removeItem(localStorageKey);
        }
      }, 1000);
    } catch (error) {
      console.error('[auth-migration] Failed to parse localStorage auth data:', error);
    }
  }
}

// Helper to check if we have auth cookies
export function hasAuthCookies(): boolean {
  if (typeof window === 'undefined') return false;
  
  const cookies = document.cookie.split('; ');
  return cookies.some(cookie => {
    const [name] = cookie.split('=');
    return name.includes('sb-') && (
      name.includes('auth-token') ||
      name.includes('session') ||
      name.includes('access-token') ||
      name.includes('refresh-token')
    );
  });
}

// Debug helper to log all cookies
export function debugAuthCookies() {
  if (typeof window === 'undefined') return;
  
  const cookies = document.cookie.split('; ');
  const authCookies = cookies.filter(c => {
    const [name] = c.split('=');
    return name.includes('sb-') || name.includes('supabase');
  });
  
  console.log('[auth-debug] All cookies:', cookies.length);
  console.log('[auth-debug] Auth cookies:', authCookies.length);
  authCookies.forEach(cookie => {
    const [name, value] = cookie.split('=');
    console.log(`[auth-debug] ${name}: ${value?.substring(0, 20)}...`);
  });
}