import React, { useEffect, useState } from 'react';
import { AuthState, UsageLimits } from '@/types';
import confetti from 'canvas-confetti';
import './popup.css';

export function Popup() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(10);

  useEffect(() => {
    chrome.storage.local.get('dailyGoal', (data) => {
      if (data.dailyGoal) {
        setTempGoal(data.dailyGoal);
      }
    });

    checkAuth();

    const handleMessage = (request: any) => {
      if (request.action === 'generatingReply') {
        setIsGenerating(true);
      } else if (request.action === 'replyGenerated') {
        setIsGenerating(false);
        fetchLimits();
      } else if (request.action === 'showCelebration') {
        // Trigger confetti celebration
        triggerCelebration();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
      if (response.success) {
        setAuthState(response.data);
        if (response.data.isAuthenticated) {
          fetchLimits();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getUsageLimits' });
      if (response.success) {
        setLimits(response.data);
        const apiGoal = response.data.dailyGoal || 10;
        setTempGoal(apiGoal);
        chrome.storage.local.set({ dailyGoal: apiGoal });
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    }
  };
  
  const handleSaveGoal = async () => {
    if (tempGoal >= 1 && tempGoal <= 100) {
      chrome.storage.local.set({ dailyGoal: tempGoal });

      setIsEditingGoal(false);
      if (limits) {
        setLimits({ ...limits, dailyGoal: tempGoal });
      }

      try {
        await chrome.runtime.sendMessage({ 
          action: 'updateDailyGoal', 
          data: { goal: tempGoal } 
        });
      } catch (error) {
        console.error('Failed to sync daily goal with backend:', error);
      }
    }
  };

  const getUsagePercentage = (remaining: number, total: number) => {
    const used = total - remaining;
    return Math.round((used / total) * 100);
  };

  const getProgressClass = (percentage: number) => {
    return percentage < 20 ? 'progress-fill low' : 'progress-fill';
  };
  
  const triggerCelebration = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 10000,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Fire multiple bursts for a nice effect
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
    
    // Also show a congratulations message
    setTimeout(() => {
      // Create a temporary celebration message
      const celebrationDiv = document.createElement('div');
      celebrationDiv.className = 'celebration-message';
      celebrationDiv.innerHTML = '🎉 Congratulations! Daily goal reached! 🎉';
      celebrationDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 16px;
        z-index: 10001;
        animation: celebrationPulse 0.5s ease-out;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
      `;
      
      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        @keyframes celebrationPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(celebrationDiv);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        celebrationDiv.remove();
        style.remove();
      }, 3000);
    }, 500);
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="popup-logo">
          <img src="icons/reply_guy_logo.png" alt="Reply Guy" />
          <h1>Reply Guy</h1>
        </div>
        <p>AI-powered replies for X</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : authState.isAuthenticated ? (
        <>
          <div className="popup-content">
            <div className="user-info">
              <h3>Welcome back!</h3>
              <p>{authState.user?.email}</p>
            </div>

            {limits && (
              <>
                {/* Daily Goal Tracker */}
                <div className="daily-goal-section">
                  <div className="daily-goal-header">
                    <div className="daily-goal-info">
                      <h3>Daily Goal</h3>
                      <p>{limits.dailyCount || 0} of {limits.dailyGoal || 10} replies today</p>
                    </div>
                    {!isEditingGoal ? (
                      <button 
                        className="edit-btn"
                        onClick={() => setIsEditingGoal(true)}
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="edit-controls">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={tempGoal}
                          onChange={(e) => setTempGoal(parseInt(e.target.value) || 1)}
                          className="goal-input"
                        />
                        <button className="save-btn" onClick={handleSaveGoal}>
                          Save
                        </button>
                        <button 
                          className="cancel-btn"
                          onClick={() => {
                            setTempGoal(limits.dailyGoal || 10);
                            setIsEditingGoal(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill daily-goal"
                      style={{ width: `${Math.min(((limits.dailyCount || 0) / (limits.dailyGoal || 10)) * 100, 100)}%` }}
                    />
                  </div>
                  
                  {(limits.dailyCount || 0) >= (limits.dailyGoal || 10) && (
                    <div className="goal-achieved">
                      ⚡ Goal achieved!
                    </div>
                  )}
                </div>
                
                <div className="usage-section">
                  <h3>Usage Limits</h3>
                
                <div className="usage-item">
                  <div className="usage-label">
                    <span>Replies</span>
                    <span>{limits.repliesTotal - limits.repliesRemaining} / {limits.repliesTotal}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={getProgressClass(getUsagePercentage(limits.repliesRemaining, limits.repliesTotal))}
                      style={{ width: `${getUsagePercentage(limits.repliesRemaining, limits.repliesTotal)}%` }}
                    />
                  </div>
                </div>

                <div className="usage-item">
                  <div className="usage-label">
                    <span>Suggestions</span>
                    <span>{limits.suggestionsTotal - limits.suggestionsRemaining} / {limits.suggestionsTotal}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={getProgressClass(getUsagePercentage(limits.suggestionsRemaining, limits.suggestionsTotal))}
                      style={{ width: `${getUsagePercentage(limits.suggestionsRemaining, limits.suggestionsTotal)}%` }}
                    />
                  </div>
                </div>

                <div className="usage-item">
                  <div className="usage-label">
                    <span>Memes</span>
                    <span>{limits.memesTotal - limits.memesRemaining} / {limits.memesTotal}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={getProgressClass(getUsagePercentage(limits.memesRemaining, limits.memesTotal))}
                      style={{ width: `${getUsagePercentage(limits.memesRemaining, limits.memesTotal)}%` }}
                    />
                  </div>
                </div>
              </div>
              </>
            )}
          </div>

          <div className="footer-section">
            <div className="footer-links">
              <a href="https://replyguy.appendment.com" target="_blank" className="footer-link">
                Open Dashboard
              </a>
              <a href="https://replyguy.appendment.com/settings" target="_blank" className="footer-link">
                Upgrade Plan
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="auth-section">
          <h2>Sign in to Reply Guy</h2>
          <p>Generate AI-powered replies directly from X. Sign in to get started.</p>
          <button 
            className="btn-primary"
            onClick={() => chrome.tabs.create({ url: 'https://replyguy.appendment.com/auth/login?extension=true' })}
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}
