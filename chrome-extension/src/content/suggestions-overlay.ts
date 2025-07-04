export class SuggestionsOverlay {
  private overlay: HTMLElement | null = null;
  private container: Element;

  constructor(container: Element) {
    this.container = container;
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