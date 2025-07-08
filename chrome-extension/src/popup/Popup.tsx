import React, { useEffect, useState } from 'react';
import { AuthState, UsageLimits } from '@/types';
import './popup.css';

export function Popup() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    checkAuth();

    const handleMessage = (request: any) => {
      if (request.action === 'generatingReply') {
        setIsGenerating(true);
      } else if (request.action === 'replyGenerated') {
        setIsGenerating(false);
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
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    }
  };

  const getUsagePercentage = (remaining: number, total: number) => {
    const used = total - remaining;
    return Math.round((used / total) * 100);
  };

  const getProgressClass = (percentage: number) => {
    return percentage < 20 ? 'progress-fill low' : 'progress-fill';
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1>Reply Guy</h1>
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
            )}
          </div>

          <div className="footer-section">
            <a href="https://replyguy.appendment.com" target="_blank" className="footer-link">
              Open Dashboard
            </a>
            <a href="https://replyguy.appendment.com/settings" target="_blank" className="footer-link">
              Upgrade Plan
            </a>
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