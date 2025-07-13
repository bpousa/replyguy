'use client';

import { useState, useEffect } from 'react';
import { X, Chrome, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function ChromeExtensionBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissedUntil = localStorage.getItem('chromeExtensionBannerDismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        return; // Still within 30-day dismissal period
      }
    }

    // Check if extension is installed by trying to communicate with it
    const checkExtension = () => {
      // Extension would inject a specific element or respond to postMessage
      if ((window as any).__REPLYGUY_EXTENSION_INSTALLED__) {
        setIsExtensionInstalled(true);
        return;
      }

      // Try sending a message to the extension
      window.postMessage({ type: 'REPLYGUY_CHECK_EXTENSION' }, '*');
      
      // Listen for response
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'REPLYGUY_EXTENSION_INSTALLED') {
          setIsExtensionInstalled(true);
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Clean up after 1 second if no response
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (!isExtensionInstalled) {
          setIsVisible(true);
        }
      }, 1000);
    };

    checkExtension();
  }, [isExtensionInstalled]);

  const handleDismiss = () => {
    // Dismiss for 30 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 30);
    localStorage.setItem('chromeExtensionBannerDismissed', dismissUntil.toISOString());
    setIsVisible(false);
  };

  if (!isVisible || isExtensionInstalled) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
              <Chrome className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm sm:text-base">
                  Reply 100x Faster with Our Chrome Extension
                </h3>
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </div>
              <p className="text-xs sm:text-sm text-white/90">
                Generate replies directly from X without switching tabs. One-click magic!
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100 whitespace-nowrap"
              asChild
            >
              <a
                href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje?authuser=3&hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Chrome className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Install Now</span>
                <span className="sm:hidden">Install</span>
              </a>
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}