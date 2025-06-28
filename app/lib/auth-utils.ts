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