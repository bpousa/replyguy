import { SuggestionsOverlay } from './suggestions-overlay';

export class TwitterIntegration {
  private observer: MutationObserver | null = null;
  private injectedButtons: WeakMap<Element, HTMLElement> = new WeakMap();
  private overlays: WeakMap<Element, SuggestionsOverlay> = new WeakMap();
  private isAuthenticated: boolean = false;

  initialize() {
    console.log('[ReplyGuy] Initializing X integration');
    console.log('[ReplyGuy] Current URL:', window.location.href);
    
    // Check if we're authenticated
    chrome.runtime.sendMessage({ action: 'checkAuth' }).then(response => {
      if (response?.success) {
        this.isAuthenticated = response.data.isAuthenticated;
        console.log('[ReplyGuy] Auth status:', this.isAuthenticated);
      }
    }).catch(err => {
      console.error('[ReplyGuy] Failed to check auth:', err);
    });
    
    this.setupObserver();
    this.injectReplyButtons();
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
    this.observer = new MutationObserver((mutations) => {
      // Check if new tweets or reply buttons were added
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.injectReplyButtons();
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private injectReplyButtons() {
    console.log('[ReplyGuy] Looking for reply buttons...');
    
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
      }
    });
  }

  private findReplyButtons(): Element[] {
    // Find all reply button containers
    const replyButtons = document.querySelectorAll('[data-testid="reply"]');
    return Array.from(replyButtons);
  }

  private createReplyGuyIcon(replyButton: Element, tweet: Element): HTMLElement | null {
    // Create container for Reply Guy icon
    const container = document.createElement('div');
    container.className = 'css-175oi2r r-18u37iz r-1h0z5md';
    container.setAttribute('role', 'button');
    container.setAttribute('data-testid', 'replyguy');
    container.setAttribute('tabindex', '0');
    container.style.marginLeft = '8px';
    container.style.cursor = 'pointer';
    
    container.innerHTML = `
      <div class="css-175oi2r r-xoduu5 r-1mlwlqe r-1d2f490 r-1udh08x r-u8s1d r-zchlnj r-ipm5af r-417010">
        <div class="css-175oi2r r-1niwhzg r-vvn4in r-u6sd8q r-4gszlv r-1p0dtai r-1pi2tsx r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu r-1wyyakw"
             style="background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 34px; height: 34px;"></div>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi" style="color: white; width: 18px; height: 18px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
          <g>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="currentColor"/>
          </g>
        </svg>
      </div>
    `;

    // Add hover effect
    container.addEventListener('mouseenter', () => {
      const bg = container.querySelector('.css-175oi2r.r-1niwhzg') as HTMLElement;
      if (bg) {
        bg.style.transform = 'scale(1.1)';
        bg.style.transition = 'transform 0.2s';
      }
    });
    
    container.addEventListener('mouseleave', () => {
      const bg = container.querySelector('.css-175oi2r.r-1niwhzg') as HTMLElement;
      if (bg) {
        bg.style.transform = 'scale(1)';
      }
    });

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleReplyGuyClick(tweet);
    });
    
    // Insert after the reply button
    const replyButtonContainer = replyButton.closest('.css-175oi2r.r-1kbdv8c.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-htvplk');
    if (replyButtonContainer && replyButtonContainer.parentNode) {
      replyButtonContainer.parentNode.insertBefore(container, replyButtonContainer.nextSibling);
    }
    
    return container;
  }

  private async handleReplyGuyClick(tweet: Element) {
    console.log('[ReplyGuy] Button clicked');
    
    // Check if authenticated
    const authResponse = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    if (!authResponse?.success || !authResponse.data.isAuthenticated) {
      console.log('[ReplyGuy] User not authenticated, prompting to login');
      if (confirm('Please sign in to Reply Guy to use this feature. Would you like to sign in now?')) {
        chrome.runtime.sendMessage({ action: 'openLogin' });
      }
      return;
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

        // Show loading state
        overlay.showLoading();

        try {
          // Get suggestions from API
          const response = await chrome.runtime.sendMessage({
            action: 'getSuggestions',
            data: { tweet: tweetText }
          });

          if (response.success) {
            overlay.show(response.data.suggestions, (suggestion) => {
              this.insertSuggestion(composeArea, suggestion);
            });
          } else {
            overlay.showError(response.error || 'Failed to get suggestions');
          }
        } catch (error) {
          overlay.showError('Failed to connect to Reply Guy. Please make sure you are logged in.');
        }
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