'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReplyForm from '@/app/components/reply-form';
import ReplyOutput from '@/app/components/reply-output';
import { UserInput, GeneratedReply } from '@/app/lib/types';
import { toast } from 'react-hot-toast';
import { DailyGoalTracker } from '@/app/components/daily-goal-tracker';
import { createBrowserClient } from '@/app/lib/auth';
import UpgradeModal from '@/app/components/upgrade-modal';
import { SubscriptionStatusBanner } from '@/app/components/subscription-status-banner';
import { PlanBadge } from '@/app/components/plan-badge';
import Image from 'next/image';
import { ReferralStats } from '@/app/components/referral-stats';
import { ReferralWelcomeModal } from '@/app/components/referral-welcome-modal';


export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [generatedReply, setGeneratedReply] = useState<GeneratedReply | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralUrl, setReferralUrl] = useState('');
  
  // Function to fetch current daily usage from database
  const fetchDailyUsage = useCallback(async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: usage, error: usageError } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
      
    if (usageError) {
      console.error('[dashboard] Failed to fetch daily usage:', {
        error: usageError,
        code: usageError.code,
        message: usageError.message,
        details: usageError.details,
        hint: usageError.hint
      });
      return 0;
    } else if (usage) {
      return usage.replies_generated || 0;
    } else {
      // No usage record for today yet
      return 0;
    }
  }, [supabase]);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // The layout will handle redirecting if no user
        return;
      }
      
      setUser(user);
      
      // Get user's settings
      const { data: userData } = await supabase
        .from('users')
        .select('daily_goal, timezone')
        .eq('id', user.id)
        .single();
        
      if (userData) {
        setDailyGoal(userData.daily_goal || 10);
      }
      
      // Get user with active subscription and plan details
      const { data: userWithSub } = await supabase
        .from('users')
        .select(`
          *,
          subscriptions!inner(
            status,
            plan_id,
            current_period_end,
            subscription_plans!inner(*)
          )
        `)
        .eq('id', user.id)
        .eq('subscriptions.is_active', true)
        .single();
        
      if (userWithSub?.subscriptions?.[0]) {
        const subscription = userWithSub.subscriptions[0];
        // Get current month's meme usage
        let memesUsed = 0;
        try {
          const { data: currentUsage, error: currentUsageError } = await supabase
            .rpc('get_current_usage', { p_user_id: user.id })
            .maybeSingle() as { data: { total_replies: number; total_memes: number } | null; error: any };
          
          if (currentUsageError) {
            console.error('[dashboard] Failed to fetch current usage:', {
              error: currentUsageError,
              code: currentUsageError.code,
              message: currentUsageError.message,
              details: currentUsageError.details,
              hint: currentUsageError.hint,
              userId: user.id
            });
          } else {
            memesUsed = currentUsage?.total_memes || 0;
            console.log('[dashboard] Current usage fetched:', currentUsage);
          }
        } catch (usageError) {
          console.error('[dashboard] Failed to fetch current usage (exception):', {
            error: usageError,
            userId: user.id,
            message: usageError instanceof Error ? usageError.message : 'Unknown error'
          });
        }
        
        const subscriptionData = {
          plan_id: subscription.plan_id,
          subscription_plans: subscription.subscription_plans,
          status: subscription.status,
          memes_used: memesUsed
        };
        console.log('[dashboard] Setting subscription data:', subscriptionData);
        setSubscription(subscriptionData);
      }
      
      // Get today's usage
      const currentUsage = await fetchDailyUsage(user.id);
      setDailyCount(currentUsage);
      
      // Check if user has seen referral welcome modal
      const hasSeenWelcome = localStorage.getItem('hasSeenReferralWelcome');
      if (!hasSeenWelcome) {
        // Generate or fetch referral code
        try {
          const response = await fetch('/api/referral/generate', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            setReferralCode(data.referralCode);
            setReferralUrl(data.referralUrl);
            setShowReferralWelcome(true);
          }
        } catch (error) {
          console.error('Failed to fetch referral code:', error);
        }
      }
    };
    
    loadUserData();
    
    // Subscribe to auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserData();
      }
    });
    
    return () => {
      authSubscription?.unsubscribe();
    };
  }, [supabase, fetchDailyUsage, searchParams]);
  
  // Set up periodic refresh of usage data every 30 seconds
  // This ensures data stays in sync if multiple sessions are active
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
      const updatedUsage = await fetchDailyUsage(user.id);
      setDailyCount(updatedUsage);
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [user, fetchDailyUsage]);

  const handleGenerate = async (input: UserInput) => {
    if (!user) {
      toast.error('Please sign in to generate replies');
      return;
    }
    
    // Check usage limits
    try {
      const limitsResponse = await fetch('/api/check-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!limitsResponse.ok) {
        console.error('Failed to check limits:', limitsResponse.status);
        // Continue without limit checking for now
      } else {
        const limitsData = await limitsResponse.json();
        
        if (!limitsData.canGenerate) {
      toast.error(
        <div className="flex flex-col gap-2">
          <p>You&apos;ve reached your monthly limit of {limitsData.limits.reply_limit} replies.</p>
          <a 
            href="/pricing" 
            className="text-sm underline font-medium"
          >
            Upgrade your plan to continue
          </a>
        </div>,
        { duration: 5000 }
      );
      return;
        }
      }
    } catch (error) {
      console.error('Error checking limits:', error);
      // Continue without limit checking
    }

    setIsGenerating(true);
    setGeneratedReply(null);
    
    // Optimistic update - immediately increment the count
    const previousCount = dailyCount;
    setDailyCount(prev => prev + 1);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...input,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Roll back the optimistic update on error
        setDailyCount(previousCount);
        
        // Check for rate limit errors
        if (response.status === 429 && result.limit && result.used) {
          const limitType = result.error.includes('meme') ? 'meme' : 'reply';
          setUpgradeMessage(
            `You've reached your monthly ${limitType} limit (${result.used}/${result.limit}). ` +
            `Upgrade your plan to continue creating amazing content!`
          );
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(result.error || 'Failed to generate reply');
      }

      setGeneratedReply(result.data);
      toast.success('Reply generated successfully!');
      
      // Usage tracking is now handled by the backend API
      // The /api/process endpoint calls track_daily_usage internally
      
      // Fetch the actual usage from database to ensure accuracy
      // This will correct any discrepancies from the optimistic update
      const updatedUsage = await fetchDailyUsage(user.id);
      setDailyCount(updatedUsage);
    } catch (error) {
      // Roll back the optimistic update on error
      setDailyCount(previousCount);
      console.error('Failed to generate reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate reply');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleGoalChange = async (newGoal: number) => {
    // Optimistic update
    const previousGoal = dailyGoal;
    setDailyGoal(newGoal);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ daily_goal: newGoal })
          .eq('id', user.id);
        
        if (error) {
          // Roll back on error
          setDailyGoal(previousGoal);
          console.error('Failed to update daily goal:', error);
          toast.error('Failed to update goal. Please try again.');
        } else {
          toast.success('Daily goal updated!');
        }
      } catch (error) {
        // Roll back on error
        setDailyGoal(previousGoal);
        console.error('Failed to update daily goal:', error);
        toast.error('Failed to update goal. Please try again.');
      }
    }
  };

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Subscription Status Banner */}
        <SubscriptionStatusBanner />
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/reply_guy_logo.png"
              alt="ReplyGuy Logo"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <h1 className="text-4xl font-bold gradient-text">
              ReplyGuy
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Create authentic, human-like replies to tweets with AI
          </p>
          <PlanBadge />
        </div>

        {/* Daily Goal Tracker */}
        <div className="mb-8">
          <DailyGoalTracker 
            currentCount={dailyCount} 
            goal={dailyGoal}
            onGoalChange={handleGoalChange}
          />
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 card-hover">
            <h2 className="text-xl font-semibold mb-4">Create Your Reply</h2>
            <ReplyForm 
              onSubmit={handleGenerate} 
              isLoading={isGenerating}
              user={user}
              subscription={subscription}
            />
          </div>

          {/* Output display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Reply</h2>
            <ReplyOutput 
              reply={generatedReply} 
              isLoading={isGenerating}
              maxReplyLength={subscription?.subscription_plans?.max_reply_length || 280}
            />
          </div>
        </div>

        {/* Referral Section - Show for all logged in users */}
        {user && (
          <div className="mt-8">
            <ReferralStats 
              isFreeTier={subscription?.subscription_plans?.id === 'free' || !subscription}
            />
          </div>
        )}

        {/* Features section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="Cost Optimized"
            description="90% token reduction through smart classification"
            icon="💰"
          />
          <FeatureCard
            title="Human-Like"
            description="No AI-isms, just natural conversation"
            icon="💬"
          />
          <FeatureCard
            title="Context Aware"
            description="50+ reply types matched to your needs"
            icon="🎯"
          />
        </div>

      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={upgradeMessage}
      />
      
      {/* Referral Welcome Modal */}
      <ReferralWelcomeModal
        isOpen={showReferralWelcome}
        onClose={() => setShowReferralWelcome(false)}
        referralCode={referralCode}
        referralUrl={referralUrl}
        isFreeTier={subscription?.subscription_plans?.id === 'free' || !subscription}
      />
    </main>
  );
}

function FeatureCard({ title, description, icon }: { 
  title: string; 
  description: string; 
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center card-hover">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}