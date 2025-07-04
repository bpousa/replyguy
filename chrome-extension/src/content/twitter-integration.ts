import { SuggestionsOverlay } from './suggestions-overlay';

export class TwitterIntegration {
  private observer: MutationObserver | null = null;
  private injectedButtons: WeakMap<Element, HTMLElement> = new WeakMap();
  private overlays: WeakMap<Element, SuggestionsOverlay> = new WeakMap();

  initialize() {
    console.log('Reply Guy: Initializing Twitter integration');
    this.setupObserver();
    this.injectButtons();
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
    setTimeout(() => this.injectButtons(), 500);
  }

  private setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      // Check if new tweet compose areas were added
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.injectButtons();
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private injectButtons() {
    // Find all tweet compose areas
    const composeAreas = this.findComposeAreas();
    
    composeAreas.forEach(area => {
      if (!this.injectedButtons.has(area)) {
        const button = this.createReplyGuyButton(area);
        if (button) {
          this.injectedButtons.set(area, button);
        }
      }
    });
  }

  private findComposeAreas(): Element[] {
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea_1"]',
      '[role="textbox"][aria-label*="Tweet"]',
      '[role="textbox"][aria-label*="Post"]',
      '[role="textbox"][aria-label*="Reply"]',
      '.DraftEditor-editorContainer',
    ];

    const areas: Element[] = [];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Find the container that holds the compose area
        const container = el.closest('[data-testid="tweetButton"]')?.parentElement?.parentElement ||
                         el.closest('.css-1dbjc4n.r-1iusvr4.r-16y2uox');
        if (container && !areas.includes(container)) {
          areas.push(container);
        }
      });
    });

    return areas;
  }

  private createReplyGuyButton(container: Element): HTMLElement | null {
    // Find the toolbar area where Twitter's buttons are
    const toolbar = container.querySelector('[data-testid="toolBar"]') ||
                   container.querySelector('.css-1dbjc4n.r-1iusvr4.r-16y2uox.r-1wbh5a2');

    if (!toolbar) return null;

    // Create Reply Guy button
    const button = document.createElement('div');
    button.className = 'reply-guy-button';
    button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        padding: 8px 12px;
        margin-left: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 9999px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      " 
      onmouseover="this.style.transform='scale(1.05)'" 
      onmouseout="this.style.transform='scale(1)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        Reply Guy
      </div>
    `;

    button.addEventListener('click', () => this.handleButtonClick(container));
    
    // Insert button into toolbar
    toolbar.appendChild(button);
    
    return button;
  }

  private async handleButtonClick(container: Element) {
    // Get or create overlay for this container
    let overlay = this.overlays.get(container);
    if (!overlay) {
      overlay = new SuggestionsOverlay(container);
      this.overlays.set(container, overlay);
    }

    // Show loading state
    overlay.showLoading();

    // Get the tweet text
    const tweetText = this.getTweetText(container);
    const originalTweet = this.getOriginalTweet(container);

    try {
      // Get suggestions from API
      const response = await chrome.runtime.sendMessage({
        action: 'getSuggestions',
        data: { tweet: originalTweet || tweetText }
      });

      if (response.success) {
        overlay.show(response.data.suggestions, (suggestion) => {
          this.insertSuggestion(container, suggestion);
        });
      } else {
        overlay.showError(response.error || 'Failed to get suggestions');
      }
    } catch (error) {
      overlay.showError('Failed to connect to Reply Guy. Please make sure you are logged in.');
    }
  }

  private getTweetText(container: Element): string {
    const textbox = container.querySelector('[role="textbox"]');
    return textbox?.textContent || '';
  }

  private getOriginalTweet(container: Element): string {
    // For replies, find the original tweet text
    const article = container.closest('article');
    if (article) {
      const previousArticle = article.previousElementSibling?.querySelector('article');
      if (previousArticle) {
        const tweetText = previousArticle.querySelector('[data-testid="tweetText"]');
        return tweetText?.textContent || '';
      }
    }
    return '';
  }

  private insertSuggestion(container: Element, suggestion: string) {
    const textbox = container.querySelector('[role="textbox"]') as HTMLElement;
    if (textbox) {
      // Clear existing content
      textbox.innerText = suggestion;
      
      // Trigger input event to update Twitter's state
      const inputEvent = new Event('input', { bubbles: true });
      textbox.dispatchEvent(inputEvent);
      
      // Focus the textbox
      textbox.focus();
    }
  }
}