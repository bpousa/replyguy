import { ChromeMessage, AuthState } from '@/types';
import { TwitterIntegration } from './twitter-integration';

let twitterIntegration: TwitterIntegration | null = null;
let authState: AuthState = { isAuthenticated: false };

// Initialize on page load
async function initialize() {
  // Check authentication
  const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
  if (response.success) {
    authState = response.data;
  }

  // Initialize Twitter integration if authenticated
  if (authState.isAuthenticated) {
    twitterIntegration = new TwitterIntegration();
    twitterIntegration.initialize();
  }
}

// Listen for auth state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'authStateChanged') {
    authState = message.data;
    
    if (authState.isAuthenticated && !twitterIntegration) {
      twitterIntegration = new TwitterIntegration();
      twitterIntegration.initialize();
    } else if (!authState.isAuthenticated && twitterIntegration) {
      twitterIntegration.cleanup();
      twitterIntegration = null;
    }
  }
});

// Handle navigation changes (Twitter is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (twitterIntegration) {
      twitterIntegration.handleUrlChange();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Start initialization
initialize();