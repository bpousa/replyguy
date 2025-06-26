'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Zap, Check } from 'lucide-react';
import Link from 'next/link';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'tweet' | 'response' | 'replies' | 'memes' | 'suggestions';
  currentLimit: number | string;
  currentPlan: string;
  upgradePlans: Array<{
    name: string;
    limit: number | string;
    price: string;
    features: string[];
  }>;
}

export function UpgradeModal({
  isOpen,
  onClose,
  limitType,
  currentLimit,
  currentPlan,
  upgradePlans
}: UpgradeModalProps) {
  const limitTypeLabels = {
    tweet: 'Tweet Length',
    response: 'Response Idea Length',
    replies: 'Monthly Replies',
    memes: 'Monthly Memes',
    suggestions: 'AI Suggestions'
  };

  const limitTypeMessages = {
    tweet: 'Your tweet is too long for your current plan.',
    response: 'Your response idea is too long for your current plan.',
    replies: 'You\'ve reached your monthly reply limit.',
    memes: 'You\'ve reached your monthly meme limit.',
    suggestions: 'You\'ve used all your AI suggestions for this month.'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-purple-600" />
            Upgrade to Continue
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {limitTypeMessages[limitType]}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Current Plan */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Current Plan</p>
                <p className="font-semibold text-lg">{currentPlan}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{limitTypeLabels[limitType]}</p>
                <p className="font-semibold text-lg">{currentLimit}</p>
              </div>
            </div>
          </div>

          {/* Upgrade Options */}
          <div className="space-y-4">
            <p className="font-medium text-gray-900">Upgrade to increase your limits:</p>
            
            {upgradePlans.map((plan, index) => (
              <div key={plan.name} className="border rounded-lg p-4 hover:border-purple-500 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {plan.name}
                      {index === 0 && (
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                          Recommended
                        </span>
                      )}
                    </h3>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{plan.price}/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{limitTypeLabels[limitType]}</p>
                    <p className="font-semibold text-lg">{plan.limit}</p>
                  </div>
                </div>
                
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/auth/signup" onClick={onClose}>
                  <Button className="w-full" variant={index === 0 ? "default" : "outline"}>
                    Upgrade to {plan.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={onClose}>
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple upgrade modal for rate limit errors
interface SimpleUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function UpgradeModal({ isOpen, onClose, message }: SimpleUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUpgrade = async (planId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle: 'monthly'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };
  
  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '$19',
      features: [
        '500 replies per month',
        '50 memes per month',
        'Advanced AI suggestions',
        'Priority support'
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: '$49',
      features: [
        '2,000 replies per month',
        '200 memes per month',
        'Real-time Perplexity search',
        'Premium support'
      ]
    }
  ];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-purple-600" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {message || "You've reached your plan limits. Upgrade to continue creating amazing content!"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="border rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{plan.price}/month</p>
                </div>
              </div>
              
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                onClick={() => handleUpgrade(plan.id)}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : `Upgrade to ${plan.name}`}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}