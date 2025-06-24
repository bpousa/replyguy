'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { toast } from 'react-hot-toast';
import { 
  CreditCard, 
  Loader2, 
  Check,
  ArrowRight,
  Calendar,
  Zap
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Get subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      setSubscription(sub);

      // Get current usage
      const { data: limits } = await supabase
        .rpc('get_user_limits', { p_user_id: user.id })
        .single();

      setUsage(limits);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal');
    }
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const plan = subscription?.subscription_plans || { name: 'Free', id: 'free' };
  const isFreePlan = plan.id === 'free';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Usage</h1>

      {/* Current Plan */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Plan
            </h2>
            <p className="text-3xl font-bold mt-2 text-purple-600">{plan.name}</p>
          </div>
          {!isFreePlan && subscription?.current_period_end && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Next billing date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          {isFreePlan ? (
            <Button onClick={handleUpgrade} className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Upgrade Plan
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleManageBilling} variant="outline">
              Manage Subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Usage Overview */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Usage</h2>
        
        <div className="space-y-4">
          {/* Replies */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Replies</span>
              <span className="font-medium">
                {usage?.replies_used || 0} / {usage?.reply_limit || 10}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(((usage?.replies_used || 0) / (usage?.reply_limit || 10)) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Memes */}
          {(usage?.meme_limit || 0) > 0 && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Memes</span>
                <span className="font-medium">
                  {usage?.memes_used || 0} / {usage?.meme_limit || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(((usage?.memes_used || 0) / (usage?.meme_limit || 1)) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Suggestions */}
          {(usage?.suggestion_limit || 0) > 0 && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">AI Suggestions</span>
                <span className="font-medium">
                  {usage?.suggestions_used || 0} / {usage?.suggestion_limit === -1 ? '∞' : usage?.suggestion_limit || 0}
                </span>
              </div>
              {usage?.suggestion_limit !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(((usage?.suggestions_used || 0) / (usage?.suggestion_limit || 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Plan Features */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Your Plan Features</h2>
        
        <ul className="space-y-3">
          {plan.features && Object.entries(plan.features).map(([key, value]) => {
            if (typeof value === 'string' && value) {
              return (
                <li key={key} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{value}</span>
                </li>
              );
            } else if (value === true) {
              return (
                <li key={key} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </li>
              );
            }
            return null;
          })}
        </ul>

        {isFreePlan && (
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700 mb-3">
              Upgrade to unlock more features and higher limits
            </p>
            <Button 
              onClick={handleUpgrade} 
              size="sm" 
              className="w-full"
            >
              View Upgrade Options
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}