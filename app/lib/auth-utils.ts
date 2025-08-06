// Auth utility functions to help with session management

export function clearStaleAuthData() {
  // Clear any stale auth data from localStorage
  const keysToRemove = [
    'supabase.auth.token',
    'supabase-auth-token',
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to clear localStorage key:', key);
    }
  });
  
  // Clear any stale celebration flags older than today
  const today = new Date().toDateString();
  Object.keys(localStorage)
    .filter(key => key.startsWith('celebration_shown_') && !key.includes(today))
    .forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to clear celebration key:', key);
      }
    });
}

export function resetAuthState() {
  // Clear all auth-related data
  clearStaleAuthData();
  
  // Clear session storage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('Failed to clear sessionStorage');
  }
}

// Auth flow management
const AUTH_FLOW_KEY = 'auth_flow_active';
const AUTH_FLOW_START_KEY = 'auth_flow_started_at';
const AUTH_RETRY_KEY = 'auth_retry_count';
const AUTH_RETRY_TIMESTAMP_KEY = 'auth_retry_timestamp';
const MAX_AUTH_FLOW_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 8; // Reduced from 15 - faster failure detection
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

// Network detection
export function isNetworkAvailable(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Check navigator.onLine first
  if (!navigator.onLine) {
    console.log('[auth-utils] Network offline detected via navigator.onLine');
    return false;
  }
  
  return true;
}

export function startAuthFlow() {
  try {
    sessionStorage.setItem(AUTH_FLOW_KEY, 'true');
    sessionStorage.setItem(AUTH_FLOW_START_KEY, Date.now().toString());
    console.log('[auth-utils] Auth flow started');
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('auth_sync');
        channel.postMessage({ type: 'auth_flow_started' });
        channel.close();
      } catch (e) {
        // BroadcastChannel might not be supported
      }
    }
  } catch (e) {
    console.warn('[auth-utils] Failed to start auth flow:', e);
  }
}

export function endAuthFlow() {
  try {
    const wasActive = sessionStorage.getItem(AUTH_FLOW_KEY) === 'true';
    const startTime = sessionStorage.getItem(AUTH_FLOW_START_KEY);
    const retryCount = getAuthRetryCount();
    
    if (wasActive && startTime) {
      const duration = Date.now() - parseInt(startTime, 10);
      console.log(`[auth-utils] Auth flow ended - Duration: ${duration}ms, Retries: ${retryCount}`);
    }
    
    sessionStorage.removeItem(AUTH_FLOW_KEY);
    sessionStorage.removeItem(AUTH_FLOW_START_KEY);
    sessionStorage.removeItem(AUTH_RETRY_KEY);
    sessionStorage.removeItem(AUTH_RETRY_TIMESTAMP_KEY);
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('auth_sync');
        channel.postMessage({ type: 'auth_flow_ended' });
        channel.close();
      } catch (e) {
        // BroadcastChannel might not be supported
      }
    }
  } catch (e) {
    console.warn('[auth-utils] Failed to end auth flow:', e);
  }
}

export function isInAuthFlow(): boolean {
  try {
    const authFlowActive = sessionStorage.getItem(AUTH_FLOW_KEY) === 'true';
    if (!authFlowActive) return false;
    
    // Check if auth flow has exceeded max duration
    const startTime = sessionStorage.getItem(AUTH_FLOW_START_KEY);
    if (startTime) {
      const elapsed = Date.now() - parseInt(startTime, 10);
      if (elapsed > MAX_AUTH_FLOW_DURATION) {
        console.log('[auth-utils] Auth flow expired, clearing...');
        endAuthFlow();
        return false;
      }
    }
    
    return true;
  } catch (e) {
    console.warn('[auth-utils] Failed to check auth flow:', e);
    return false;
  }
}

export function getAuthRetryCount(): number {
  try {
    const count = sessionStorage.getItem(AUTH_RETRY_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (e) {
    return 0;
  }
}

export function incrementAuthRetryCount(): number {
  try {
    const currentCount = getAuthRetryCount();
    const newCount = currentCount + 1;
    sessionStorage.setItem(AUTH_RETRY_KEY, newCount.toString());
    sessionStorage.setItem(AUTH_RETRY_TIMESTAMP_KEY, Date.now().toString());
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('auth_sync');
        channel.postMessage({ type: 'retry_count_updated', count: newCount });
        channel.close();
      } catch (e) {
        // BroadcastChannel might not be supported
      }
    }
    
    return newCount;
  } catch (e) {
    console.warn('[auth-utils] Failed to increment retry count:', e);
    return 0;
  }
}

export function shouldRetryAuth(): boolean {
  // Check network first
  if (!isNetworkAvailable()) {
    console.log('[auth-utils] Skipping auth retry - network unavailable');
    return false;
  }
  
  const retryCount = getAuthRetryCount();
  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    console.log('[auth-utils] Max retry attempts reached');
    return false;
  }
  
  // Check if we're in a valid auth flow
  if (!isInAuthFlow()) {
    // Check if we're on an auth page
    if (typeof window !== 'undefined') {
      const isAuthPage = window.location.pathname.includes('/auth/verify') ||
                        window.location.pathname.includes('/auth/callback') ||
                        window.location.pathname.includes('/auth/email-confirmed') ||
                        window.location.pathname.includes('/auth/establishing-session');
      return isAuthPage && retryCount < MAX_RETRY_ATTEMPTS;
    }
    return false;
  }
  
  return true;
}

export async function clearAllAuthData() {
  console.log('[auth-utils] Clearing all auth data...');
  
  // Clear all auth-related localStorage items
  const authKeys = [
    'supabase.auth.token',
    'supabase-auth-token',
    'sb-access-token',
    'sb-refresh-token',
  ];
  
  // Find all Supabase-related keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-')) {
      authKeys.push(key);
    }
  });
  
  // Remove all auth keys
  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[auth-utils] Failed to remove localStorage key:', key);
    }
  });
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('[auth-utils] Failed to clear sessionStorage');
  }
  
  // Clear cookies if possible (requires server-side for httpOnly cookies)
  if (typeof document !== 'undefined') {
    // Clear any accessible cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      if (name.trim().includes('sb-') || name.trim().includes('supabase')) {
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      }
    });
    
    // Call server endpoint to clear httpOnly cookies
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add auth flow header if active
      if (isInAuthFlow()) {
        headers['x-auth-flow-active'] = 'true';
      } else {
        // If not in auth flow, mark as cleanup operation to allow clearing
        headers['x-cleanup-operation'] = 'true';
      }
      
      const response = await fetch('/api/auth/clear-session', {
        method: 'POST',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        console.warn('[auth-utils] Server cookie clear failed:', response.status);
      } else {
        console.log('[auth-utils] Server-side cookies cleared');
      }
    } catch (e) {
      console.warn('[auth-utils] Failed to clear server-side cookies:', e);
    }
  }
}