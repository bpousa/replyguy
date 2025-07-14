import { ChromeMessage } from '../types';
import { authService } from '../services/auth';
import { apiService } from '../services/api';

// Check auth on extension startup
chrome.runtime.onInstalled.addListener(async () => {
  await authService.checkSupabaseSession();
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  // Handle async responses
  (async () => {
    try {
      switch (message.action) {
        case 'checkAuth':
          const authState = await authService.checkSupabaseSession();
          sendResponse({ success: true, data: authState });
          break;

        case 'generateReply':
          const reply = await apiService.generateReply(message.data);
          sendResponse({ success: true, data: reply });
          break;

        case 'checkForCelebration':
          const limits = await apiService.getUsageLimits();
          if (limits && limits.dailyCount !== undefined && limits.dailyGoal !== undefined && limits.dailyCount >= limits.dailyGoal) {
            const today = new Date().toDateString();
            const celebrationKey = `celebration_shown_${today}`;
            chrome.storage.local.get(celebrationKey, (data) => {
              if (!data[celebrationKey]) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'triggerCelebration' });
                  }
                });
                chrome.storage.local.set({ [celebrationKey]: true });
              }
            });
          }
          sendResponse({ success: true });
          break;

        case 'getSuggestions':
          const suggestions = await apiService.getSuggestions(message.data);
          sendResponse({ success: true, data: suggestions });
          break;

        case 'getSuggestResearch':
          const researchSuggestions = await apiService.getSuggestResearch(message.data);
          sendResponse({ success: true, data: researchSuggestions });
          break;

        case 'generateMeme':
          const meme = await apiService.generateMeme(message.data);
          sendResponse({ success: true, data: meme });
          break;

        case 'getUsageLimits':
          const usageLimits = await apiService.getUsageLimits();
          sendResponse({ success: true, data: usageLimits });
          break;
          
        case 'openLogin':
          chrome.tabs.create({ url: 'https://replyguy.appendment.com/auth/login?extension=true' });
          sendResponse({ success: true });
          break;
          
        case 'updateDailyGoal':
          const goalResult = await apiService.updateDailyGoal(message.data.goal);
          sendResponse({ success: true, data: goalResult });
          break;
          
        case 'triggerPopupCelebration':
          // Forward celebration message to popup if it's open
          chrome.runtime.sendMessage({ action: 'showCelebration' }).catch(() => {
            // Popup might not be open, that's ok
          });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Listen for cookie changes to detect login/logout
chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.cookie.domain.includes('appendment.com') && 
      changeInfo.cookie.name.startsWith('sb-')) {
    // Re-check auth state when Supabase cookies change
    await authService.checkSupabaseSession();
    
    // Notify all tabs about auth state change
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'authStateChanged', 
          data: authService.getAuthState() 
        }).catch(() => {
          // Tab might not have content script loaded
        });
      }
    });
  }
});