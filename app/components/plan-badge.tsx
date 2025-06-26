'use client';

import { usePlan } from '@/app/contexts/plan-context';
import { Badge } from '@/app/components/ui/badge';
import { Calendar, AlertCircle, Crown } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export function PlanBadge() {
  const { plan, subscription, isLoading } = usePlan();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  // Plan name mapping
  const planNameMap: Record<string, string> = {
    free: 'Free Plan',
    growth: 'X Basic',
    professional: 'X Pro',
    enterprise: 'X Business',
  };
  const planDisplayName = planNameMap[plan.id] || plan.name;

  // Determine badge variant and icon
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  let Icon = Crown;
  
  if (plan.id === 'free') {
    variant = 'secondary';
  } else if (isPastDue || isCanceled) {
    variant = 'destructive';
    Icon = AlertCircle;
  }

  return (
    <Link href="/billing" className="inline-block">
      <Badge 
        variant={variant} 
        className={`
          px-3 py-1.5 text-sm font-medium transition-all hover:scale-105
          ${isPastDue || isCanceled ? 'animate-pulse' : ''}
        `}
      >
        <Icon className="w-3 h-3 mr-1.5" />
        {planDisplayName}
        
        {/* Show renewal date for active paid plans */}
        {isActive && subscription?.currentPeriodEnd && plan.id !== 'free' && (
          <span className="ml-2 text-xs opacity-75 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Renews {format(subscription.currentPeriodEnd, 'MMM d')}
          </span>
        )}
        
        {/* Show status for problematic subscriptions */}
        {isPastDue && (
          <span className="ml-2 text-xs font-bold">
            - Payment Required
          </span>
        )}
        
        {isCanceled && (
          <span className="ml-2 text-xs">
            - Expires {subscription?.currentPeriodEnd && format(subscription.currentPeriodEnd, 'MMM d')}
          </span>
        )}
      </Badge>
    </Link>
  );
}