import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { MarketingWrapper } from '../components/marketing-wrapper';
import { CheckCircle, X, Star, Zap, Crown, Gift } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ReplyGuy Pricing - AI Twitter Reply Generator Plans | Start Free',
  description: 'Choose the perfect ReplyGuy plan for your Twitter growth needs. Free plan with 10 replies monthly, X Basic ($19/month), X Pro ($49/month), and X Business ($99/month). All plans include human-like AI replies and Chrome extension.',
  keywords: 'ReplyGuy pricing, AI reply generator cost, Twitter reply tool price, X reply generator plans, social media AI pricing, Chrome extension pricing, Twitter automation cost, reply bot pricing',
  openGraph: {
    title: 'ReplyGuy Pricing Plans - AI Twitter Reply Generator',
    description: 'Choose the perfect plan for your Twitter growth. Free plan available with 10 replies monthly. Premium plans starting at $19/month.',
    url: 'https://replyguy.appendment.com/pricing',
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/pricing',
  },
};

const plans = [
  {
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'Perfect for trying out ReplyGuy and casual Twitter users',
    featured: false,
    badge: null,
    features: {
      replies: '10 replies/month',
      memes: 'Basic meme templates',
      aiSuggestions: '5 AI suggestions',
      writeLikeMe: false,
      chromeExtension: true,
      prioritySupport: false,
      analytics: 'Basic stats',
      customPrompts: false,
      teamFeatures: false,
      apiAccess: false,
    },
    cta: 'Start Free',
    ctaLink: '/auth/signup',
  },
  {
    name: 'X Basic',
    price: 19,
    period: 'month',
    description: 'For active Twitter users who want to boost engagement',
    featured: true,
    badge: 'Most Popular',
    features: {
      replies: '300 replies/month',
      memes: '10 meme generations',
      aiSuggestions: '50 AI suggestions',
      writeLikeMe: true,
      chromeExtension: true,
      prioritySupport: false,
      analytics: 'Detailed analytics',
      customPrompts: true,
      teamFeatures: false,
      apiAccess: false,
    },
    cta: 'Choose X Basic',
    ctaLink: '/auth/signup?plan=basic',
  },
  {
    name: 'X Pro',
    price: 49,
    period: 'month',
    description: 'For power users, influencers, and content creators',
    featured: false,
    badge: null,
    features: {
      replies: '500 replies/month',
      memes: '50 meme generations',
      aiSuggestions: '100 AI suggestions',
      writeLikeMe: true,
      chromeExtension: true,
      prioritySupport: true,
      analytics: 'Advanced analytics',
      customPrompts: true,
      teamFeatures: '3 team members',
      apiAccess: false,
    },
    cta: 'Choose X Pro',
    ctaLink: '/auth/signup?plan=pro',
  },
  {
    name: 'X Business',
    price: 99,
    period: 'month',
    description: 'For agencies, teams, and businesses scaling their Twitter presence',
    featured: false,
    badge: 'Best Value',
    features: {
      replies: '1,000 replies/month',
      memes: '100 meme generations',
      aiSuggestions: '200 AI suggestions',
      writeLikeMe: true,
      chromeExtension: true,
      prioritySupport: true,
      analytics: 'Enterprise analytics',
      customPrompts: true,
      teamFeatures: '10 team members',
      apiAccess: true,
    },
    cta: 'Choose X Business',
    ctaLink: '/auth/signup?plan=business',
  },
];

const allFeatures = [
  {
    category: 'Reply Generation',
    features: [
      {
        name: 'Monthly Reply Quota',
        free: '10 replies',
        basic: '300 replies',
        pro: '500 replies',
        business: '1,000 replies',
        description: 'Total number of AI-generated replies you can create each month'
      },
      {
        name: 'Write Like Me™ Technology',
        free: false,
        basic: true,
        pro: true,
        business: true,
        description: 'AI learns your writing style to generate authentic replies that sound like you'
      },
      {
        name: 'Context-Aware Responses',
        free: true,
        basic: true,
        pro: true,
        business: true,
        description: 'AI analyzes tweet context to generate relevant, intelligent replies'
      },
      {
        name: 'Anti-AI Detection',
        free: true,
        basic: true,
        pro: true,
        business: true,
        description: 'Advanced algorithms ensure your replies pass as human-written'
      },
      {
        name: 'Real-time Fact Checking',
        free: false,
        basic: true,
        pro: true,
        business: true,
        description: 'Optional Perplexity AI integration for accurate, informed responses'
      }
    ]
  },
  {
    category: 'Chrome Extension',
    features: [
      {
        name: 'Browser Extension Access',
        free: true,
        basic: true,
        pro: true,
        business: true,
        description: 'Generate replies directly within X (Twitter) interface'
      },
      {
        name: 'One-Click Reply Generation',
        free: true,
        basic: true,
        pro: true,
        business: true,
        description: 'Generate replies instantly without leaving Twitter'
      },
      {
        name: 'Custom Reply Prompts',
        free: false,
        basic: true,
        pro: true,
        business: true,
        description: 'Create and save custom prompts for specific reply scenarios'
      }
    ]
  },
  {
    category: 'Content Creation',
    features: [
      {
        name: 'Meme Generation',
        free: 'Basic templates',
        basic: '10/month',
        pro: '50/month',
        business: '100/month',
        description: 'AI-powered meme creation to boost engagement and virality'
      },
      {
        name: 'AI Suggestion Engine',
        free: '5/month',
        basic: '50/month',
        pro: '100/month',
        business: '200/month',
        description: 'Get AI-powered suggestions for improving your replies'
      }
    ]
  },
  {
    category: 'Analytics & Insights',
    features: [
      {
        name: 'Reply Performance Analytics',
        free: 'Basic stats',
        basic: 'Detailed analytics',
        pro: 'Advanced analytics',
        business: 'Enterprise analytics',
        description: 'Track engagement rates, reach, and reply performance'
      },
      {
        name: 'Growth Tracking',
        free: false,
        basic: true,
        pro: true,
        business: true,
        description: 'Monitor follower growth and engagement improvements'
      },
      {
        name: 'Export Data',
        free: false,
        basic: false,
        pro: true,
        business: true,
        description: 'Export analytics data for external reporting and analysis'
      }
    ]
  },
  {
    category: 'Team & Collaboration',
    features: [
      {
        name: 'Team Member Access',
        free: '1 user',
        basic: '1 user',
        pro: '3 users',
        business: '10 users',
        description: 'Number of team members who can access the account'
      },
      {
        name: 'Shared Reply Templates',
        free: false,
        basic: false,
        pro: true,
        business: true,
        description: 'Create and share reply templates across team members'
      },
      {
        name: 'Team Analytics Dashboard',
        free: false,
        basic: false,
        pro: false,
        business: true,
        description: 'Centralized dashboard for tracking team performance'
      }
    ]
  },
  {
    category: 'Support & Integration',
    features: [
      {
        name: 'Customer Support',
        free: 'Community support',
        basic: 'Email support',
        pro: 'Priority support',
        business: 'Priority support + call',
        description: 'Level of customer support and response time'
      },
      {
        name: 'API Access',
        free: false,
        basic: false,
        pro: false,
        business: true,
        description: 'Integrate ReplyGuy with your own applications and workflows'
      },
      {
        name: 'Custom Integrations',
        free: false,
        basic: false,
        pro: false,
        business: 'Available',
        description: 'Custom integrations with your existing tools and workflows'
      }
    ]
  }
];

const faqs = [
  {
    question: 'How does the free plan work?',
    answer: 'Our free plan gives you 10 AI-generated replies per month with basic features, including our Chrome extension and context-aware responses. It&apos;s perfect for trying out ReplyGuy and casual Twitter users. No credit card required.'
  },
  {
    question: 'Can I change plans at any time?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at your next billing cycle, and you keep access to premium features until then.'
  },
  {
    question: 'What happens if I exceed my monthly reply limit?',
    answer: 'If you exceed your monthly quota, you can either upgrade to a higher plan or wait until the next billing cycle. We\'ll notify you when you\'re approaching your limit so you can plan accordingly.'
  },
  {
    question: 'How does Write Like Me™ technology work?',
    answer: 'Write Like Me™ analyzes your previous tweets and replies to learn your unique writing style, tone, and voice. The AI then generates replies that authentically sound like you wrote them, maintaining your personality and brand voice.'
  },
  {
    question: 'Is the Chrome extension included in all plans?',
    answer: 'Yes! Our Chrome extension is included in all plans, including the free tier. It allows you to generate replies directly within X (Twitter) without switching tabs or copying text.'
  },
  {
    question: 'How accurate is the anti-AI detection feature?',
    answer: 'Our anti-AI detection algorithms are highly sophisticated and constantly updated. We use advanced techniques to ensure your AI-generated replies maintain natural language patterns and avoid common AI tells that could harm your credibility.'
  },
  {
    question: 'Do you offer annual billing discounts?',
    answer: 'Yes! We offer a 20% discount for annual billing on all paid plans. This can save you significant money if you\'re planning to use ReplyGuy long-term.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time with no cancellation fees. You\'ll continue to have access to premium features until the end of your billing period.'
  },
  {
    question: 'What kind of support do you provide?',
    answer: 'Free users get community support through our Discord. Basic plan users get email support within 24-48 hours. Pro and Business users get priority support with faster response times. Business users also get phone support options.'
  },
  {
    question: 'How does team access work?',
    answer: 'Team access allows multiple users to share one account with separate logins. Each team member can use the reply quota and access features based on the plan level. Perfect for agencies and businesses managing multiple Twitter accounts.'
  }
];

export default function PricingPage() {
  const renderFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-gray-400 mx-auto" />
      );
    }
    return <span className="text-sm text-gray-900">{value}</span>;
  };

  return (
    <MarketingWrapper>
      {/* Hero Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Choose Your <span className="gradient-text">Growth Plan</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Start free and scale as you grow. Every plan includes our Chrome extension, 
              human-like AI replies, and anti-AI detection technology. No credit card required for free plan.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600 mb-12">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>30-day money-back guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-md ${
                  plan.featured ? 'border-purple-500 relative' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-600">/{plan.period}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{plan.features.replies}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{plan.features.memes}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{plan.features.aiSuggestions}</span>
                    </li>
                    {plan.features.writeLikeMe ? (
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">Write Like Me™</span>
                      </li>
                    ) : (
                      <li className="flex items-start gap-3">
                        <X className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-400">Write Like Me™</span>
                      </li>
                    )}
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Chrome Extension</span>
                    </li>
                  </ul>
                  
                  <Link href={plan.ctaLink}>
                    <Button 
                      className={`w-full ${
                        plan.featured 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : plan.name === 'Free' 
                            ? 'bg-gray-900 hover:bg-gray-800' 
                            : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Feature Comparison */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Complete Feature Comparison
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Compare all features across plans to find the perfect fit for your Twitter growth strategy. 
                Every feature is designed to help you build authentic connections and grow your audience.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">Free</th>
                    <th className="text-center py-4 px-4 font-semibold text-purple-600">X Basic</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">X Pro</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">X Business</th>
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((category) => (
                    <>
                      <tr key={category.category} className="bg-gray-50">
                        <td colSpan={5} className="py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wide">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{feature.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{feature.description}</div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            {renderFeatureValue(feature.free)}
                          </td>
                          <td className="text-center py-4 px-4">
                            {renderFeatureValue(feature.basic)}
                          </td>
                          <td className="text-center py-4 px-4">
                            {renderFeatureValue(feature.pro)}
                          </td>
                          <td className="text-center py-4 px-4">
                            {renderFeatureValue(feature.business)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600">
                Got questions? We&apos;ve got answers. Find everything you need to know about ReplyGuy pricing and features.
              </p>
            </div>
            
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{faq.question}</h3>
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-12 border border-purple-100">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Grow Your Twitter Presence?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of content creators, businesses, and influencers who use ReplyGuy to build authentic connections and grow their audience.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="gap-2">
                    <Gift className="w-5 h-5" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/chrome-extension">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Zap className="w-5 h-5" />
                    Install Chrome Extension
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                Start with 10 free replies. No credit card required. Upgrade anytime.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}