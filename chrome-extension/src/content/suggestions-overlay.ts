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
  private memeTextMode: 'tweet' | 'reply' | 'custom' = 'tweet';
  private tweet: string = '';
  private userPlan: any = null;

  constructor(container: Element) {
    this.container = container;
  }

  async showOptions(tweet: string, onGenerate: (data: any) => void) {
    this.remove();
    this.tweet = tweet;
    
    // Get user's plan to show/hide features
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getUsageLimits' });
      if (response.success) {
        this.userPlan = response.data;
      }
    } catch (error) {
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
            ${this.escapeHtml(tweet.substring(0, 200))}${tweet.length > 200 ? '...' : ''}
          </div>
        </details>
        
        <!-- Main Options -->
        <div class="reply-guy-main-section">
          <!-- Response Type -->
          <div class="reply-guy-option-group">
            <label class="reply-guy-option-label">Response Type</label>
            <div class="reply-guy-response-types">
              <button class="reply-guy-response-type" data-type="agree">
                <span class="type-emoji">👍</span>
                <span>Agree</span>
              </button>
              <button class="reply-guy-response-type" data-type="disagree">
                <span class="type-emoji">🤔</span>
                <span>Disagree</span>
              </button>
              <button class="reply-guy-response-type active" data-type="neutral">
                <span class="type-emoji">💭</span>
                <span>Neutral</span>
              </button>
              <button class="reply-guy-response-type" data-type="other">
                <span class="type-emoji">✨</span>
                <span>Other</span>
              </button>
            </div>
          </div>
          
          <!-- Tone -->
          <div class="reply-guy-option-group">
            <label class="reply-guy-option-label">Tone</label>
            <select class="reply-guy-tone-select" id="reply-guy-tone">
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
            >${this.responseIdea}</textarea>
            <div class="reply-guy-char-count">
              <span id="idea-char-count">0</span> / <span id="idea-char-limit">200</span>
            </div>
          </div>
        </div>
        
        <!-- Advanced Options -->
        <details class="reply-guy-advanced-section">
          <summary>Advanced Options</summary>
          <div class="reply-guy-advanced-content">
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
              </div>
            </div>
            
            <!-- Perplexity Research -->
            ${this.userPlan?.enable_perplexity_guidance !== false ? `
            <div class="reply-guy-option-group">
              <label class="reply-guy-checkbox">
                <input type="checkbox" id="reply-guy-research">
                <span>Use real-time research 🔍</span>
              </label>
              <input 
                type="text" 
                id="reply-guy-perplexity" 
                class="reply-guy-text-input" 
                placeholder="What should we research?"
                style="display: none; margin-top: 8px;"
              >
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
              </label>
              <div id="reply-guy-meme-options" style="display: none; margin-top: 12px;">
                <div class="reply-guy-meme-mode">
                  <label class="reply-guy-radio">
                    <input type="radio" name="memeMode" value="tweet" checked>
                    <span>From tweet</span>
                  </label>
                  <label class="reply-guy-radio">
                    <input type="radio" name="memeMode" value="reply">
                    <span>From reply</span>
                  </label>
                  <label class="reply-guy-radio">
                    <input type="radio" name="memeMode" value="custom">
                    <span>Custom</span>
                  </label>
                </div>
                <textarea 
                  id="reply-guy-meme-text" 
                  class="reply-guy-text-input" 
                  placeholder="Enter meme text..."
                  rows="2"
                  style="display: none; margin-top: 8px;"
                ></textarea>
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
          ${this.userPlan ? `
          <div class="reply-guy-usage">
            <span>${this.userPlan.repliesRemaining || 0}</span> / <span>${this.userPlan.repliesTotal || 0}</span> replies left
          </div>
          ` : ''}
        </div>
      </div>
    `;

    // Position the overlay
    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 600)}px`;
    this.overlay.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
    this.overlay.style.width = '480px';
    this.overlay.style.maxHeight = '600px';
    this.overlay.style.overflowY = 'auto';

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
    this.overlay.querySelectorAll('.reply-guy-response-type').forEach(btn => {
      btn.addEventListener('click', () => {
        this.overlay?.querySelectorAll('.reply-guy-response-type').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.responseType = btn.getAttribute('data-type') || 'neutral';
      });
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
      const updateCharCount = () => {
        const length = ideaInput.value.length;
        charCount.textContent = length.toString();
        ideaInput.classList.toggle('error', length > 200);
      };
      
      ideaInput.addEventListener('input', () => {
        this.responseIdea = ideaInput.value;
        updateCharCount();
      });
      
      updateCharCount();
    }
    
    // Suggest button
    this.overlay.querySelector('#reply-guy-suggest')?.addEventListener('click', async () => {
      // TODO: Implement AI suggestion
      console.log('[ReplyGuy] Suggest button clicked');
    });
    
    // Reply length selection
    this.overlay.querySelectorAll('input[name="replyLength"]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.replyLength = (e.target as HTMLInputElement).value;
      });
    });
    
    // Research toggle
    const researchCheckbox = this.overlay.querySelector('#reply-guy-research') as HTMLInputElement;
    const perplexityInput = this.overlay.querySelector('#reply-guy-perplexity') as HTMLInputElement;
    
    researchCheckbox?.addEventListener('change', () => {
      this.needsResearch = researchCheckbox.checked;
      if (perplexityInput) {
        perplexityInput.style.display = this.needsResearch ? 'block' : 'none';
      }
    });
    
    perplexityInput?.addEventListener('input', () => {
      this.perplexityGuidance = perplexityInput.value;
    });
    
    // Meme options
    const memeCheckbox = this.overlay.querySelector('#reply-guy-meme') as HTMLInputElement;
    const memeOptions = this.overlay.querySelector('#reply-guy-meme-options') as HTMLElement;
    const memeTextInput = this.overlay.querySelector('#reply-guy-meme-text') as HTMLTextAreaElement;
    
    memeCheckbox?.addEventListener('change', () => {
      this.includeMeme = memeCheckbox.checked;
      if (memeOptions) {
        memeOptions.style.display = this.includeMeme ? 'block' : 'none';
      }
    });
    
    this.overlay.querySelectorAll('input[name="memeMode"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const mode = (e.target as HTMLInputElement).value as 'tweet' | 'reply' | 'custom';
        this.memeTextMode = mode;
        if (memeTextInput) {
          memeTextInput.style.display = mode === 'custom' ? 'block' : 'none';
        }
      });
    });
    
    memeTextInput?.addEventListener('input', () => {
      this.memeText = memeTextInput.value;
    });
    
    // Generate button
    this.overlay.querySelector('#reply-guy-generate')?.addEventListener('click', () => {
      const data = {
        originalTweet: this.tweet,
        responseIdea: this.responseIdea,
        responseType: this.responseType,
        tone: this.tone,
        replyLength: this.replyLength,
        needsResearch: this.needsResearch,
        perplexityGuidance: this.needsResearch ? this.perplexityGuidance : undefined,
        includeMeme: this.includeMeme,
        memeText: this.includeMeme && this.memeTextMode === 'custom' ? this.memeText : undefined,
        memeTextMode: this.includeMeme ? this.memeTextMode : undefined
      };
      
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
      
      .reply-guy-response-types {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .reply-guy-response-type {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
      }
      
      .reply-guy-response-type:hover {
        border-color: #667eea;
        background: #f8f9fa;
        transform: translateY(-1px);
      }
      
      .reply-guy-response-type.active {
        border-color: #667eea;
        background: #667eea;
        color: white;
      }
      
      .type-emoji {
        font-size: 20px;
      }
      
      .reply-guy-tone-select,
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
      
      .reply-guy-tone-select:focus,
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
        }
        .reply-guy-meme-preview img {
          width: 100%;
          max-width: 300px;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .reply-guy-result-actions {
          display: flex;
          gap: 12px;
        }
        .reply-guy-copy-btn,
        .reply-guy-insert-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .reply-guy-copy-btn {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          color: #495057;
        }
        .reply-guy-copy-btn:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }
        .reply-guy-insert-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .reply-guy-insert-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
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
          <button class="reply-guy-copy-btn">Copy to Clipboard</button>
          <button class="reply-guy-insert-btn">Insert Reply</button>
        </div>
      </div>
    `;

    // Position the overlay
    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 400)}px`;
    this.overlay.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
    this.overlay.style.width = '480px';

    // Add event listeners
    this.overlay.querySelector('.reply-guy-close')?.addEventListener('click', () => this.remove());
    
    this.overlay.querySelector('.reply-guy-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(reply).then(() => {
        const btn = this.overlay?.querySelector('.reply-guy-copy-btn');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy to Clipboard';
          }, 2000);
        }
      });
    });
    
    this.overlay.querySelector('.reply-guy-insert-btn')?.addEventListener('click', () => {
      // Insert the reply into the compose area
      const textbox = this.container.querySelector('[role="textbox"]') as HTMLElement;
      if (textbox) {
        textbox.innerText = reply;
        const inputEvent = new Event('input', { bubbles: true });
        textbox.dispatchEvent(inputEvent);
        textbox.focus();
      }
      this.remove();
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
        ${this.getStyles()}
      </style>
      <div class="reply-guy-loading">
        <div class="reply-guy-spinner"></div>
        <div>Generating suggestions...</div>
      </div>
    `;

    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = `${rect.bottom + window.scrollY}px`;
    this.overlay.style.left = `${rect.left}px`;

    document.body.appendChild(this.overlay);
  }

  showError(error: string) {
    this.remove();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'reply-guy-overlay';
    this.overlay.innerHTML = `
      <style>
        ${this.getStyles()}
        .reply-guy-error {
          padding: 20px;
          text-align: center;
          color: #dc3545;
        }
      </style>
      <div class="reply-guy-header">
        <div class="reply-guy-title">
          <div class="reply-guy-logo"></div>
          Reply Guy
        </div>
        <button class="reply-guy-close" aria-label="Close">×</button>
      </div>
      <div class="reply-guy-error">
        ${this.escapeHtml(error)}
      </div>
    `;

    const rect = this.container.getBoundingClientRect();
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = `${rect.bottom + window.scrollY}px`;
    this.overlay.style.left = `${rect.left}px`;

    this.overlay.querySelector('.reply-guy-close')?.addEventListener('click', () => this.remove());

    document.body.appendChild(this.overlay);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.overlay && !this.overlay.contains(e.target as Node)) {
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

  private getStyles(): string {
    return `
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
      /* ... rest of styles from show() method ... */
    `;
  }
}