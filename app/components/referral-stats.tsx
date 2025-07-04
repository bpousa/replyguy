'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Users, Gift, Share2, TrendingUp } from 'lucide-react';
import { ReferralShareModal } from './referral-share-modal';
import { toast } from 'react-hot-toast';
import { Skeleton } from './ui/skeleton';

interface ReferralStatsProps {
  isFreeTier: boolean;
}

export function ReferralStats({ isFreeTier }: ReferralStatsProps) {
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [referralUrl, setReferralUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isPaidTier, setIsPaidTier] = useState(false);
  
  const generateReferralCode = async () => {
    try {
      const response = await fetch('/api/referral/generate', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to generate code');
      
      const data = await response.json();
      setReferralUrl(data.referralUrl);
      setReferralCode(data.referralCode);
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Failed to generate referral code');
    }
  };
  
  useEffect(() => {
    const fetchReferralStats = async () => {
    try {
      const response = await fetch('/api/referral/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.stats);
      setReferralUrl(data.referralUrl);
      setReferralCode(data.referralCode);
      setIsPaidTier(data.isPaidTier || false);
      
      // Generate referral code if doesn't exist
      if (!data.referralCode) {
        await generateReferralCode();
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      toast.error('Failed to load referral stats');
    } finally {
      setLoading(false);
    }
    };
    
    fetchReferralStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }
  
  const remainingReplies = stats ? stats.maxBonusReplies - stats.bonusReplies : 40;
  const remainingResearch = stats ? stats.maxBonusResearch - stats.bonusResearch : 4;
  
  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Get More Free Replies Every Month!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You currently get <span className="font-semibold text-gray-900 dark:text-gray-100">10 free replies per month</span>. 
              For each friend who joins (free or paid), you get <span className="font-semibold text-green-600">+10 more replies every month</span>!
              {isPaidTier ? (
                <span className="block text-purple-600 font-medium mt-1">Premium perk: You can refer up to 10 friends (100 bonus replies/month)!</span>
              ) : (
                <span className="block text-gray-500 dark:text-gray-400 text-xs mt-1">Free users can refer up to 4 friends for 40 bonus replies/month</span>
              )}
            </p>
          </div>
          <Button
            onClick={() => setShowShareModal(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
        
        {/* Current Status Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300">Your monthly replies: </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {10 + (stats?.bonusReplies || 0)} total
              </span>
              <span className="text-gray-600 dark:text-gray-400 text-xs block">
                (10 base + {stats?.bonusReplies || 0} from referrals)
              </span>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats?.totalReferrals || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Referrals
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats?.bonusReplies || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Extra Replies/Month
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.bonusResearch || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Bonus Research
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {remainingReplies}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              More Available
            </div>
          </div>
        </div>
        
        {/* Progress Bars */}
        <div className="space-y-3 mb-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Bonus Replies</span>
              <span className="text-gray-600 dark:text-gray-400">
                {stats?.bonusReplies || 0} / {stats?.maxBonusReplies || 40}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${((stats?.bonusReplies || 0) / (stats?.maxBonusReplies || 40)) * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Bonus Research</span>
              <span className="text-gray-600 dark:text-gray-400">
                {stats?.bonusResearch || 0} / {stats?.maxBonusResearch || 4}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((stats?.bonusResearch || 0) / (stats?.maxBonusResearch || 4)) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* CTA */}
        {remainingReplies > 0 ? (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">You can earn {remainingReplies} more replies per month!</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Share with {Math.ceil(remainingReplies / 10)} more {Math.ceil(remainingReplies / 10) === 1 ? 'friend' : 'friends'} to get up to {isFreeTier ? '50' : '110'} replies every month
                  {isPaidTier && <span className="block text-purple-600 font-medium mt-1">Premium perk: 10 friend limit vs 4 for free users!</span>}
                </p>
              </div>
              <Button
                onClick={() => setShowShareModal(true)}
                size="sm"
                variant="outline"
              >
                Invite Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">🎉 Amazing! You&apos;ve maxed out your referral bonuses!</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  You now get {isFreeTier ? '50' : '110'} replies every month ({isFreeTier ? '10 base + 40 bonus' : '10 base + 100 bonus'})
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Share Modal */}
      <ReferralShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        referralUrl={referralUrl}
        referralCode={referralCode}
        stats={stats}
      />
    </>
  );
}