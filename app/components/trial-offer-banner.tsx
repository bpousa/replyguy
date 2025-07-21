'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { X, Timer, Zap, ArrowRight } from 'lucide-react';

interface TrialOfferBannerProps {
  userCreatedAt: string;
  hasSeenOffer: boolean;
  currentPlan: string;
}

export function TrialOfferBanner({ 
  userCreatedAt, 
  hasSeenOffer, 
  currentPlan 
}: TrialOfferBannerProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user dismissed the banner this session
    const dismissed = sessionStorage.getItem('trial_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Only show for free users
    if (currentPlan !== 'free') {
      return;
    }

    const calculateTimeLeft = () => {
      const created = new Date(userCreatedAt);
      const expires = new Date(created);
      expires.setDate(expires.getDate() + 7);
      
      const now = new Date();
      const diff = expires.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsExpired(true);
        setIsVisible(false);
        return;
      }
      
      // Show banner if within 7 days
      setIsVisible(true);
      
      // Calculate time components
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeLeft(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else {
        setTimeLeft(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    };
    
    // Calculate immediately
    calculateTimeLeft();
    
    // Update every minute
    const interval = setInterval(calculateTimeLeft, 60000);
    
    return () => clearInterval(interval);
  }, [userCreatedAt, currentPlan]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('trial_banner_dismissed', 'true');
  };

  const handleClaimOffer = () => {
    router.push('/auth/trial-offer');
  };

  // Don't render if conditions aren't met
  if (!isVisible || isDismissed || isExpired || currentPlan !== 'free') {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>
      
      <div className="relative px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-yellow-300 animate-pulse" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold">
                  🎉 Limited Time: Try X Pro for just $1!
                </p>
                <p className="text-sm opacity-90 flex items-center gap-2 justify-center sm:justify-start mt-1">
                  <Timer className="h-4 w-4" />
                  <span className="font-semibold">{timeLeft} left</span>
                  <span className="hidden sm:inline">• 500 AI replies/month • Chrome Extension • Write Like Me™</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleClaimOffer}
                size="sm"
                className="bg-white text-purple-600 hover:bg-gray-100 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Claim Your $1 Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Dismiss banner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}