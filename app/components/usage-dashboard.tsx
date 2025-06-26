'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Button } from '@/app/components/ui/button';
import { Activity, Zap, Image, Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { createBrowserClient } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';

interface UsageStats {
  replies_used: number;
  replies_limit: number;
  memes_used: number;
  memes_limit: number;
  suggestions_used: number;
  suggestions_limit: number;
  perplexity_enabled: boolean;
  subscription_tier: string;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date: string;
}

export function UsageDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadUsageStats();
  }, [userId]);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      
      // Get current usage
      const { data: currentUsage } = await supabase
        .rpc('get_current_usage', { p_user_id: userId })
        .single() as { data: { total_replies: number; total_memes: number; total_suggestions: number } | null };
      
      // Get user subscription details
      const { data: userData } = await supabase
        .from('users')
        .select(`
          subscription_tier,
          subscriptions (
            status,
            current_period_end,
            subscription_plans (
              monthly_limit,
              meme_limit,
              suggestion_limit,
              enable_perplexity_guidance
            )
          )
        `)
        .eq('id', userId)
        .single() as { 
          data: {
            subscription_tier: string;
            subscriptions?: Array<{
              status: string;
              current_period_end: string;
              subscription_plans: {
                monthly_limit: number;
                meme_limit?: number;
                suggestion_limit: number;
                enable_perplexity_guidance: boolean;
              };
            }>;
          } | null 
        };
      
      if (userData && currentUsage) {
        const subscription = userData.subscriptions?.[0];
        const plan = subscription?.subscription_plans;
        
        setUsage({
          replies_used: currentUsage.total_replies || 0,
          replies_limit: plan?.monthly_limit || 50,
          memes_used: currentUsage.total_memes || 0,
          memes_limit: getMemeLimit(userData.subscription_tier),
          suggestions_used: currentUsage.total_suggestions || 0,
          suggestions_limit: plan?.suggestion_limit || 0,
          perplexity_enabled: plan?.enable_perplexity_guidance || false,
          subscription_tier: userData.subscription_tier || 'free',
          billing_cycle: 'monthly',
          next_billing_date: subscription?.current_period_end || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemeLimit = (tier: string): number => {
    const limits: Record<string, number> = {
      'free': 0,
      'growth': 10,
      'professional': 50,
      'enterprise': 100
    };
    return limits[tier] || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href
        })
      });
      
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  const tierColors: Record<string, string> = {
    free: 'text-gray-600',
    growth: 'text-blue-600',
    professional: 'text-purple-600',
    enterprise: 'text-orange-600'
  };

  const tierNames: Record<string, string> = {
    free: 'Free',
    growth: 'X Basic',
    professional: 'X Pro',
    enterprise: 'X Business'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Usage Dashboard</CardTitle>
            <CardDescription>
              Your monthly usage and limits
            </CardDescription>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${tierColors[usage.subscription_tier] || 'text-gray-600'}`}>
              {tierNames[usage.subscription_tier] || 'Free'} Plan
            </p>
            <p className="text-sm text-gray-500">
              Resets {formatDate(usage.next_billing_date)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Replies Usage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="font-medium">Replies Generated</span>
            </div>
            <span className="text-sm text-gray-600">
              {usage.replies_used} / {usage.replies_limit}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usage.replies_used, usage.replies_limit)} 
            className="h-2"
          />
        </div>

        {/* Memes Usage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Memes Created</span>
            </div>
            <span className="text-sm text-gray-600">
              {usage.memes_used} / {usage.memes_limit}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usage.memes_used, usage.memes_limit)} 
            className="h-2"
          />
          {usage.memes_limit === 0 && (
            <p className="text-xs text-gray-500">Upgrade to create memes</p>
          )}
        </div>

        {/* AI Suggestions */}
        {usage.suggestions_limit > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">AI Suggestions</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage.suggestions_used} / {usage.suggestions_limit}
              </span>
            </div>
            <Progress 
              value={getUsagePercentage(usage.suggestions_used, usage.suggestions_limit)} 
              className="h-2"
            />
          </div>
        )}

        {/* Perplexity Feature */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="font-medium">Real-time Research</span>
            </div>
            {usage.perplexity_enabled ? (
              <span className="text-sm text-green-600 font-medium">Enabled</span>
            ) : (
              <span className="text-sm text-gray-500">Upgrade to unlock</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {usage.subscription_tier !== 'enterprise' && (
            <Button 
              onClick={() => router.push('/pricing')}
              className="flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleManageBilling}
            className="flex-1"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Manage Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}