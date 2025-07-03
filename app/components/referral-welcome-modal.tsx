'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Gift, Users, TrendingUp, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ReferralWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  referralUrl: string;
  isFreeTier: boolean;
}

export function ReferralWelcomeModal({ 
  isOpen, 
  onClose, 
  referralCode,
  referralUrl,
  isFreeTier 
}: ReferralWelcomeModalProps) {
  const [copied, setCopied] = useState(false);
  
  // Ensure we display the clean URL
  const displayUrl = referralUrl.replace(/https:\/\/[^\/]+/, 'https://replyguy.appendment.com');
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  
  const handleClose = () => {
    // Save to localStorage that user has seen this
    localStorage.setItem('hasSeenReferralWelcome', 'true');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-6 w-6 text-purple-600" />
            Earn Free Replies by Inviting Friends!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Welcome Message */}
          <div className="text-gray-600 dark:text-gray-400">
            <p className="mb-3">
              Welcome to ReplyGuy! Did you know you can earn extra replies and research credits by sharing with friends?
            </p>
          </div>
          
          {/* Benefits */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              How it works:
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>For each friend who signs up, you get <strong>+10 replies</strong> and <strong>+1 research credit</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Your friend gets <strong>10 free replies per month</strong> (resets monthly)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  {isFreeTier ? (
                    <>You can earn up to <strong>40 bonus replies</strong> (4 referrals)</>
                  ) : (
                    <>As a premium member, you can earn up to <strong>100 bonus replies</strong> (10 referrals)!</>
                  )}
                </span>
              </li>
            </ul>
          </div>
          
          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Unique Referral Code</label>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-mono font-bold text-purple-600 mb-2">
                {referralCode}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Share this code or use your link below
              </div>
            </div>
          </div>
          
          {/* Referral Link */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Referral Link</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={displayUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-md font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link to Share
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Got it!
            </Button>
          </div>
          
          {/* Footer Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can always find your referral link in the dashboard
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}