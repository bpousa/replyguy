import './suggestions-overlay.css';

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
  private currentReplyData: any = null;
  private originalTweet: string = '';
  private memeTextMode: 'exact' | 'enhance' = 'exact';
  private tweet: string = '';
  private userPlan: any = null;
  private usageLimits: any = null;
  private isSuggestingIdea: boolean = false;
  private isSuggestingResearch: boolean = false;
  private researchSuggestions: string[] = [];
  private useCustomStyle: boolean | undefined = false;
  private enableStyleMatching: boolean = true; // Default to true like the main dashboard
  private defaultSettings: { responseType?: string; tone?: string } = {};

  constructor(container: Element) {
    this.container = container;
  }

  private getReplyLengthLimit(replyLength: string): number {
    switch (replyLength) {
      case 'short':
        return 280;
      case 'medium':
        return 560;
      case 'long':
        return 1000;
      case 'extra-long':
        return 2000;
      default:
        return 280;
    }
  }

  private async saveUserSettings() {
    if (!chrome?.storage?.sync) return;
    
    try {
      await chrome.storage.sync.set({
        replyGuySettings: {
          responseType: this.responseType,
          tone: this.tone,
          replyLength: this.replyLength,
          needsResearch: this.needsResearch,
          includeMemes: this.includeMeme,
          useCustomStyle: this.useCustomStyle,
          enableStyleMatching: this.enableStyleMatching
        }
      });
      console.log('[ReplyGuy] Saved user settings');
    } catch (error) {
      console.error('[ReplyGuy] Failed to save settings:', error);
    }
  }

  private async loadUserSettings() {
    if (!chrome?.storage?.sync) return;
    
    try {
      const result = await chrome.storage.sync.get(['replyGuySettings']);
      if (result.replyGuySettings) {
        const settings = result.replyGuySettings;
        console.log('[ReplyGuy] Loading saved settings:', settings);
        
        // Log each setting as it's applied
        this.responseType = settings.responseType || this.responseType;
        console.log('[ReplyGuy] - responseType:', this.responseType);
        
        this.tone = settings.tone || this.tone;
        console.log('[ReplyGuy] - tone:', this.tone);
        
        this.replyLength = settings.replyLength || this.replyLength;
        console.log('[ReplyGuy] - replyLength:', this.replyLength);
        
        this.needsResearch = settings.needsResearch ?? this.needsResearch;
        console.log('[ReplyGuy] - needsResearch:', this.needsResearch);
        
        this.includeMeme = settings.includeMemes ?? this.includeMeme;
        console.log('[ReplyGuy] - includeMeme:', this.includeMeme);
        
        this.useCustomStyle = settings.useCustomStyle ?? this.useCustomStyle;
        console.log('[ReplyGuy] - useCustomStyle:', this.useCustomStyle);
        
        this.enableStyleMatching = settings.enableStyleMatching ?? this.enableStyleMatching;
        console.log('[ReplyGuy] - enableStyleMatching:', this.enableStyleMatching);
      } else {
        console.log('[ReplyGuy] No saved settings found, using defaults');
      }
    } catch (error) {
      console.error('[ReplyGuy] Failed to load settings:', error);
    }
  }

  async showOptions(tweet: string, onGenerate: (data: any) => void) {
    this.remove();
    this.tweet = tweet;
    this.originalTweet = tweet;
    
    // Load saved user settings
    await this.loadUserSettings();
    
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
        this.showError('Reply Guy extension needs to be refreshed. Please reload this page.');
        return;
      }
      console.error('[ReplyGuy] Failed to get user plan:', error);
    }
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" class="reply-guy-logo-icon" alt="Reply Guy" />
          <span>Reply Guy</span>
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      
      <div class="reply-guy-content-scroll">
        <!-- Tweet Preview -->
        <div class="reply-guy-tweet-section">
          <div class="reply-guy-tweet-preview">
            ${this.escapeHtml(tweet)}
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
        </div>
        
        <!-- Core Controls: Type, Tone, Length -->
        <div class="reply-guy-grid-3-col">
          <!-- Response Type -->
          <div class="reply-guy-option-group">
            <label class="reply-guy-option-label" for="reply-guy-response-type">Type</label>
            <select class="reply-guy-select" id="reply-guy-response-type">
              <option value="agree">👍 Agree</option>
              <option value="disagree">🤔 Disagree</option>
              <option value="neutral" selected>💭 Neutral</option>
              <option value="other">✨ Creative</option>
            </select>
          </div>
          
          <!-- Tone -->
          <div class="reply-guy-option-group">
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
          
          <!-- Reply Length -->
          <div class="reply-guy-option-group">
            <label class="reply-guy-option-label" for="reply-guy-length">Length</label>
            <select class="reply-guy-select" id="reply-guy-length">
              <option value="short">Short (280)</option>
              <option value="medium" ${!this.userPlan?.enable_long_replies ? 'disabled' : ''}>Medium (560) ${!this.userPlan?.enable_long_replies ? '🔒' : ''}</option>
              <option value="long" ${!this.userPlan?.enable_long_replies ? 'disabled' : ''}>Long (1000) ${!this.userPlan?.enable_long_replies ? '🔒' : ''}</option>
              <option value="extra-long" ${!this.userPlan?.enable_long_replies || this.userPlan?.max_reply_length < 2000 ? 'disabled' : ''}>Extra Long (2000) ${!this.userPlan?.enable_long_replies || this.userPlan?.max_reply_length < 2000 ? '🔒' : ''}</option>
            </select>
          </div>
        </div>
        
        <!-- Feature Toggles -->
        <div class="reply-guy-features-grid">
          ${this.userPlan?.enable_write_like_me !== false ? `
          <div class="reply-guy-option-group">
            <label class="reply-guy-checkbox">
              <input type="checkbox" id="reply-guy-write-like-me">
              <span>Write like me ✍️</span>
            </label>
          </div>
          ` : ''}
          
          ${this.userPlan?.enable_style_matching !== false ? `
          <div class="reply-guy-option-group">
            <label class="reply-guy-checkbox">
              <input type="checkbox" id="reply-guy-match-style">
              <span>Match tweet style 🎨</span>
            </label>
          </div>
          ` : ''}
          
          ${this.userPlan?.enable_perplexity_guidance !== false ? `
          <div class="reply-guy-option-group">
            <label class="reply-guy-checkbox">
              <input type="checkbox" id="reply-guy-research">
              <span>Add research 🔍</span>
            </label>
          </div>
          ` : ''}
          
          ${this.userPlan?.enable_memes !== false ? `
          <div class="reply-guy-option-group">
            <label class="reply-guy-checkbox">
              <input type="checkbox" id="reply-guy-meme">
              <span>Add a meme 🎭</span>
            </label>
          </div>
          ` : ''}
        </div>
        
        <!-- Conditional Sections for Research and Meme -->
        <div id="reply-guy-research-section" class="reply-guy-collapsible-section" style="display: none;">
          <div class="reply-guy-label-with-action">
            <label class="reply-guy-option-label" for="reply-guy-perplexity">Research Guidance (Optional)</label>
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
        
        <div id="reply-guy-meme-options" class="reply-guy-collapsible-section" style="display: none;">
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
      
      <!-- Footer Actions and Usage -->
      <div class="reply-guy-footer">
        <div class="reply-guy-actions">
          <button class="reply-guy-generate-btn" id="reply-guy-generate">
            Generate Reply
          </button>
        </div>
        <label class="reply-guy-checkbox reply-guy-save-defaults-checkbox">
          <input type="checkbox" id="reply-guy-save-defaults">
          <span>Save as default settings</span>
        </label>
        
        ${this.usageLimits ? `
        <div class="reply-guy-usage-stats">
          <div class="reply-guy-usage-item">
            <span>Replies:</span>
            <span class="reply-guy-usage-value">${(this.usageLimits.repliesTotal || 0) - (this.usageLimits.repliesRemaining || 0)} / ${this.usageLimits.repliesTotal || 0}</span>
          </div>
          ${this.usageLimits.dailyCount !== undefined ? `
          <div class="reply-guy-usage-item">
            <span>Daily Goal:</span>
            <span class="reply-guy-usage-value">${this.usageLimits.dailyCount || 0} / ${this.usageLimits.dailyGoal || 10}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
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
    if (responseTypeSelect) {
      responseTypeSelect.value = this.responseType;
      responseTypeSelect.addEventListener('change', () => {
        this.responseType = responseTypeSelect.value;
        console.log('[ReplyGuy] Response type changed to:', this.responseType);
      });
    }
    
    // Tone selection
    const toneSelect = this.overlay.querySelector('#reply-guy-tone') as HTMLSelectElement;
    if (toneSelect) {
      toneSelect.value = this.tone;
      toneSelect.addEventListener('change', () => {
        this.tone = toneSelect.value;
        console.log('[ReplyGuy] Tone changed to:', this.tone);
      });
    }
    
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
        this.showInlineError('Please wait for tweet to load');
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
            this.showInlineError('You have reached your suggestion limit. Please upgrade your plan.');
          } else {
            this.showInlineError('Failed to generate suggestion. Please try again.');
          }
        }
      } catch (error) {
        console.error('[ReplyGuy] Suggest error:', error);
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          this.showInlineError('Reply Guy extension needs to be refreshed. Please reload this page.');
        } else {
          this.showInlineError('An error occurred. Please try again.');
        }
      } finally {
        if (suggestBtn && this.overlay) {
          suggestBtn.disabled = false;
          suggestBtn.innerHTML = originalContent;
        }
      }
    });
    
    // Reply length selection
    const lengthSelect = this.overlay.querySelector('#reply-guy-length') as HTMLSelectElement;
    if (lengthSelect) {
      lengthSelect.value = this.replyLength;
      lengthSelect.addEventListener('change', () => {
        this.replyLength = lengthSelect.value;
        console.log('[ReplyGuy] Reply length changed to:', this.replyLength);
      });
    }
    
    // Research toggle
    const researchCheckbox = this.overlay.querySelector('#reply-guy-research') as HTMLInputElement;
    const researchSection = this.overlay.querySelector('#reply-guy-research-section') as HTMLElement;
    const perplexityInput = this.overlay.querySelector('#reply-guy-perplexity') as HTMLTextAreaElement;
    
    if (researchCheckbox) {
      researchCheckbox.checked = this.needsResearch;
      if (researchSection) {
        researchSection.style.display = this.needsResearch ? 'block' : 'none';
      }
      researchCheckbox.addEventListener('change', () => {
        this.needsResearch = researchCheckbox.checked;
        if (researchSection) {
          researchSection.style.display = this.needsResearch ? 'block' : 'none';
        }
      });
    }
    
    perplexityInput?.addEventListener('input', () => {
      this.perplexityGuidance = perplexityInput.value;
    });
    
    // Research suggest button
    this.overlay.querySelector('#reply-guy-suggest-research')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.tweet.trim() || !this.responseIdea.trim()) {
        this.showInlineError('Please enter a tweet and response idea first');
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
          this.showInlineError('Reply Guy extension needs to be refreshed. Please reload this page.');
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
    
    // Check if memes are available and set initial state
    if (memeCheckbox && this.userPlan) {
      const memesAvailable = this.userPlan.memes_used < this.userPlan.meme_limit;
      memeCheckbox.disabled = !memesAvailable;
      if (!memesAvailable) {
        const label = memeCheckbox.parentElement;
        if (label) {
          label.style.opacity = '0.5';
          label.style.cursor = 'not-allowed';
        }
      } else {
        // Set initial checked state if memes are available
        memeCheckbox.checked = this.includeMeme;
        if (memeOptions) {
          memeOptions.style.display = this.includeMeme ? 'block' : 'none';
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
    if (writeLikeMeCheckbox) {
      writeLikeMeCheckbox.checked = this.useCustomStyle || false;
      console.log('[ReplyGuy] Write Like Me initial state:', this.useCustomStyle);
      writeLikeMeCheckbox.addEventListener('change', () => {
        this.useCustomStyle = writeLikeMeCheckbox.checked;
        console.log('[ReplyGuy] Write Like Me changed to:', this.useCustomStyle);
      });
    } else {
      // If checkbox doesn't exist (user plan doesn't support it), explicitly set to false
      this.useCustomStyle = false;
      console.log('[ReplyGuy] Write Like Me feature not available in user plan');
    }
    
    // Match Tweet Style checkbox
    const matchStyleCheckbox = this.overlay.querySelector('#reply-guy-match-style') as HTMLInputElement;
    if (matchStyleCheckbox) {
      // Set initial value and default to true (matching the main dashboard behavior)
      matchStyleCheckbox.checked = this.enableStyleMatching !== false;
      this.enableStyleMatching = matchStyleCheckbox.checked;
      console.log('[ReplyGuy] Match Tweet Style initial state:', this.enableStyleMatching);
      matchStyleCheckbox.addEventListener('change', () => {
        this.enableStyleMatching = matchStyleCheckbox.checked;
        console.log('[ReplyGuy] Match Tweet Style changed to:', this.enableStyleMatching);
      });
    } else {
      // If checkbox doesn't exist (user plan doesn't support it), explicitly set to false
      this.enableStyleMatching = false;
      console.log('[ReplyGuy] Match Tweet Style feature not available in user plan');
    }
    
    // Generate button
    this.overlay.querySelector('#reply-guy-generate')?.addEventListener('click', async () => {
      // Validate minimum requirements
      if (!this.responseIdea.trim()) {
        this.showInlineError('Please describe what you want to say');
        return;
      }
      
      // Truncate tweet to respect user plan limits
      const maxTweetLength = this.userPlan?.max_tweet_length || 280;
      const truncatedTweet = this.tweet.length > maxTweetLength 
        ? this.tweet.substring(0, maxTweetLength) + '...'
        : this.tweet;
      
      const data: any = {
        originalTweet: truncatedTweet,
        responseIdea: this.responseIdea,
        responseType: this.responseType,
        tone: this.tone,
        replyLength: this.replyLength,
        needsResearch: this.needsResearch,
        includeMeme: this.includeMeme,
        useCustomStyle: this.useCustomStyle || false,
        enableStyleMatching: this.enableStyleMatching || false
      };
      
      // Only add optional fields if they have values
      if (this.needsResearch && this.perplexityGuidance) {
        data.perplexityGuidance = this.perplexityGuidance;
      }
      if (this.includeMeme && this.memeText) {
        data.memeText = this.memeText;
        data.memeTextMode = this.memeTextMode;
      }
      
      // Add user ID if available from auth state
      if (chrome?.runtime?.id) {
        try {
          const authResponse = await chrome.runtime.sendMessage({ action: 'checkAuth' });
          if (authResponse?.success && authResponse.data?.user?.id) {
            data.userId = authResponse.data.user.id;
          }
        } catch (error) {
          console.error('[ReplyGuy] Failed to get user ID:', error);
        }
      }
      
      // Log each field to debug validation
      console.log('[ReplyGuy] ===== VALIDATION DEBUG =====');
      console.log('[ReplyGuy] originalTweet:', data.originalTweet, 'type:', typeof data.originalTweet, 'length:', data.originalTweet?.length);
      console.log('[ReplyGuy] responseIdea:', data.responseIdea, 'type:', typeof data.responseIdea, 'length:', data.responseIdea?.length);
      console.log('[ReplyGuy] responseType:', data.responseType, 'type:', typeof data.responseType);
      console.log('[ReplyGuy] tone:', data.tone, 'type:', typeof data.tone);
      console.log('[ReplyGuy] needsResearch:', data.needsResearch, 'type:', typeof data.needsResearch);
      console.log('[ReplyGuy] replyLength:', data.replyLength, 'type:', typeof data.replyLength);
      console.log('[ReplyGuy] includeMeme:', data.includeMeme, 'type:', typeof data.includeMeme);
      console.log('[ReplyGuy] useCustomStyle:', data.useCustomStyle, 'type:', typeof data.useCustomStyle);
      console.log('[ReplyGuy] enableStyleMatching:', data.enableStyleMatching, 'type:', typeof data.enableStyleMatching);
      console.log('[ReplyGuy] perplexityGuidance:', data.perplexityGuidance, 'type:', typeof data.perplexityGuidance);
      console.log('[ReplyGuy] memeText:', data.memeText, 'type:', typeof data.memeText);
      console.log('[ReplyGuy] memeTextMode:', data.memeTextMode, 'type:', typeof data.memeTextMode);
      console.log('[ReplyGuy] userId:', data.userId, 'type:', typeof data.userId);
      console.log('[ReplyGuy] Full data object:', JSON.stringify(data, null, 2));
      console.log('[ReplyGuy] ===== END VALIDATION DEBUG =====');
      
      // Save defaults if checkbox is checked
      const saveDefaultsCheckbox = this.overlay?.querySelector('#reply-guy-save-defaults') as HTMLInputElement;
      if (saveDefaultsCheckbox?.checked) {
        this.saveUserSettings();
      }
      
      onGenerate(data);
    });
  }


  showGeneratedReply(reply: string, memeUrl?: string, replyData?: any) {
    this.remove();
    
    // Store the reply data for potential corrections, including reply length
    this.currentReplyData = {
      ...(replyData || {}),
      replyLength: this.replyLength
    };
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" class="reply-guy-logo-icon" alt="Reply Guy" />
          <span>Your Reply is Ready!</span>
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      
      <div class="reply-guy-content-scroll">
        <div class="reply-guy-reply-text">
          ${this.escapeHtml(reply)}
        </div>
        
        ${memeUrl ? `
        <div class="reply-guy-meme-preview">
          <img src="${memeUrl}" alt="Generated meme" />
        </div>
        ` : ''}
      </div>
      
      <div class="reply-guy-result-footer">
        <div class="reply-guy-result-actions">
          <button class="reply-guy-copy-btn">${memeUrl ? '📋 Copy & Download' : '📋 Copy Reply'}</button>
          <button class="reply-guy-edit-btn">✏️ Edit</button>
        </div>
        
        <div class="reply-guy-copy-notice reply-guy-notice" style="display: none;">
          ✅ Reply copied! Click in the reply box and paste with <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong> on Mac)
        </div>
        
        ${memeUrl ? `
        <div class="reply-guy-meme-notice reply-guy-notice" style="display: none;">
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
    const editBtn = this.overlay.querySelector('.reply-guy-edit-btn') as HTMLButtonElement;
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
        
        // Check if daily goal was reached with this reply
        try {
          const limitsResponse = await chrome.runtime.sendMessage({ action: 'getUsageLimits' });
          if (limitsResponse.success && limitsResponse.data) {
            const { dailyCount, dailyGoal } = limitsResponse.data;
            if (dailyCount !== undefined && dailyGoal !== undefined && dailyCount >= dailyGoal) {
              // Check if we should show celebration (once per day)
              const today = new Date().toDateString();
              const celebrationKey = `celebration_shown_${today}`;
              
              chrome.storage.local.get(celebrationKey, (data) => {
                if (!data[celebrationKey]) {
                  // Send message to trigger celebration in popup if it's open
                  chrome.runtime.sendMessage({ action: 'triggerPopupCelebration' });
                  chrome.storage.local.set({ [celebrationKey]: true });
                }
              });
            }
          }
        } catch (error) {
          console.error('[ReplyGuy] Failed to check celebration status:', error);
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
        
        // Auto-close after showing the success message
        const closeDelay = 1500; // Reduced to 1.5s for better UX
        setTimeout(() => {
          this.remove();
        }, closeDelay);
        
      } catch (err) {
        console.error('[ReplyGuy] Failed to copy to clipboard:', err);
        this.showInlineError('Failed to copy. Please select the text and copy manually.', 5000);
      }
    });

    // Add edit button listener
    editBtn?.addEventListener('click', () => {
      this.showEditMode(reply);
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);

    document.body.appendChild(this.overlay);
  }

  showEditMode(currentReply: string) {
    this.remove();
    
    // Get the character limit based on the original reply length
    const replyLength = this.currentReplyData?.replyLength || this.replyLength || 'short';
    const charLimit = this.getReplyLengthLimit(replyLength);
    
    // Create edit mode overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" class="reply-guy-logo-icon" alt="Reply Guy" />
          <span>Improve Your Writing Style</span>
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      
      <div class="reply-guy-edit-container">
        <div class="reply-guy-edit-section" style="background: #f0f7ff; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #536471; line-height: 1.5;">
            Edit the reply to match how YOU would write it. When you save, your edited reply will be <strong>automatically copied</strong> to the clipboard and your feedback will help improve your writing style.
          </p>
        </div>
        
        <div class="reply-guy-edit-section">
          <label class="reply-guy-edit-label">Original Tweet</label>
          <div class="reply-guy-context-box">
            ${this.escapeHtml(this.originalTweet || 'Tweet content not available')}
          </div>
        </div>
        
        <div class="reply-guy-edit-section">
          <label class="reply-guy-edit-label">Your Idea</label>
          <div class="reply-guy-context-box">
            ${this.escapeHtml(this.responseIdea || 'Response idea not available')}
          </div>
        </div>
        
        <div class="reply-guy-edit-section">
          <label class="reply-guy-edit-label" for="reply-guy-edited-reply">
            ✨ Edit to match your style
          </label>
          <textarea 
            id="reply-guy-edited-reply" 
            class="reply-guy-edit-textarea"
            placeholder="Edit this to match how YOU would write it"
            maxlength="${charLimit}"
          >${this.escapeHtml(currentReply)}</textarea>
          <div class="reply-guy-char-count">
            <span id="reply-guy-char-current">${currentReply.length}</span>/${charLimit} characters
          </div>
        </div>
        
        <div class="reply-guy-edit-section">
          <label class="reply-guy-edit-label" for="reply-guy-correction-notes">
            What did we get wrong? (Optional)
          </label>
          <input 
            type="text"
            id="reply-guy-correction-notes" 
            class="reply-guy-edit-input"
            placeholder="e.g., 'Too formal' or 'I never use exclamation marks'"
          />
        </div>
        
        <div class="reply-guy-edit-actions">
          <button class="reply-guy-cancel-btn">Cancel</button>
          <button class="reply-guy-save-btn" id="reply-guy-save-edit">Save & Copy Edited Reply</button>
        </div>
      </div>
    `;
    
    // Position the overlay
    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    
    // Center the edit overlay
    const overlayWidth = 520;
    const overlayHeight = Math.min(window.innerHeight * 0.8, 600);
    
    this.overlay.style.top = '50%';
    this.overlay.style.left = '50%';
    this.overlay.style.transform = 'translate(-50%, -50%)';
    this.overlay.style.width = `${overlayWidth}px`;
    this.overlay.style.maxHeight = `${overlayHeight}px`;
    this.overlay.style.overflowY = 'auto';
    
    // Add event listeners
    const closeBtn = this.overlay.querySelector('.reply-guy-close');
    const cancelBtn = this.overlay.querySelector('.reply-guy-cancel-btn');
    const saveBtn = this.overlay.querySelector('#reply-guy-save-edit') as HTMLButtonElement;
    const editTextarea = this.overlay.querySelector('#reply-guy-edited-reply') as HTMLTextAreaElement;
    const charCount = this.overlay.querySelector('#reply-guy-char-current') as HTMLSpanElement;
    const notesInput = this.overlay.querySelector('#reply-guy-correction-notes') as HTMLInputElement;
    
    // Close handlers
    closeBtn?.addEventListener('click', () => this.remove());
    cancelBtn?.addEventListener('click', () => this.remove());
    
    // Character count update
    editTextarea?.addEventListener('input', () => {
      const length = editTextarea.value.length;
      if (charCount) {
        charCount.textContent = length.toString();
      }
      
      // Enable/disable save button based on changes
      if (saveBtn) {
        saveBtn.disabled = editTextarea.value.trim() === currentReply.trim();
      }
    });
    
    // Save handler
    saveBtn?.addEventListener('click', async () => {
      const editedReply = editTextarea.value.trim();
      const correctionNotes = notesInput.value.trim();
      
      if (editedReply === currentReply.trim()) {
        return;
      }
      
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      
      try {
        // Send correction to background script
        const response = await chrome.runtime.sendMessage({
          action: 'submitCorrection',
          data: {
            styleId: this.currentReplyData?.styleId || undefined,
            originalTweet: this.originalTweet || this.tweet,
            responseIdea: this.responseIdea,
            replyType: this.currentReplyData?.replyType || this.responseType,
            tone: this.currentReplyData?.tone || this.tone,
            generatedReply: currentReply,
            correctedReply: editedReply,
            correctionNotes: correctionNotes
          }
        });
        
        if (response.success) {
          // Copy edited reply to clipboard
          try {
            await navigator.clipboard.writeText(editedReply);
            
            // Show success message with copy confirmation
            saveBtn.textContent = '✅ Saved & Copied!';
            
            // Add copy notice to the UI
            const editContainer = this.overlay?.querySelector('.reply-guy-edit-container');
            if (editContainer) {
              const successNotice = document.createElement('div');
              successNotice.className = 'reply-guy-copy-notice reply-guy-notice';
              successNotice.style.marginTop = '16px';
              successNotice.innerHTML = '✅ Your edited reply has been copied to clipboard and your feedback saved!<br><strong>Paste it with Ctrl+V (or Cmd+V on Mac)</strong>';
              editContainer.appendChild(successNotice);
            }
            
            // Close after a brief delay to let user see the success
            setTimeout(() => {
              this.remove();
            }, 1500);
          } catch (copyError) {
            // If copy fails, still show success but warn about copy
            console.error('[ReplyGuy] Failed to copy to clipboard:', copyError);
            saveBtn.textContent = '✅ Saved! (Copy manually)';
            
            // Select the text so user can copy manually
            editTextarea?.select();
            
            setTimeout(() => {
              this.remove();
            }, 3000);
          }
        } else {
          throw new Error(response.error || 'Failed to save correction');
        }
      } catch (error) {
        console.error('[ReplyGuy] Failed to save correction:', error);
        saveBtn.textContent = 'Failed - Try Again';
        saveBtn.disabled = false;
        setTimeout(() => {
          saveBtn.textContent = 'Save & Copy Edited Reply';
        }, 2000);
      }
    });
    
    // Focus on textarea
    setTimeout(() => {
      editTextarea?.focus();
      editTextarea?.setSelectionRange(editTextarea.value.length, editTextarea.value.length);
    }, 100);
    
    document.body.appendChild(this.overlay);
  }

  show(suggestions: string[], onSelect: (suggestion: string) => void) {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay reply-guy-suggestions-list';
    this.overlay.innerHTML = `
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
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" class="reply-guy-logo-icon" alt="Reply Guy" />
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

  showInlineError(error: string, duration: number = 3000) {
    // Show a temporary error message without removing existing overlay
    const errorDiv = document.createElement('div');
    errorDiv.className = 'reply-guy-inline-error';
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
    errorDiv.textContent = error;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, duration);
  }
  
  showError(error: string) {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <img src="${chrome.runtime.getURL('icons/reply_guy_logo.png')}" class="reply-guy-logo-icon" alt="Reply Guy" />
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