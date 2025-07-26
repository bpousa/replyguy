console.log('[ReplyGuy Content] Script loaded at:', new Date().toISOString(), window.location.href);

import { ChromeMessage, AuthState } from '@/types';
import { TwitterIntegration } from './twitter-integration';
import confetti from 'canvas-confetti';

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

    // Initialize Twitter integration regardless of auth status
    // Icons will show and prompt for login if not authenticated
    console.log('[ReplyGuy Content] Initializing Twitter integration');
    twitterIntegration = new TwitterIntegration();
    twitterIntegration.initialize();
  } catch (error) {
    console.error('[ReplyGuy Content] Initialization error:', error);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate that message is from our extension
  if (sender.id && sender.id !== chrome.runtime.id) {
    console.warn('[ReplyGuy Content] Rejecting message from unknown extension:', sender.id);
    return;
  }
  
  if (message.action === 'authStateChanged') {
    authState = message.data;
    console.log('[ReplyGuy Content] Auth state changed:', authState);
    
    // Clean up existing integration if any
    if (twitterIntegration) {
      twitterIntegration.cleanup();
    }
    
    // Always reinitialize TwitterIntegration to update auth status
    twitterIntegration = new TwitterIntegration();
    twitterIntegration.initialize();
  } else if (message.action === 'triggerCelebration') {
    triggerCelebration();
  }
});

function triggerCelebration() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

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