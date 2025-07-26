import { SuggestionsOverlay } from './suggestions-overlay';

export class TwitterIntegration {
  private observer: MutationObserver | null = null;
  private overlays: WeakMap<Element, SuggestionsOverlay> = new WeakMap();
  private isAuthenticated: boolean = false;
  private safetyNetInterval: number | null = null;
  
  private showInlineError(message: string, duration: number = 3000) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc3545;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
      animation: slideIn 0.3s ease-out;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, duration);
  }

  initialize() {
    console.log('[ReplyGuy] Initializing X integration');
    console.log('[ReplyGuy] Current URL:', window.location.href);
    
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      console.error('[ReplyGuy] Extension context invalid during initialization');
      return;
    }
    
    // Check if we're authenticated
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'checkAuth' }).then(response => {
        if (response?.success) {
          this.isAuthenticated = response.data?.isAuthenticated || false;
          console.log('[ReplyGuy] Auth status:', this.isAuthenticated);
        }
      }).catch(err => {
        if (err?.message?.includes('Extension context invalidated')) {
          console.error('[ReplyGuy] Extension context invalidated during auth check');
        } else {
          console.error('[ReplyGuy] Failed to check auth:', err);
        }
      });
    }
    
    this.setupObserver();
    
    // Initial injection
    this.injectReplyButtons();
    
    // Safety net to ensure buttons are injected even if mutation observer fails
    this.safetyNetInterval = setInterval(() => {
      this.injectReplyButtons();
    }, 2000);
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Clear the safety net interval
    if (this.safetyNetInterval) {
      clearInterval(this.safetyNetInterval);
      this.safetyNetInterval = null;
    }

    // Remove all injected buttons
    const existingButtons = document.querySelectorAll('[data-testid="replyguy"]');
    existingButtons.forEach(button => button.remove());
  }

  handleUrlChange() {
    // Re-inject buttons when URL changes
    setTimeout(() => this.injectReplyButtons(), 500);
  }

  private setupObserver() {
    let debounceTimer: number | null = null;

    this.observer = new MutationObserver(() => {
      // Debounce to avoid performance issues from rapid-fire mutations.
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        // Instead of checking for new tweets, we simply run the injection function.
        // This is more robust as it will catch tweets that are revealed or changed,
        // not just newly added ones. The injectReplyButtons function is idempotent.
        this.injectReplyButtons();
      }, 300); // Reduced debounce time for faster updates
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private injectReplyButtons() {
    // Find all tweet articles on the page
    const tweets = document.querySelectorAll('article');
    
    if (tweets.length === 0) return;
    
    tweets.forEach((tweet, index) => {
      // Check if our icon has already been injected for this tweet
      const existingIcon = tweet.querySelector('[data-testid="replyguy"]');
      if (existingIcon) {
        return; // Icon already exists, skip to the next tweet
      }

      // Find the action bar within the tweet
      const actionBar = tweet.querySelector('[role="group"]');
      if (!actionBar) {
        return; // No action bar found, cannot inject
      }

      // Find the native reply button within the action bar
      const replyButton = actionBar.querySelector('[data-testid="reply"]') || 
                          actionBar.querySelector('[aria-label*="Reply"]');
      
      if (replyButton) {
        this.createReplyGuyIcon(replyButton, tweet);
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
      console.log(`[ReplyGuy] Selector "${selector}" found ${buttons.length} elements`);
      if (buttons.length > 0) {
        console.log(`[ReplyGuy] Using ${buttons.length} reply buttons with selector: ${selector}`);
        replyButtons = Array.from(buttons);
        break;
      }
    }
    
    if (replyButtons.length === 0) {
      console.log('[ReplyGuy] No reply buttons found with any selector');
      // Let's debug what's actually on the page
      console.log('[ReplyGuy] Sample of buttons on page:');
      const allButtons = document.querySelectorAll('[role="button"]');
      console.log(`[ReplyGuy] Total buttons with role="button": ${allButtons.length}`);
      if (allButtons.length > 0) {
        Array.from(allButtons).slice(0, 5).forEach((btn, i) => {
          console.log(`[ReplyGuy] Button ${i}:`, btn.getAttribute('aria-label'), btn.getAttribute('data-testid'));
        });
      }
    }
    
    return replyButtons;
  }


  private createReplyGuyIcon(replyButton: Element, tweet: Element): void {
    const container = document.createElement('div');
    container.id = `replyguy-btn-${Date.now()}`;
    container.setAttribute('role', 'button');
    container.setAttribute('data-testid', 'replyguy');
    container.setAttribute('tabindex', '0');

    Object.assign(container.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '34px',
      height: '34px',
      marginLeft: '8px',
      marginRight: '8px',
      cursor: 'pointer',
      position: 'relative',
      borderRadius: '50%',
      transition: 'transform 0.2s ease, background-color 0.2s ease',
      zIndex: '1000',
    });

    container.innerHTML = `<img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" style="width: 20px; height: 20px;" />`;

    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.1)';
      container.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
    });
    
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
      container.style.backgroundColor = 'transparent';
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
      // For role=group, we want to insert between comment and retweet
      if (insertionStrategy === 'role=group') {
        // Find all direct children buttons
        const buttons = Array.from(insertionPoint.children).filter(child => 
          child.getAttribute('role') === 'button' || 
          child.querySelector('[role="button"]')
        );
        
        // Try to insert after the first button (reply) and before the second (retweet)
        if (buttons.length >= 2) {
          insertionPoint.insertBefore(container, buttons[1]);
        } else if (replyButton.parentElement && replyButton.parentElement.parentElement === insertionPoint) {
          insertionPoint.insertBefore(container, replyButton.parentElement.nextSibling);
        } else {
          insertionPoint.appendChild(container);
        }
      } else if (replyButton.parentElement && replyButton.parentElement.parentElement === insertionPoint) {
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
      return;
    }
  }

  private async handleReplyGuyClick(tweet: Element) {
    console.log('[ReplyGuy] Button clicked');
    
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.error('[ReplyGuy] Extension context invalidated');
      this.showInlineError('Reply Guy extension needs to be refreshed. Please reload this page.');
      return;
    }
    
    try {
      // Check if authenticated
      const authResponse = await chrome.runtime.sendMessage({ action: 'checkAuth' });
      if (!authResponse?.success || !authResponse.data?.isAuthenticated) {
        console.log('[ReplyGuy] User not authenticated, prompting to login');
        if (confirm('Please sign in to Reply Guy to use this feature. Would you like to sign in now?')) {
          chrome.runtime.sendMessage({ action: 'openLogin' }).catch(err => {
            console.error('[ReplyGuy] Failed to open login:', err);
          });
        }
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.error('[ReplyGuy] Extension context invalidated');
        this.showInlineError('Reply Guy extension needs to be refreshed. Please reload this page.');
        return;
      }
      console.error('[ReplyGuy] Auth check error:', error);
      return;
    }
    
    // Get tweet text
    const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextElement?.textContent?.trim() || '';
    
    if (!tweetText) {
      console.error('[ReplyGuy] Could not find tweet text');
      this.showInlineError('Could not find tweet text. Please try again.');
      return;
    }
    
    console.log('[ReplyGuy] Tweet text:', tweetText.substring(0, 50) + '...');

    // Find or create the reply compose area
    const replyButton = tweet.querySelector('[data-testid="reply"]') as HTMLElement;
    if (!replyButton) {
      console.error('[ReplyGuy] Could not find reply button');
      this.showInlineError('Could not find reply button. Please try again.');
      return;
    }
    
    try {
      // Click the actual reply button to open compose area
      replyButton.click();
      
      // Wait for compose area to appear
      setTimeout(async () => {
        const composeArea = document.querySelector('[data-testid="tweetTextarea_0_label"]')?.parentElement;
        if (!composeArea) {
          console.error('Could not find compose area');
          this.showInlineError('Could not find compose area. Please try clicking reply again.');
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
              
              // Log tracking status for debugging
              if (replyData.trackingStatus) {
                console.log('[ReplyGuy] 📊 Daily Usage Tracking Status:', {
                  success: replyData.trackingStatus.success,
                  date: replyData.trackingStatus.date,
                  timezone: replyData.trackingStatus.timezone,
                  error: replyData.trackingStatus.error || 'none'
                });
                if (!replyData.trackingStatus.success) {
                  console.error('[ReplyGuy] ❌ Failed to track daily usage:', replyData.trackingStatus.error);
                }
              } else {
                console.warn('[ReplyGuy] ⚠️ No tracking status returned from API');
              }
              
              overlay.showGeneratedReply(
                replyData.reply || 'Failed to generate reply',
                replyData.memeUrl,
                replyData
              );
              // After showing the reply, check for celebration
              chrome.runtime.sendMessage({ action: 'checkForCelebration' });
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
    } catch (error) {
      console.error('[ReplyGuy] Error in reply process:', error);
      this.showInlineError('An error occurred. Please try again.');
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

  private insertGeneratedReply(container: Element, reply: string) {
    const textbox = container.querySelector('[role="textbox"]') as HTMLElement;
    if (textbox) {
      // This is a more robust way to set the value and trigger X's internal state updates
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textbox, reply);

        const inputEvent = new Event('input', { bubbles: true });
        textbox.dispatchEvent(inputEvent);

        textbox.focus();
      } else {
        // Fallback for browsers that don't support the above method
        textbox.innerText = reply;
        const inputEvent = new Event('input', { bubbles: true });
        textbox.dispatchEvent(inputEvent);
        textbox.focus();
      }
    }
  }
}