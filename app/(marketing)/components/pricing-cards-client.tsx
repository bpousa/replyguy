'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/app/lib/auth';
import { toast } from 'react-hot-toast';

const plans = [
  {
    name: 'Free',
    id: 'free',
    price: { monthly: '$0', yearly: '$0' },
    description: 'Perfect for getting started',
    features: [
      '10 replies per month',
      'Basic reply types',
      'Standard support',
      'Daily goal tracking',
      'Chrome Extension (limited)',
    ],
    cta: 'Start Free',
    mostPopular: false,
  },
  {
    name: 'X Basic',
    id: 'growth', // Database plan ID
    price: { monthly: '$19', yearly: '$190' },
    description: 'For regular X users',
    features: [
      '300 replies per month',
      '10 memes per month',
      '50 AI suggestions',
      'All reply types',
      'Chrome Extension included',
      'Email support',
    ],
    cta: 'Get Started',
    mostPopular: false,
  },
  {
    name: 'X Pro',
    id: 'professional', // Database plan ID
    price: { monthly: '$49', yearly: '$490' },
    description: 'For power users and creators',
    features: [
      '500 replies per month',
      '50 memes per month',
      '100 AI suggestions',
      'Write Like Me™ AI training',
      'Chrome Extension + Write Like Me™',
      'Style matching',
      'Medium-length replies',
      'Priority support',
    ],
    cta: 'Get Started',
    mostPopular: true,
  },
  {
    name: 'X Business',
    id: 'enterprise', // Database plan ID
    price: { monthly: '$99', yearly: '$990' },
    description: 'Maximum features for businesses',
    features: [
      '1000 replies per month',
      '100 memes per month',
      '200 AI suggestions',
      'Write Like Me™ AI training',
      'Chrome Extension + API workflows',
      'Real-time fact checking',
      'Long-form replies (1000 chars)',
      'API access',
      'Dedicated support',
    ],
    cta: 'Get Started',
    mostPopular: false,
  },
];

export function PricingCardsClient() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePlanSelect = async (planId: string) => {
    setLoadingPlan(planId);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to signup with plan in URL
        router.push(`/auth/signup?plan=${planId}`);
        return;
      }

      // For free plan, just redirect to dashboard
      if (planId === 'free') {
        router.push('/dashboard');
        return;
      }

      // User is authenticated, create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle: 'monthly', // Default to monthly, can add toggle later
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Plan selection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to select plan');
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. No credit card required for free plan.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-sm ${
                plan.mostPopular ? 'ring-2 ring-purple-600' : ''
              }`}
            >
              {plan.mostPopular && (
                <div className="absolute -top-5 left-0 right-0 mx-auto w-fit">
                  <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price.monthly}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                
                <Button 
                  className="w-full mb-6" 
                  variant={plan.mostPopular ? 'default' : 'outline'}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
                
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Need more than 1000 replies per month?
          </p>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.location.href = 'mailto:support@replyguy.com?subject=Enterprise Plan Inquiry'}
          >
            Contact Us for Enterprise Plans
          </Button>
        </div>
      </div>
    </section>
  );
}