export class SuggestionsOverlay {
  private overlay: HTMLElement | null = null;
  private container: Element;
  private responseType: string = 'neutral';
  private tone: string = 'friendly';
  private responseIdea: string = '';
  private replyLength: string = 'short';
  private needsResearch: boolean = false;
  private perplexityGuidance: string = '';
  private includeMeme: boolean = false;
  private memeText: string = '';
  private memeTextMode: 'exact' | 'enhance' = 'exact';
  private tweet: string = '';
  private userPlan: any = null;
  private usageLimits: any = null;
  private isSuggestingIdea: boolean = false;
  private isSuggestingResearch: boolean = false;
  private researchSuggestions: string[] = [];
  private useCustomStyle: boolean = false;
  private enableStyleMatching: boolean = false;

  constructor(container: Element) {
    this.container = container;
  }

  async showOptions(tweet: string, onGenerate: (data: any) => void) {
    this.remove();
    this.tweet = tweet;
    
    // Get user's plan to show/hide features
    try {
      if (!chrome.runtime?.id) {
        console.error('[ReplyGuy] Extension context invalid');
        return;
      }
      
      const response = await chrome.runtime.sendMessage({ action: 'getUsageLimits' });
      if (response.success && response.data) {
        this.usageLimits = response.data;
        this.userPlan = response.data.userPlan || response.data;
        console.log('[ReplyGuy] User plan loaded:', this.userPlan);
        console.log('[ReplyGuy] Usage limits:', this.usageLimits);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.error('[ReplyGuy] Extension context invalidated');
        alert('Reply Guy extension needs to be refreshed. Please reload this page.');
        this.remove();
        return;
      }
      console.error('[ReplyGuy] Failed to get user plan:', error);
    }
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <style>
        ${this.getComprehensiveStyles()}
      </style>
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <svg viewBox="0 0 24 24" class="reply-guy-logo-icon">
            <rect width="24" height="24" rx="4" fill="url(#rg-gradient)"/>
            <defs>
              <linearGradient id="rg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea" />
                <stop offset="100%" style="stop-color:#764ba2" />
              </linearGradient>
            </defs>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white">RG</text>
          </svg>
          <span>Reply Guy</span>
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      
      <div class="reply-guy-content">
        <!-- Tweet Preview -->
        <details class="reply-guy-tweet-section" open>
          <summary>Replying to...</summary>
          <div class="reply-guy-tweet-preview">
            ${this.escapeHtml(tweet)}
          </div>
        </details>
        
        <!-- Main Options -->
        <div class="reply-guy-main-section">
          <div class="reply-guy-row">
            <!-- Response Type -->
            <div class="reply-guy-option-group reply-guy-half">
              <label class="reply-guy-option-label" for="reply-guy-response-type">Response Type</label>
              <select class="reply-guy-select" id="reply-guy-response-type">
                <option value="agree">👍 Agree</option>
                <option value="disagree">🤔 Disagree</option>
                <option value="neutral" selected>💭 Neutral</option>
                <option value="other">✨ Creative</option>
              </select>
            </div>
            
            <!-- Tone -->
            <div class="reply-guy-option-group reply-guy-half">
              <label class="reply-guy-option-label" for="reply-guy-tone">Tone</label>
              <select class="reply-guy-select" id="reply-guy-tone">
                <option value="friendly">😊 Friendly</option>
                <option value="professional">💼 Professional</option>
                <option value="casual">👋 Casual</option>
                <option value="humorous">😄 Humorous</option>
                <option value="empathetic">❤️ Empathetic</option>
                <option value="witty">🎯 Witty</option>
                <option value="sarcastic">😏 Sarcastic</option>
                <option value="supportive">🤝 Supportive</option>
                <option value="informative">📚 Informative</option>
                <option value="formal">🎩 Formal</option>
              </select>
            </div>
          </div>
          
          <!-- Response Idea -->
          <div class="reply-guy-option-group">
            <div class="reply-guy-label-with-action">
              <label class="reply-guy-option-label" for="reply-guy-idea">What do you want to say?</label>
              <button class="reply-guy-suggest-btn" id="reply-guy-suggest">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L13.09 8.26L19 7L15.45 11.82L21 16L14.5 16.5L15 23L10.18 17.45L5 21L5.5 14.5L0 16L5.55 11.18L2 7L7.91 8.26L9 2L12 2Z" fill="currentColor"/>
                </svg>
                Suggest
              </button>
            </div>
            <textarea 
              id="reply-guy-idea" 
              class="reply-guy-idea-input" 
              placeholder="Describe your response (e.g., 'Sympathize and share a similar experience')"
              rows="3"
              maxlength="${this.userPlan?.max_response_idea_length || 200}"
            >${this.responseIdea}</textarea>
            <div class="reply-guy-char-count">
              <span id="idea-char-count">0</span> / <span id="idea-char-limit">${this.userPlan?.max_response_idea_length || 200}</span>
            </div>
          
          <!-- Reply Length -->
          <div class="reply-guy-option-group">
            <label class="reply-guy-option-label">Reply Length</label>
            <div class="reply-guy-length-options">
              <label class="reply-guy-radio">
                <input type="radio" name="replyLength" value="short" checked>
                <span>Short (280)</span>
              </label>
              <label class="reply-guy-radio">
                <input type="radio" name="replyLength" value="medium" ${!this.userPlan?.enable_long_replies ? 'disabled' : ''}>
                <span>Medium (560) ${!this.userPlan?.enable_long_replies ? '🔒' : ''}</span>
              </label>
              <label class="reply-guy-radio">
                <input type="radio" name="replyLength" value="long" ${!this.userPlan?.enable_long_replies ? 'disabled' : ''}>
                <span>Long (1000) ${!this.userPlan?.enable_long_replies ? '🔒' : ''}</span>
              </label>
              <label class="reply-guy-radio">
                <input type="radio" name="replyLength" value="extra-long" ${!this.userPlan?.enable_long_replies || this.userPlan?.max_reply_length < 2000 ? 'disabled' : ''}>
                <span>Extra Long (2000) ${!this.userPlan?.enable_long_replies || this.userPlan?.max_reply_length < 2000 ? '🔒' : ''}</span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Advanced Options -->
        <details class="reply-guy-advanced-section">
          <summary>Advanced Options</summary>
          <div class="reply-guy-advanced-content">
            
            <!-- Perplexity Research -->
            ${this.userPlan?.enable_perplexity_guidance !== false ? `
            <div class="reply-guy-option-group">
              <label class="reply-guy-checkbox">
                <input type="checkbox" id="reply-guy-research">
                <span>Use real-time research 🔍</span>
              </label>
              <div id="reply-guy-research-section" style="display: none; margin-top: 12px;">
                <div class="reply-guy-label-with-action">
                  <label class="reply-guy-option-label" for="reply-guy-perplexity" style="margin-bottom: 4px;">
                    Research Guidance (Optional)
                  </label>
                  <button class="reply-guy-suggest-btn" id="reply-guy-suggest-research" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L13.09 8.26L19 7L15.45 11.82L21 16L14.5 16.5L15 23L10.18 17.45L5 21L5.5 14.5L0 16L5.55 11.18L2 7L7.91 8.26L9 2L12 2Z" fill="currentColor"/>
                    </svg>
                    Suggest
                  </button>
                </div>
                <textarea
                  id="reply-guy-perplexity" 
                  class="reply-guy-text-input" 
                  placeholder="What specific facts, stats, or current events should we look for?"
                  rows="2"
                  maxlength="200"
                ></textarea>
                <div id="reply-guy-research-suggestions" style="display: none; margin-top: 8px;">
                  <p class="reply-guy-suggestion-label">Suggestions:</p>
                  <div class="reply-guy-suggestion-chips"></div>
                </div>
              </div>
            </div>
            ` : ''}
            
            ${/* Write Like Me option */''}
            ${this.userPlan?.enable_write_like_me !== false ? `
            <div class="reply-guy-option-group">
              <label class="reply-guy-checkbox">
                <input type="checkbox" id="reply-guy-write-like-me">
                <span>Write like me ✍️</span>
              </label>
              <p class="reply-guy-option-hint">Use your personal writing style</p>
            </div>
            ` : ''}
            
            ${/* Match Tweet Style option */''}
            ${this.userPlan?.enable_style_matching !== false ? `
            <div class="reply-guy-option-group">
              <label class="reply-guy-checkbox">
                <input type="checkbox" id="reply-guy-match-style">
                <span>Match tweet style 🎨</span>
              </label>
              <p class="reply-guy-option-hint">Adapt to the original tweet's tone and style</p>
            </div>
            ` : ''}
          </div>
        </details>
        
        <!-- Fun Extras -->
        ${this.userPlan?.enable_memes !== false ? `
        <details class="reply-guy-extras-section">
          <summary>Fun Extras</summary>
          <div class="reply-guy-extras-content">
            <div class="reply-guy-option-group">
              <label class="reply-guy-checkbox">
                <input type="checkbox" id="reply-guy-meme">
                <span>Add a meme 🎭</span>
                <span class="reply-guy-meme-usage">${this.userPlan?.memes_used || 0}/${this.userPlan?.meme_limit || 0} used</span>
              </label>
              <div id="reply-guy-meme-options" style="display: none; margin-top: 12px;">
                <div class="reply-guy-option-group">
                  <label class="reply-guy-option-label" style="font-size: 11px;">Meme text (optional)</label>
                  <input 
                    type="text"
                    id="reply-guy-meme-text" 
                    class="reply-guy-text-input" 
                    placeholder="e.g., 'this is fine' or 'bugs everywhere'"
                    maxlength="100"
                  />
                </div>
                
                <!-- Show mode selector only when user has typed text -->
                <div id="reply-guy-meme-mode-section" style="display: none; margin-top: 12px;">
                  <div class="reply-guy-meme-mode">
                    <label class="reply-guy-radio">
                      <input type="radio" name="memeTextMode" value="exact" checked>
                      <span>Use my exact text</span>
                    </label>
                    <label class="reply-guy-radio">
                      <input type="radio" name="memeTextMode" value="enhance">
                      <span>Make it more creative with AI ✨</span>
                    </label>
                  </div>
                </div>
                
                <div class="reply-guy-meme-info">
                  <p id="meme-info-empty">💡 <strong>Leave blank</strong> = AI creates meme text from your reply</p>
                  <p id="meme-info-exact" style="display: none;">✏️ Your exact text will be used: "<span id="meme-preview-text"></span>"</p>
                  <p id="meme-info-enhance" style="display: none;">✨ AI will enhance your idea to make it funnier</p>
                </div>
              </div>
            </div>
          </div>
        </details>
        ` : ''}
        
        <!-- Action Buttons -->
        <div class="reply-guy-actions">
          <button class="reply-guy-generate-btn" id="reply-guy-generate">
            Generate Reply
          </button>
          ${this.usageLimits ? `
          <div class="reply-guy-usage">
            <span class="reply-guy-usage-used">${(this.usageLimits.repliesTotal || 0) - (this.usageLimits.repliesRemaining || 0)}</span> / ${this.usageLimits.repliesTotal || 0} replies
            <span class="reply-guy-usage-detail">(${this.usageLimits.repliesRemaining || 0} remaining this billing period)</span>
          </div>
          ${this.usageLimits.dailyCount !== undefined ? `
          <div class="reply-guy-daily-goal">
            <span class="reply-guy-daily-icon">🎯</span>
            <span class="reply-guy-daily-text">Daily Goal: ${this.usageLimits.dailyCount || 0} / ${this.usageLimits.dailyGoal || 10}</span>
          </div>
          ` : ''}
          ` : ''}
        </div>
      </div>
    `;

    // Position the overlay
    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    
    // Calculate position to ensure overlay stays within viewport
    const overlayHeight = window.innerHeight * 0.8; // 80% of viewport
    const availableHeight = window.innerHeight - rect.bottom - 16; // Space below button
    
    // If not enough space below, position above the button
    if (availableHeight < overlayHeight && rect.top > overlayHeight) {
      this.overlay.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      this.overlay.style.top = 'auto';
    } else {
      this.overlay.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - overlayHeight)}px`;
    }
    
    this.overlay.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
    this.overlay.style.width = '480px';

    // Add all event listeners
    this.attachEventListeners(onGenerate);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);

    document.body.appendChild(this.overlay);
  }
  
  private attachEventListeners(onGenerate: (data: any) => void) {
    if (!this.overlay) return;
    
    // Close button
    this.overlay.querySelector('.reply-guy-close')?.addEventListener('click', () => this.remove());
    
    // Response type selection
    const responseTypeSelect = this.overlay.querySelector('#reply-guy-response-type') as HTMLSelectElement;
    responseTypeSelect?.addEventListener('change', () => {
      this.responseType = responseTypeSelect.value;
    });
    
    // Tone selection
    const toneSelect = this.overlay.querySelector('#reply-guy-tone') as HTMLSelectElement;
    toneSelect?.addEventListener('change', () => {
      this.tone = toneSelect.value;
    });
    
    // Response idea input with character counter
    const ideaInput = this.overlay.querySelector('#reply-guy-idea') as HTMLTextAreaElement;
    const charCount = this.overlay.querySelector('#idea-char-count');
    const charLimit = this.overlay.querySelector('#idea-char-limit');
    
    if (ideaInput && charCount) {
      const maxLength = this.userPlan?.max_response_idea_length || 200;
      const updateCharCount = () => {
        const length = ideaInput.value.length;
        charCount.textContent = length.toString();
        ideaInput.classList.toggle('error', length > maxLength);
      };
      
      ideaInput.addEventListener('input', () => {
        this.responseIdea = ideaInput.value;
        updateCharCount();
      });
      
      updateCharCount();
    }
    
    // Suggest button for response idea
    this.overlay.querySelector('#reply-guy-suggest')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ReplyGuy] Suggest button clicked');
      
      if (!this.tweet.trim()) {
        alert('Please wait for tweet to load');
        return;
      }
      
      const suggestBtn = this.overlay?.querySelector('#reply-guy-suggest') as HTMLButtonElement;
      if (!suggestBtn || suggestBtn.disabled) return;
      
      suggestBtn.disabled = true;
      const originalContent = suggestBtn.innerHTML;
      suggestBtn.innerHTML = '<svg class="reply-guy-spinner-small" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"></circle></svg> Suggesting...';
      
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          throw new Error('Extension context invalidated');
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'getSuggestions',
          data: {
            tweet: this.tweet,
            responseType: this.responseType,
            tone: this.tone
          }
        });
        
        if (response && response.success && response.data?.suggestion) {
          this.responseIdea = response.data.suggestion;
          if (ideaInput) {
            ideaInput.value = this.responseIdea;
            ideaInput.dispatchEvent(new Event('input'));
          }
        } else {
          const errorMsg = response?.error || 'Failed to get suggestion';
          console.error('[ReplyGuy] Failed to get suggestion:', errorMsg);
          if (errorMsg.includes('limit')) {
            alert('You have reached your suggestion limit. Please upgrade your plan.');
          } else {
            alert('Failed to generate suggestion. Please try again.');
          }
        }
      } catch (error) {
        console.error('[ReplyGuy] Suggest error:', error);
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          alert('Reply Guy extension needs to be refreshed. Please reload this page.');
        } else {
          alert('An error occurred. Please try again.');
        }
      } finally {
        if (suggestBtn && this.overlay) {
          suggestBtn.disabled = false;
          suggestBtn.innerHTML = originalContent;
        }
      }
    });
    
    // Reply length selection
    this.overlay.querySelectorAll('input[name="replyLength"]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.replyLength = (e.target as HTMLInputElement).value;
      });
    });
    
    // Research toggle
    const researchCheckbox = this.overlay.querySelector('#reply-guy-research') as HTMLInputElement;
    const researchSection = this.overlay.querySelector('#reply-guy-research-section') as HTMLElement;
    const perplexityInput = this.overlay.querySelector('#reply-guy-perplexity') as HTMLTextAreaElement;
    
    researchCheckbox?.addEventListener('change', () => {
      this.needsResearch = researchCheckbox.checked;
      if (researchSection) {
        researchSection.style.display = this.needsResearch ? 'block' : 'none';
      }
    });
    
    perplexityInput?.addEventListener('input', () => {
      this.perplexityGuidance = perplexityInput.value;
    });
    
    // Research suggest button
    this.overlay.querySelector('#reply-guy-suggest-research')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.tweet.trim() || !this.responseIdea.trim()) {
        alert('Please enter a tweet and response idea first');
        return;
      }
      
      const suggestBtn = this.overlay?.querySelector('#reply-guy-suggest-research') as HTMLButtonElement;
      if (suggestBtn) {
        suggestBtn.disabled = true;
        suggestBtn.innerHTML = '<svg class="reply-guy-spinner-small" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"></circle></svg> Suggesting...';
      }
      
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          throw new Error('Extension context invalidated');
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'getSuggestResearch',
          data: {
            originalTweet: this.tweet,
            responseIdea: this.responseIdea,
            responseType: this.responseType,
            tone: this.tone
          }
        });
        
        if (response.success && response.data?.suggestions) {
          this.researchSuggestions = response.data.suggestions;
          this.showResearchSuggestions();
        }
      } catch (error) {
        console.error('[ReplyGuy] Research suggest error:', error);
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          alert('Reply Guy extension needs to be refreshed. Please reload this page.');
        }
      } finally {
        if (suggestBtn) {
          suggestBtn.disabled = false;
          suggestBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.09 8.26L19 7L15.45 11.82L21 16L14.5 16.5L15 23L10.18 17.45L5 21L5.5 14.5L0 16L5.55 11.18L2 7L7.91 8.26L9 2L12 2Z" fill="currentColor"/></svg> Suggest';
        }
      }
    });
    
    // Meme options
    const memeCheckbox = this.overlay.querySelector('#reply-guy-meme') as HTMLInputElement;
    const memeOptions = this.overlay.querySelector('#reply-guy-meme-options') as HTMLElement;
    const memeTextInput = this.overlay.querySelector('#reply-guy-meme-text') as HTMLInputElement;
    const memeModeSection = this.overlay.querySelector('#reply-guy-meme-mode-section') as HTMLElement;
    const memeInfoEmpty = this.overlay.querySelector('#meme-info-empty') as HTMLElement;
    const memeInfoExact = this.overlay.querySelector('#meme-info-exact') as HTMLElement;
    const memeInfoEnhance = this.overlay.querySelector('#meme-info-enhance') as HTMLElement;
    const memePreviewText = this.overlay.querySelector('#meme-preview-text') as HTMLElement;
    
    // Check if memes are available
    if (memeCheckbox && this.userPlan) {
      const memesAvailable = this.userPlan.memes_used < this.userPlan.meme_limit;
      memeCheckbox.disabled = !memesAvailable;
      if (!memesAvailable) {
        const label = memeCheckbox.parentElement;
        if (label) {
          label.style.opacity = '0.5';
          label.style.cursor = 'not-allowed';
        }
      }
    }
    
    memeCheckbox?.addEventListener('change', () => {
      this.includeMeme = memeCheckbox.checked;
      if (memeOptions) {
        memeOptions.style.display = this.includeMeme ? 'block' : 'none';
      }
      if (!this.includeMeme) {
        this.memeText = '';
        if (memeTextInput) memeTextInput.value = '';
      }
    });
    
    // Meme text input and mode handling
    const updateMemeDisplay = () => {
      const hasText = this.memeText.trim().length > 0;
      
      if (memeModeSection) {
        memeModeSection.style.display = hasText ? 'block' : 'none';
      }
      
      if (hasText) {
        if (memePreviewText) {
          memePreviewText.textContent = this.memeText;
        }
        
        const isExact = this.memeTextMode === 'exact';
        if (memeInfoEmpty) memeInfoEmpty.style.display = 'none';
        if (memeInfoExact) memeInfoExact.style.display = isExact ? 'block' : 'none';
        if (memeInfoEnhance) memeInfoEnhance.style.display = !isExact ? 'block' : 'none';
      } else {
        if (memeInfoEmpty) memeInfoEmpty.style.display = 'block';
        if (memeInfoExact) memeInfoExact.style.display = 'none';
        if (memeInfoEnhance) memeInfoEnhance.style.display = 'none';
      }
    };
    
    memeTextInput?.addEventListener('input', () => {
      this.memeText = memeTextInput.value;
      updateMemeDisplay();
    });
    
    this.overlay.querySelectorAll('input[name="memeTextMode"]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.memeTextMode = (e.target as HTMLInputElement).value as 'exact' | 'enhance';
        updateMemeDisplay();
      });
    });
    
    // Write Like Me checkbox
    const writeLikeMeCheckbox = this.overlay.querySelector('#reply-guy-write-like-me') as HTMLInputElement;
    writeLikeMeCheckbox?.addEventListener('change', () => {
      this.useCustomStyle = writeLikeMeCheckbox.checked;
    });
    
    // Match Tweet Style checkbox
    const matchStyleCheckbox = this.overlay.querySelector('#reply-guy-match-style') as HTMLInputElement;
    matchStyleCheckbox?.addEventListener('change', () => {
      this.enableStyleMatching = matchStyleCheckbox.checked;
    });
    
    // Generate button
    this.overlay.querySelector('#reply-guy-generate')?.addEventListener('click', () => {
      // Validate minimum requirements
      if (!this.responseIdea.trim()) {
        alert('Please describe what you want to say');
        return;
      }
      
      const data = {
        originalTweet: this.tweet,
        responseIdea: this.responseIdea,
        responseType: this.responseType,
        tone: this.tone,
        replyLength: this.replyLength,
        needsResearch: this.needsResearch,
        perplexityGuidance: this.needsResearch ? this.perplexityGuidance : undefined,
        includeMeme: this.includeMeme,
        memeText: this.includeMeme && this.memeText ? this.memeText : undefined,
        memeTextMode: this.includeMeme && this.memeText ? this.memeTextMode : undefined,
        useCustomStyle: this.useCustomStyle,
        enableStyleMatching: this.enableStyleMatching
      };
      
      console.log('[ReplyGuy] Generating with data:', data);
      onGenerate(data);
    });
  }
  
  private getComprehensiveStyles(): string {
    return `
      .reply-guy-overlay {
        position: fixed;
        z-index: 10000;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
        display: flex;
        flex-direction: column;
        max-height: 80vh; /* Limit to 80% of viewport height */
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .reply-guy-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        flex-shrink: 0; /* Prevent header from shrinking */
      }

      .reply-guy-title {
        display: flex;
        align-items: center;
        font-size: 18px;
        font-weight: 600;
        gap: 10px;
      }
      
      .reply-guy-logo-icon {
        width: 28px;
        height: 28px;
      }

      .reply-guy-close {
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        transition: all 0.2s;
      }

      .reply-guy-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }
      
      .reply-guy-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        max-height: calc(80vh - 80px); /* Account for header height */
      }
      
      /* Sections */
      details {
        margin-bottom: 16px;
        border: 1px solid #e9ecef;
        border-radius: 12px;
        overflow: hidden;
      }
      
      details summary {
        padding: 12px 16px;
        background: #f8f9fa;
        cursor: pointer;
        font-weight: 500;
        color: #495057;
        user-select: none;
        transition: background 0.2s;
      }
      
      details summary:hover {
        background: #e9ecef;
      }
      
      details[open] summary {
        border-bottom: 1px solid #e9ecef;
      }
      
      .reply-guy-tweet-preview {
        padding: 16px;
        font-size: 14px;
        line-height: 1.5;
        color: #6c757d;
        max-height: 150px;
        overflow-y: auto;
      }
      
      .reply-guy-row {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .reply-guy-half {
        flex: 1;
      }
      
      .reply-guy-select {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        color: #212529; /* Explicitly set text color */
        transition: all 0.2s;
        font-family: inherit;
        background: white;
        cursor: pointer;
        -webkit-appearance: none; /* Remove default styling */
      }
      
      .reply-guy-select option {
        color: #212529; /* Ensure option text is visible */
        background: white;
      }
      
      .reply-guy-select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .reply-guy-main-section {
        margin-bottom: 16px;
      }
      
      .reply-guy-advanced-content,
      .reply-guy-extras-content {
        padding: 16px;
      }
      
      /* Form Elements */
      .reply-guy-option-group {
        margin-bottom: 20px;
      }
      
      .reply-guy-option-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #6c757d;
        text-transform: uppercase;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }
      
      .reply-guy-label-with-action {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      
      .reply-guy-text-input,
      .reply-guy-idea-input {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.2s;
        font-family: inherit;
      }
      
      .reply-guy-text-input:focus,
      .reply-guy-idea-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .reply-guy-idea-input {
        resize: vertical;
        min-height: 60px;
      }
      
      .reply-guy-idea-input.error {
        border-color: #dc3545;
      }
      
      .reply-guy-char-count {
        text-align: right;
        font-size: 12px;
        color: #6c757d;
        margin-top: 4px;
      }
      
      .reply-guy-suggest-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        font-size: 12px;
        color: #667eea;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .reply-guy-suggest-btn:hover {
        background: #e9ecef;
        border-color: #667eea;
      }
      
      /* Radio and Checkbox */
      .reply-guy-length-options,
      .reply-guy-meme-mode {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .reply-guy-radio,
      .reply-guy-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
        color: #495057;
      }
      
      .reply-guy-radio input[type="radio"],
      .reply-guy-checkbox input[type="checkbox"] {
        cursor: pointer;
      }
      
      .reply-guy-radio input[type="radio"]:disabled + span,
      .reply-guy-checkbox input[type="checkbox"]:disabled + span {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .reply-guy-option-hint {
        font-size: 11px;
        color: #868e96;
        margin-top: 4px;
        margin-left: 24px;
      }
      
      /* Action Buttons */
      .reply-guy-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e9ecef;
      }
      
      .reply-guy-generate-btn {
        flex: 1;
        padding: 14px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      
      .reply-guy-generate-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }
      
      .reply-guy-generate-btn:active {
        transform: translateY(0);
      }
      
      .reply-guy-usage {
        margin-left: 16px;
        font-size: 13px;
        color: #6c757d;
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }
      
      .reply-guy-usage-remaining {
        font-weight: 600;
        color: #495057;
      }
      
      .reply-guy-usage-detail {
        font-size: 11px;
        color: #adb5bd;
      }
      
      .reply-guy-daily-goal {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 8px;
        font-size: 13px;
        color: #495057;
      }
      
      .reply-guy-daily-icon {
        font-size: 16px;
      }
      
      .reply-guy-daily-text {
        font-weight: 500;
      }
      
      /* Research suggestions */
      .reply-guy-suggestion-label {
        font-size: 12px;
        font-weight: 600;
        color: #6c757d;
        margin-bottom: 6px;
      }
      
      .reply-guy-suggestion-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      
      .reply-guy-suggestion-chip {
        padding: 6px 12px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 16px;
        font-size: 12px;
        color: #495057;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .reply-guy-suggestion-chip:hover {
        background: #e9ecef;
        border-color: #667eea;
        color: #667eea;
      }
      
      /* Meme styles */
      .reply-guy-meme-usage {
        font-size: 11px;
        color: #6c757d;
        margin-left: 8px;
      }
      
      .reply-guy-meme-info {
        margin-top: 8px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 12px;
        color: #495057;
      }
      
      .reply-guy-meme-info p {
        margin: 0;
      }
      
      .reply-guy-meme-info strong {
        font-weight: 600;
      }
      
      /* Spinner for loading */
      .reply-guy-spinner-small {
        animation: spin 1s linear infinite;
        display: inline-block;
        vertical-align: middle;
      }
      
      /* Loading States */
      .reply-guy-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 16px;
      }
      
      .reply-guy-loading img {
        animation: pulse 2s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
      
      .reply-guy-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Loading dots animation */
      .reply-guy-loading-text {
        color: #666;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .reply-guy-loading-dots {
        display: inline-flex;
        gap: 3px;
      }
      
      .reply-guy-loading-dot {
        width: 6px;
        height: 6px;
        background: #667eea;
        border-radius: 50%;
        display: inline-block;
        animation: loadingDot 1.4s infinite ease-in-out both;
      }
      
      .reply-guy-loading-dot:nth-child(1) {
        animation-delay: -0.32s;
      }
      
      .reply-guy-loading-dot:nth-child(2) {
        animation-delay: -0.16s;
      }
      
      @keyframes loadingDot {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      
      /* Error State */
      .reply-guy-error {
        padding: 20px;
        text-align: center;
        color: #dc3545;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 8px;
        margin: 16px;
      }
    `;
  }


  showGeneratedReply(reply: string, memeUrl?: string) {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <style>
        ${this.getComprehensiveStyles()}
        .reply-guy-result {
          padding: 20px;
        }
        .reply-guy-reply-text {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 16px;
          font-size: 15px;
          line-height: 1.5;
          color: #212529;
          margin-bottom: 16px;
        }
        .reply-guy-meme-preview {
          margin-bottom: 16px;
          text-align: center;
        }
        .reply-guy-meme-preview img {
          width: 100%;
          max-width: 300px;
          max-height: 300px;
          height: auto;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .reply-guy-result-actions {
          display: flex;
          gap: 12px;
        }
        .reply-guy-copy-btn {
          flex: 1;
          max-width: 250px;
          padding: 14px 24px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          margin: 0 auto;
        }
        .reply-guy-copy-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }
        .reply-guy-copy-btn.copied {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        }
      </style>
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <svg viewBox="0 0 24 24" class="reply-guy-logo-icon">
            <rect width="24" height="24" rx="4" fill="url(#rg-gradient)"/>
            <defs>
              <linearGradient id="rg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea" />
                <stop offset="100%" style="stop-color:#764ba2" />
              </linearGradient>
            </defs>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white">RG</text>
          </svg>
          <span>Your Reply is Ready!</span>
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      
      <div class="reply-guy-result">
        <div class="reply-guy-reply-text">
          ${this.escapeHtml(reply)}
        </div>
        
        ${memeUrl ? `
        <div class="reply-guy-meme-preview">
          <img src="${memeUrl}" alt="Generated meme" />
        </div>
        ` : ''}
        
        <div class="reply-guy-result-actions">
          <button class="reply-guy-copy-btn">${memeUrl ? '📋 Copy Reply & Download Meme' : '📋 Copy Reply'}</button>
        </div>
        
        <div class="reply-guy-copy-notice" style="display: none; margin-top: 16px; padding: 12px 16px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; color: #155724; font-size: 14px; text-align: center;">
          ✅ Reply copied! Click in the reply box and paste with <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong> on Mac)
        </div>
        
        ${memeUrl ? `
        <div class="reply-guy-meme-notice" style="display: none; margin-top: 12px; padding: 12px 16px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; color: #0c5460; font-size: 14px; text-align: center;">
          🖼️ Meme will open in a new window
        </div>
        ` : ''}
      </div>
    `;

    // Position the overlay
    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    
    // Use same positioning logic for consistency
    const overlayHeight = window.innerHeight * 0.8; // 80% of viewport
    const availableHeight = window.innerHeight - rect.bottom - 16;
    
    if (availableHeight < overlayHeight && rect.top > overlayHeight) {
      this.overlay.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      this.overlay.style.top = 'auto';
    } else {
      this.overlay.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - overlayHeight)}px`;
    }
    
    this.overlay.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
    this.overlay.style.width = '480px';

    // Add event listeners
    this.overlay.querySelector('.reply-guy-close')?.addEventListener('click', () => this.remove());
    
    const copyBtn = this.overlay.querySelector('.reply-guy-copy-btn') as HTMLButtonElement;
    const copyNotice = this.overlay.querySelector('.reply-guy-copy-notice') as HTMLElement;
    
    copyBtn?.addEventListener('click', async () => {
      try {
        // Copy text to clipboard
        await navigator.clipboard.writeText(reply);
        
        // Update button state
        copyBtn.textContent = '✅ Copied!';
        copyBtn.classList.add('copied');
        
        // Show copy notice
        if (copyNotice) {
          copyNotice.style.display = 'block';
        }
        
        // Open meme in new window if present
        if (memeUrl) {
          try {
            // Open in a new window so user can save it
            // Using window.open with specific features to ensure it opens as a popup
            const memeWindow = window.open(
              memeUrl, 
              '_blank', 
              'width=600,height=600,toolbar=no,menubar=no,location=no,status=no'
            );
            
            if (memeWindow) {
              // Show meme notice with updated instructions
              const memeNotice = this.overlay?.querySelector('.reply-guy-meme-notice') as HTMLElement;
              if (memeNotice) {
                memeNotice.innerHTML = '🖼️ Meme opened in new window! Right-click the image and save it, then drag into X or use the photo button';
                memeNotice.style.display = 'block';
              }
              
              console.log('[ReplyGuy] Meme opened in new window');
              
              // Focus back on the main window after a short delay
              setTimeout(() => {
                window.focus();
              }, 100);
            } else {
              // Popup was blocked, fall back to opening in new tab
              window.open(memeUrl, '_blank');
              
              const memeNotice = this.overlay?.querySelector('.reply-guy-meme-notice') as HTMLElement;
              if (memeNotice) {
                memeNotice.innerHTML = '🖼️ Meme opened in new tab! Right-click to save it, then return here to paste your reply';
                memeNotice.style.display = 'block';
              }
              
              console.log('[ReplyGuy] Meme opened in new tab (popup blocked)');
            }
          } catch (openError) {
            console.error('[ReplyGuy] Failed to open meme in new window:', openError);
            // Show the URL so user can manually open it
            const memeNotice = this.overlay?.querySelector('.reply-guy-meme-notice') as HTMLElement;
            if (memeNotice) {
              memeNotice.innerHTML = `🖼️ <a href="${memeUrl}" target="_blank" style="color: #0c5460; text-decoration: underline;">Click here to open meme</a> - then right-click to save`;
              memeNotice.style.display = 'block';
            }
          }
        }
        
        // Focus on the reply textbox
        const replyBox = document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement ||
                       document.querySelector('[role="textbox"][contenteditable="true"]') as HTMLElement ||
                       this.container.querySelector('[role="textbox"]') as HTMLElement;
        
        if (replyBox) {
          replyBox.focus();
        }
        
        // Auto-close after showing the success message (longer if meme present)
        const closeDelay = memeUrl ? 3500 : 2500;
        setTimeout(() => {
          this.remove();
        }, closeDelay);
        
      } catch (err) {
        console.error('[ReplyGuy] Failed to copy to clipboard:', err);
        alert('Failed to copy. Please select the text and copy manually.');
      }
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);

    document.body.appendChild(this.overlay);
  }

  show(suggestions: string[], onSelect: (suggestion: string) => void) {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <style>
        .reply-guy-overlay {
          position: absolute;
          z-index: 10000;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
          padding: 16px;
          max-width: 500px;
          margin-top: 8px;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .reply-guy-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e9ecef;
        }

        .reply-guy-title {
          display: flex;
          align-items: center;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .reply-guy-logo {
          width: 20px;
          height: 20px;
          margin-right: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
        }

        .reply-guy-close {
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          cursor: pointer;
          color: #6c757d;
          font-size: 20px;
          line-height: 1;
          transition: color 0.2s;
        }

        .reply-guy-close:hover {
          color: #1a1a1a;
        }

        .reply-guy-suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reply-guy-suggestion {
          padding: 12px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          line-height: 1.5;
          color: #1a1a1a;
        }

        .reply-guy-suggestion:hover {
          background: #e9ecef;
          border-color: #667eea;
          transform: translateX(4px);
        }

        .reply-guy-loading {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }

        .reply-guy-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <div class="reply-guy-logo"></div>
          Reply Suggestions
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      <div class="reply-guy-suggestions">
        ${suggestions.map((suggestion, index) => `
          <div class="reply-guy-suggestion" data-index="${index}">
            ${this.escapeHtml(suggestion)}
          </div>
        `).join('')}
      </div>
    `;

    // Position the overlay
    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = `${rect.bottom + window.scrollY}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;

    // Add event listeners
    this.overlay.querySelector('.reply-guy-close')?.addEventListener('click', () => this.remove());
    
    this.overlay.querySelectorAll('.reply-guy-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.getAttribute('data-index') || '0');
        onSelect(suggestions[index]);
        this.remove();
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);

    document.body.appendChild(this.overlay);
  }

  showLoading() {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <style>
        ${this.getComprehensiveStyles()}
      </style>
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <svg viewBox="0 0 24 24" class="reply-guy-logo-icon">
            <rect width="24" height="24" rx="4" fill="url(#rg-gradient)"/>
            <defs>
              <linearGradient id="rg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea" />
                <stop offset="100%" style="stop-color:#764ba2" />
              </linearGradient>
            </defs>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white">RG</text>
          </svg>
          <span>Reply Guy</span>
        </div>
      </div>
      <div class="reply-guy-loading">
        <img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" alt="Generating..." />
        <div class="reply-guy-loading-text">
          Crafting the perfect reply
          <span class="reply-guy-loading-dots">
            <span class="reply-guy-loading-dot"></span>
            <span class="reply-guy-loading-dot"></span>
            <span class="reply-guy-loading-dot"></span>
          </span>
        </div>
      </div>
    `;

    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    
    // Use same positioning logic for consistency
    const overlayHeight = window.innerHeight * 0.8; // 80% of viewport
    const availableHeight = window.innerHeight - rect.bottom - 16;
    
    if (availableHeight < overlayHeight && rect.top > overlayHeight) {
      this.overlay.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      this.overlay.style.top = 'auto';
    } else {
      this.overlay.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - overlayHeight)}px`;
    }
    
    this.overlay.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
    this.overlay.style.width = '400px';

    document.body.appendChild(this.overlay);
  }

  showError(error: string) {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <style>
        ${this.getComprehensiveStyles()}
        .reply-guy-error {
          padding: 20px;
          text-align: center;
          color: #dc3545;
          font-size: 14px;
          line-height: 1.5;
        }
        .reply-guy-error-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
      </style>
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <svg viewBox="0 0 24 24" class="reply-guy-logo-icon">
            <rect width="24" height="24" rx="4" fill="url(#rg-gradient)"/>
            <defs>
              <linearGradient id="rg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea" />
                <stop offset="100%" style="stop-color:#764ba2" />
              </linearGradient>
            </defs>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white">RG</text>
          </svg>
          <span>Reply Guy</span>
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      <div class="reply-guy-error">
        <div class="reply-guy-error-icon">⚠️</div>
        ${this.escapeHtml(error)}
      </div>
    `;

    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    
    // Use same positioning logic for consistency
    const overlayHeight = window.innerHeight * 0.8; // 80% of viewport
    const availableHeight = window.innerHeight - rect.bottom - 16;
    
    if (availableHeight < overlayHeight && rect.top > overlayHeight) {
      this.overlay.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      this.overlay.style.top = 'auto';
    } else {
      this.overlay.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - overlayHeight)}px`;
    }
    
    this.overlay.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
    this.overlay.style.width = '400px';

    this.overlay.querySelector('.reply-guy-close')?.addEventListener('click', () => this.remove());

    document.body.appendChild(this.overlay);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    // Don't close if clicking on the reply button area or the overlay itself
    const target = e.target as HTMLElement;
    const isReplyArea = target.closest('[data-testid="reply"]') || target.closest('[role="group"]');
    
    if (this.overlay && !this.overlay.contains(target) && !isReplyArea) {
      this.remove();
    }
  };

  remove() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showResearchSuggestions() {
    const suggestionsContainer = this.overlay?.querySelector('#reply-guy-research-suggestions') as HTMLElement;
    const chipsContainer = this.overlay?.querySelector('.reply-guy-suggestion-chips') as HTMLElement;
    const perplexityInput = this.overlay?.querySelector('#reply-guy-perplexity') as HTMLTextAreaElement;
    
    if (!suggestionsContainer || !chipsContainer || !this.researchSuggestions.length) return;
    
    suggestionsContainer.style.display = 'block';
    chipsContainer.innerHTML = '';
    
    this.researchSuggestions.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'reply-guy-suggestion-chip';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        this.perplexityGuidance = suggestion;
        if (perplexityInput) {
          perplexityInput.value = suggestion;
        }
      });
      chipsContainer.appendChild(chip);
    });
  }

  private insertGeneratedReply(container: Element, reply: string) {
    // Find the X/Twitter compose textbox - it could be in various places
    const textbox = document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement ||
                   document.querySelector('[role="textbox"][contenteditable="true"]') as HTMLElement ||
                   container.querySelector('[role="textbox"]') as HTMLElement;
    
    if (textbox) {
      // Focus the textbox first
      textbox.focus();
      
      // Clear existing content using React-compatible method
      const clearEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteContentBackward',
      });
      textbox.dispatchEvent(clearEvent);
      textbox.textContent = '';
      
      // Method 1: Try using the Clipboard API to simulate paste
      // This often works better with React-based apps
      try {
        if (navigator.clipboard && window.isSecureContext) {
          // First try to use clipboard API
          navigator.clipboard.writeText(reply).then(() => {
            // Focus and select all
            textbox.focus();
            const range = document.createRange();
            range.selectNodeContents(textbox);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            
            // Simulate paste event
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            
            // Some browsers don't allow setting clipboardData, so we use execCommand as backup
            document.execCommand('insertText', false, reply);
            
            console.log('[ReplyGuy] Inserted reply using clipboard method');
          }).catch(() => {
            // Fallback to method 2
            this.insertUsingInputEvents(textbox, reply);
          });
          return;
        }
      } catch (error) {
        console.log('[ReplyGuy] Clipboard API not available, using input events');
      }
      
      // Method 2: Simulate typing character by character
      this.insertUsingInputEvents(textbox, reply);
    } else {
      console.error('[ReplyGuy] Could not find compose textbox');
    }
  }
  
  private insertUsingInputEvents(textbox: HTMLElement, text: string) {
    // Focus the textbox
    textbox.focus();
    
    // For React-based apps, we need to trigger the proper sequence of events
    // that mimics actual user typing
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 
      'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 
      'value'
    )?.set;
    
    if (nativeInputValueSetter && (textbox instanceof HTMLInputElement || textbox instanceof HTMLTextAreaElement)) {
      // For input/textarea elements
      nativeInputValueSetter.call(textbox, text);
      
      // Trigger React's onChange
      const event = new Event('input', { bubbles: true });
      textbox.dispatchEvent(event);
    } else {
      // For contenteditable elements (which X uses)
      // We need to properly set the text and trigger events
      
      // Set the text content
      textbox.textContent = text;
      
      // Create a proper range at the end of the text
      const range = document.createRange();
      const textNode = textbox.firstChild || textbox;
      range.setStart(textNode, textbox.textContent.length);
      range.setEnd(textNode, textbox.textContent.length);
      
      // Update selection
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Dispatch a series of events that React expects
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      
      const beforeInputEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      
      // Fire events in the correct order
      textbox.dispatchEvent(beforeInputEvent);
      textbox.dispatchEvent(inputEvent);
      
      // Also fire a compositionend event which X sometimes listens for
      const compositionEvent = new CompositionEvent('compositionend', {
        bubbles: true,
        cancelable: true,
        data: text
      });
      textbox.dispatchEvent(compositionEvent);
    }
    
    // Keep focus
    textbox.focus();
    
    console.log('[ReplyGuy] Inserted reply using input events');
  }
}