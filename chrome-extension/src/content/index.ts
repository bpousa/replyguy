import { ChromeMessage, AuthState } from '@/types';
import { TwitterIntegration } from './twitter-integration';

let twitterIntegration: TwitterIntegration | null = null;
let authState: AuthState = { isAuthenticated: false };

// Initialize on page load
async function initialize() {
  console.log('[ReplyGuy Content] Initializing on:', window.location.href);
  
  try {
    // Check authentication
    console.log('[ReplyGuy Content] Checking authentication...');
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    console.log('[ReplyGuy Content] Auth response:', response);
    
    if (response.success) {
      authState = response.data;
      console.log('[ReplyGuy Content] Auth state:', authState);
    }

    // Initialize Twitter integration if authenticated
    if (authState.isAuthenticated) {
      console.log('[ReplyGuy Content] User authenticated, initializing Twitter integration');
      twitterIntegration = new TwitterIntegration();
      twitterIntegration.initialize();
    } else {
      console.log('[ReplyGuy Content] User not authenticated');
      // Still initialize but show auth prompts instead
      twitterIntegration = new TwitterIntegration();
      twitterIntegration.initialize();
    }
  } catch (error) {
    console.error('[ReplyGuy Content] Initialization error:', error);
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