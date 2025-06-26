'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/app/lib/auth';
import { SubscriptionPlan } from '@/app/lib/types';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';

interface PlanContextValue {
  // Current plan and subscription data
  plan: SubscriptionPlan | null;
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
  } | null;
  
  // Usage data
  usage: {
    replies: number;
    suggestions: number;
    memes: number;
  };
  
  // Feature flags
  features: {
    canMeme: boolean;
    canUseSuggestions: boolean;
    canUseStyleMatching: boolean;
    canUseWriteLikeMe: boolean;
    canUsePerplexity: boolean;
    canUseLongReplies: boolean;
  };
  
  // Loading and error states
  isLoading: boolean;
  error: Error | null;
  
  // Helper methods
  requireFeature: (feature: keyof PlanContextValue['features']) => void;
  refreshPlan: () => Promise<void>;
  isFeatureEnabled: (feature: keyof PlanContextValue['features']) => boolean;
  getRemainingQuota: (type: 'replies' | 'suggestions' | 'memes') => number;
}

const PlanContext = createContext<PlanContextValue | null>(null);

// SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch plan data');
  return res.json();
};

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Use SWR for data fetching with automatic revalidation
  const { data, error, isLoading, mutate: mutatePlan } = useSWR(
    userId ? `/api/user/plan?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    getUser();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Subscribe to realtime updates for plan changes
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel('plan-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Plan updated via realtime');
          mutatePlan();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, mutatePlan]);

  // Calculate features based on plan
  const features = React.useMemo(() => {
    if (!data?.plan) {
      return {
        canMeme: false,
        canUseSuggestions: false,
        canUseStyleMatching: false,
        canUseWriteLikeMe: false,
        canUsePerplexity: false,
        canUseLongReplies: false,
      };
    }
    
    const { plan, subscription } = data;
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    
    return {
      canMeme: isActive && plan.enable_memes,
      canUseSuggestions: isActive && plan.suggestion_limit > 0,
      canUseStyleMatching: isActive && plan.enable_style_matching,
      canUseWriteLikeMe: isActive && plan.enable_write_like_me,
      canUsePerplexity: isActive && plan.enable_perplexity_guidance,
      canUseLongReplies: isActive && plan.max_reply_length > 280,
    };
  }, [data]);

  // Helper methods
  const requireFeature = useCallback((feature: keyof typeof features) => {
    if (!features[feature]) {
      throw new Error(`Feature "${feature}" is not available in your current plan`);
    }
  }, [features]);

  const isFeatureEnabled = useCallback((feature: keyof typeof features) => {
    return features[feature];
  }, [features]);

  const getRemainingQuota = useCallback((type: 'replies' | 'suggestions' | 'memes') => {
    if (!data?.plan || !data?.usage) return 0;
    
    const limits = {
      replies: data.plan.monthly_limit,
      suggestions: data.plan.suggestion_limit,
      memes: data.plan.meme_limit,
    };
    
    const used = {
      replies: data.usage.total_replies || 0,
      suggestions: data.usage.total_suggestions || 0,
      memes: data.usage.total_memes || 0,
    };
    
    return Math.max(0, limits[type] - used[type]);
  }, [data]);

  const refreshPlan = useCallback(async () => {
    await mutatePlan();
  }, [mutatePlan]);

  const value: PlanContextValue = {
    plan: data?.plan || null,
    subscription: data?.subscription ? {
      status: data.subscription.status,
      currentPeriodEnd: data.subscription.current_period_end ? new Date(data.subscription.current_period_end) : null,
      trialEnd: data.subscription.trial_end ? new Date(data.subscription.trial_end) : null,
    } : null,
    usage: data?.usage || { replies: 0, suggestions: 0, memes: 0 },
    features,
    isLoading,
    error,
    requireFeature,
    refreshPlan,
    isFeatureEnabled,
    getRemainingQuota,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

// Custom hook to use the plan context
export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}

// Utility function to refresh plan data globally (for webhooks)
export function refreshGlobalPlan() {
  mutate((key: any) => typeof key === 'string' && key.startsWith('/api/user/plan'));
}