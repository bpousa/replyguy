'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { createBrowserClient } from '@/app/lib/auth';
import Link from 'next/link';

interface SubscriptionStatus {
  status: string;
  payment_failed_at: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string;
}

export function SubscriptionStatusBanner() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    checkSubscriptionStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSubscriptionStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, payment_failed_at, cancel_at_period_end, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['past_due', 'canceled', 'unpaid'])
      .single();

    setSubscription(sub);
    setLoading(false);
  };

  if (loading || !subscription || dismissed) {
    return null;
  }

  const daysUntilCancellation = subscription.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Past due - payment failed
  if (subscription.status === 'past_due') {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Payment Failed
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Your payment method was declined. Please update your payment information to continue using ReplyGuy.
                {daysUntilCancellation > 0 && (
                  <span className="font-medium">
                    {' '}You have {daysUntilCancellation} days before your subscription is canceled.
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/billing">
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment Method
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Subscription canceling
  if (subscription.cancel_at_period_end) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Subscription Ending
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}.
                You&apos;ll lose access to premium features after this date.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/billing">
                <Button size="sm" variant="outline">
                  Reactivate Subscription
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Subscription canceled
  if (subscription.status === 'canceled') {
    return (
      <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-800">
              Subscription Canceled
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>
                Your subscription has been canceled. You&apos;re now on the free plan with limited features.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/pricing">
                <Button size="sm">
                  View Plans
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}