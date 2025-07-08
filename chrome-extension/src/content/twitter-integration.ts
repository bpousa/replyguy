import { SuggestionsOverlay } from './suggestions-overlay';

export class TwitterIntegration {
  private observer: MutationObserver | null = null;
  private injectedButtons: WeakMap<Element, HTMLElement> = new WeakMap();
  private overlays: WeakMap<Element, SuggestionsOverlay> = new WeakMap();
  private isAuthenticated: boolean = false;

  initialize() {
    console.log('[ReplyGuy] Initializing X integration');
    console.log('[ReplyGuy] Current URL:', window.location.href);
    
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      console.error('[ReplyGuy] Extension context invalid during initialization');
      return;
    }
    
    // Check if we're authenticated
    chrome.runtime.sendMessage({ action: 'checkAuth' }).then(response => {
      if (response?.success) {
        this.isAuthenticated = response.data.isAuthenticated;
        console.log('[ReplyGuy] Auth status:', this.isAuthenticated);
      }
    }).catch(err => {
      if (err.message?.includes('Extension context invalidated')) {
        console.error('[ReplyGuy] Extension context invalidated during auth check');
      } else {
        console.error('[ReplyGuy] Failed to check auth:', err);
      }
    });
    
    this.setupObserver();
    
    // Initial injection with a delay to ensure page is loaded
    setTimeout(() => this.injectReplyButtons(), 1000);
    
    // Try again after a longer delay in case of slow loading
    setTimeout(() => this.injectReplyButtons(), 3000);
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    // Remove all injected buttons
    this.injectedButtons = new WeakMap();
  }

  handleUrlChange() {
    // Re-inject buttons when URL changes
    setTimeout(() => this.injectReplyButtons(), 500);
  }

  private setupObserver() {
    let debounceTimer: number | null = null;
    
    this.observer = new MutationObserver((mutations) => {
      // Debounce to avoid too many calls
      if (debounceTimer) clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(() => {
        // Check if new tweets were added
        const hasNewTweets = mutations.some(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            return Array.from(mutation.addedNodes).some(node => {
              if (node instanceof Element) {
                return node.matches('article') || node.querySelector('article');
              }
              return false;
            });
          }
          return false;
        });
        
        if (hasNewTweets) {
          console.log('[ReplyGuy] New tweets detected, re-injecting buttons');
          this.injectReplyButtons();
        }
      }, 500);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private injectReplyButtons() {
    console.log('[ReplyGuy] Looking for reply buttons...');
    console.log('[ReplyGuy] Current page has', document.querySelectorAll('article').length, 'tweet articles');
    
    // Find all reply buttons on the page
    const replyButtons = this.findReplyButtons();
    console.log('[ReplyGuy] Found', replyButtons.length, 'reply buttons');
    
    replyButtons.forEach((replyButton, index) => {
      const tweet = replyButton.closest('article');
      if (tweet && !this.injectedButtons.has(tweet)) {
        console.log(`[ReplyGuy] Injecting button ${index + 1}`);
        const rgButton = this.createReplyGuyIcon(replyButton, tweet);
        if (rgButton) {
          this.injectedButtons.set(tweet, rgButton);
        }
      } else if (!tweet) {
        console.log(`[ReplyGuy] No article found for reply button ${index + 1}`);
      }
    });
  }

  private findReplyButtons(): Element[] {
    // Try multiple selectors for reply buttons
    const selectors = [
      '[data-testid="reply"]',
      '[aria-label*="Reply"]',
      '[role="button"][aria-label*="Reply"]',
      'div[role="button"] svg path[d*="M1.751 10c0-4.42"]' // Reply icon path
    ];
    
    let replyButtons: Element[] = [];
    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      if (buttons.length > 0) {
        console.log(`[ReplyGuy] Found ${buttons.length} reply buttons with selector: ${selector}`);
        replyButtons = Array.from(buttons);
        break;
      }
    }
    
    if (replyButtons.length === 0) {
      console.log('[ReplyGuy] No reply buttons found with any selector');
    }
    
    return replyButtons;
  }

  private createReplyGuyIcon(replyButton: Element, tweet: Element): HTMLElement | null {
    // Create container for Reply Guy icon with all inline styles
    const container = document.createElement('div');
    container.id = `replyguy-btn-${Date.now()}`; // Unique ID for debugging
    container.setAttribute('role', 'button');
    container.setAttribute('data-testid', 'replyguy');
    container.setAttribute('tabindex', '0');
    
    // Apply all styles inline for maximum compatibility
    Object.assign(container.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      marginLeft: '12px',
      cursor: 'pointer',
      position: 'relative',
      borderRadius: '50%',
      transition: 'transform 0.2s ease',
      zIndex: '1000',
      // Add a temporary border for debugging
      border: 'none'
    });
    
    // Create button with inline styles
    container.innerHTML = `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <svg viewBox="0 0 24 24" style="
          width: 22px;
          height: 22px;
          fill: white;
        ">
          <text x="50%" y="50%" 
                text-anchor="middle" 
                dominant-baseline="middle" 
                font-family="Arial, sans-serif" 
                font-size="11" 
                font-weight="bold" 
                fill="white">RG</text>
        </svg>
      </div>
    `;

    // Add hover effect with inline styles
    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.1)';
    });
    
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
    });

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleReplyGuyClick(tweet);
    });
    
    // Find the actions bar - try multiple strategies
    let insertionPoint: Element | null = null;
    let insertionStrategy = '';
    
    // Strategy 1: Find the role="group" container (most reliable)
    const actionsGroup = replyButton.closest('[role="group"]');
    if (actionsGroup) {
      insertionPoint = actionsGroup;
      insertionStrategy = 'role=group';
    }
    
    // Strategy 2: Find parent with multiple action buttons
    if (!insertionPoint) {
      let parent = replyButton.parentElement;
      while (parent && parent !== document.body) {
        // Check if this parent contains multiple action buttons
        const buttons = parent.querySelectorAll('[role="button"]');
        if (buttons.length >= 3) { // Usually has reply, retweet, like, share
          insertionPoint = parent;
          insertionStrategy = 'multiple-buttons-parent';
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    // Strategy 3: Direct parent of reply button
    if (!insertionPoint && replyButton.parentElement) {
      insertionPoint = replyButton.parentElement;
      insertionStrategy = 'direct-parent';
    }
    
    if (insertionPoint) {
      // Try to insert after the reply button
      if (replyButton.parentElement && replyButton.parentElement.parentElement === insertionPoint) {
        insertionPoint.insertBefore(container, replyButton.parentElement.nextSibling);
      } else {
        // Fallback: append to the container
        insertionPoint.appendChild(container);
      }
      
      console.log(`[ReplyGuy] Button injected using strategy: ${insertionStrategy}`);
      console.log(`[ReplyGuy] Button ID: ${container.id}`);
      console.log(`[ReplyGuy] Button visibility:`, {
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight,
        display: window.getComputedStyle(container).display,
        visibility: window.getComputedStyle(container).visibility
      });
    } else {
      console.log('[ReplyGuy] Could not find suitable container for button');
      return null;
    }
    
    return container;
  }

  private async handleReplyGuyClick(tweet: Element) {
    console.log('[ReplyGuy] Button clicked');
    
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.error('[ReplyGuy] Extension context invalidated');
      alert('Reply Guy extension needs to be refreshed. Please reload this page.');
      return;
    }
    
    try {
      // Check if authenticated
      const authResponse = await chrome.runtime.sendMessage({ action: 'checkAuth' });
      if (!authResponse?.success || !authResponse.data.isAuthenticated) {
        console.log('[ReplyGuy] User not authenticated, prompting to login');
        if (confirm('Please sign in to Reply Guy to use this feature. Would you like to sign in now?')) {
          chrome.runtime.sendMessage({ action: 'openLogin' });
        }
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.error('[ReplyGuy] Extension context invalidated');
        alert('Reply Guy extension needs to be refreshed. Please reload this page.');
        return;
      }
      throw error;
    }
    
    // Get tweet text
    const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextElement?.textContent || '';
    
    if (!tweetText) {
      console.error('[ReplyGuy] Could not find tweet text');
      return;
    }
    
    console.log('[ReplyGuy] Tweet text:', tweetText.substring(0, 50) + '...');

    // Find or create the reply compose area
    const replyButton = tweet.querySelector('[data-testid="reply"]') as HTMLElement;
    if (replyButton) {
      // Click the actual reply button to open compose area
      replyButton.click();
      
      // Wait for compose area to appear
      setTimeout(async () => {
        const composeArea = document.querySelector('[data-testid="tweetTextarea_0_label"]')?.parentElement;
        if (!composeArea) {
          console.error('Could not find compose area');
          return;
        }
        
        // Get or create overlay for this compose area
        let overlay = this.overlays.get(composeArea);
        if (!overlay) {
          overlay = new SuggestionsOverlay(composeArea);
          this.overlays.set(composeArea, overlay);
        }

        // Show comprehensive options UI
        overlay.showOptions(tweetText, async (data) => {
          // Generate full reply with all options
          overlay.showLoading();
          
          try {
            // Check if extension context is still valid before sending message
            if (!chrome.runtime?.id) {
              overlay.showError('Extension needs to be refreshed. Please reload this page.');
              return;
            }
            
            const response = await chrome.runtime.sendMessage({
              action: 'generateReply',
              data: data
            });

            console.log('[ReplyGuy] Generate reply response:', response);
            
            if (response.success) {
              // Show the generated reply with optional meme
              // The API returns { data: { reply, memeUrl, ... } }
              const replyData = response.data.data || response.data;
              console.log('[ReplyGuy] Reply data extracted:', replyData);
              
              overlay.showGeneratedReply(
                replyData.reply || 'Failed to generate reply',
                replyData.memeUrl
              );
            } else {
              overlay.showError(response.error || 'Failed to generate reply');
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('Extension context invalidated')) {
              overlay.showError('Extension needs to be refreshed. Please reload this page.');
            } else {
              overlay.showError('Failed to connect to Reply Guy. Please make sure you are logged in.');
            }
            console.error('[ReplyGuy] Error generating reply:', error);
          }
        });
      }, 500);
    }
  }


  private insertSuggestion(container: Element, suggestion: string) {
    const textbox = container.querySelector('[role="textbox"]') as HTMLElement;
    if (textbox) {
      // Clear existing content
      textbox.innerText = suggestion;
      
      // Trigger input event to update X's state
      const inputEvent = new Event('input', { bubbles: true });
      textbox.dispatchEvent(inputEvent);
      
      // Focus the textbox
      textbox.focus();
    }
  }
}