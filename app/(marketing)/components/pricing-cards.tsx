import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    id: 'free',
    href: '/auth/signup',
    price: { monthly: '$0', yearly: '$0' },
    description: 'Perfect for getting started',
    features: [
      '10 replies per month',
      'Basic reply types',
      'Standard support',
      'Daily goal tracking',
    ],
    cta: 'Start Free',
    mostPopular: false,
  },
  {
    name: 'Basic',
    id: 'basic',
    href: '/auth/signup',
    price: { monthly: '$19', yearly: '$190' },
    description: 'For regular X users',
    features: [
      '50 replies per month',
      'All reply types',
      'Priority support',
      'Daily goal tracking',
      'Usage analytics',
    ],
    cta: 'Start Free Trial',
    mostPopular: false,
  },
  {
    name: 'Pro',
    id: 'pro',
    href: '/auth/signup',
    price: { monthly: '$49', yearly: '$490' },
    description: 'For power users and creators',
    features: [
      '150 replies per month',
      'All reply types',
      'Priority support',
      'Advanced analytics',
      'Custom reply styles',
      'API access',
    ],
    cta: 'Start Free Trial',
    mostPopular: true,
  },
  {
    name: 'Business',
    id: 'business',
    href: '/auth/signup',
    price: { monthly: '$99', yearly: '$990' },
    description: 'For teams and agencies',
    features: [
      '500 replies per month',
      'Everything in Pro',
      'Team collaboration',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Start Free Trial',
    mostPopular: false,
  },
];

export function PricingCards() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 7-day free trial.
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
                
                <Link href={plan.href}>
                  <Button 
                    className="w-full mb-6" 
                    variant={plan.mostPopular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
                
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
            Need more than 500 replies per month?
          </p>
          <Link href="/auth/signup">
            <Button variant="outline" size="lg">
              Contact Us for Enterprise Plans
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}