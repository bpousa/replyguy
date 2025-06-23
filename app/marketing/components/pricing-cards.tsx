'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: '10 replies/month', included: true },
      { text: 'Standard tweets (280 chars)', included: true },
      { text: 'Short replies only', included: true },
      { text: 'Basic tones', included: true },
      { text: 'Memes', included: false },
      { text: 'AI suggestions', included: false },
      { text: 'Style matching', included: false },
      { text: 'Real-time research', included: false },
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for casual users',
    price: { monthly: 9, yearly: 90 },
    features: [
      { text: '50 replies/month', included: true },
      { text: 'Extended tweets (500 chars)', included: true },
      { text: 'Short replies only', included: true },
      { text: 'All tones', included: true },
      { text: '25 AI suggestions/month', included: true },
      { text: 'Memes', included: false },
      { text: 'Style matching', included: false },
      { text: 'Real-time research', included: false },
    ],
    cta: 'Start Basic',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Great for regular tweeters',
    price: { monthly: 19, yearly: 190 },
    features: [
      { text: '150 replies/month', included: true },
      { text: 'Long tweets (1000 chars)', included: true },
      { text: 'Medium replies (560 chars)', included: true },
      { text: 'All tones', included: true },
      { text: '50 AI suggestions/month', included: true },
      { text: '25 memes/month', included: true },
      { text: 'Style matching', included: true },
      { text: 'Real-time research', included: false },
    ],
    cta: 'Go Pro',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For power users',
    price: { monthly: 29, yearly: 290 },
    features: [
      { text: '500 replies/month', included: true },
      { text: 'Extended tweets (1500 chars)', included: true },
      { text: 'Long replies (1000 chars)', included: true },
      { text: 'All tones', included: true },
      { text: '100 AI suggestions/month', included: true },
      { text: '100 memes/month', included: true },
      { text: 'Style matching', included: true },
      { text: 'Real-time research', included: true },
    ],
    cta: 'Go Business',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and agencies',
    price: { monthly: 49, yearly: 490 },
    features: [
      { text: '1000 replies/month', included: true },
      { text: 'Max tweet length (2000 chars)', included: true },
      { text: 'Extra long replies (1500 chars)', included: true },
      { text: 'All tones + custom', included: true },
      { text: 'Unlimited AI suggestions', included: true },
      { text: '200 memes/month', included: true },
      { text: 'Advanced style matching', included: true },
      { text: 'Priority real-time research', included: true },
    ],
    cta: 'Go Enterprise',
    popular: false,
  },
];

export function PricingCards() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Choose the plan that fits your Twitter game. Upgrade or downgrade anytime.
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <span className={billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}>
                Monthly
              </span>
              <Switch
                checked={billingCycle === 'yearly'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
              />
              <span className={billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}>
                Yearly
                <span className="ml-2 text-sm text-green-600 font-medium">Save 17%</span>
              </span>
            </div>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${plan.popular ? 'lg:-mt-4' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className={`bg-white rounded-2xl p-8 h-full flex flex-col ${
                plan.popular 
                  ? 'shadow-2xl border-2 border-purple-200' 
                  : 'shadow-sm border'
              }`}>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price[billingCycle]}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mr-3 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Link href={plan.id === 'free' ? '/signup' : `/signup?plan=${plan.id}`} className="w-full">
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            All plans include community support and basic features.
          </p>
          <p className="text-sm text-gray-500">
            Enterprise plan available for teams. <Link href="/contact" className="text-purple-600 hover:underline">Contact us</Link> for details.
          </p>
        </div>
      </div>
    </section>
  );
}