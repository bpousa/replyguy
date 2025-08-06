import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { ArrowRight, CheckCircle, X, DollarSign, Users, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ReplyGuy vs Copy.ai: Best Twitter Reply Generator Alternative 2025',
  description: 'Compare ReplyGuy vs Copy.ai for Twitter automation. ReplyGuy specializes in Twitter replies with personalization while Copy.ai focuses on general marketing copy.',
  keywords: 'ReplyGuy vs Copy.ai, Copy.ai alternative, Twitter reply generator, AI writing tools, Twitter AI tools, Copy.ai comparison, social media automation',
  openGraph: {
    title: 'ReplyGuy vs Copy.ai: Best Twitter Reply Generator Alternative 2025',
    description: 'Detailed comparison of ReplyGuy vs Copy.ai for Twitter automation. See why ReplyGuy excels at Twitter-specific AI replies.',
    url: 'https://replyguy.appendment.com/vs/copy-ai',
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/vs/copy-ai',
  },
};

export default function ReplyGuyVsCopyAIPage() {
  const comparisonFeatures = [
    {
      feature: 'Twitter-Specific AI Replies',
      replyguy: true,
      copyai: false,
      description: 'ReplyGuy specializes in Twitter replies, Copy.ai is general marketing copy'
    },
    {
      feature: 'Write Like Me™ Personalization',
      replyguy: true,
      copyai: false,
      description: 'ReplyGuy learns your Twitter style, Copy.ai uses template-based generation'
    },
    {
      feature: 'Chrome Extension',
      replyguy: true,
      copyai: false,
      description: 'ReplyGuy works directly on Twitter, Copy.ai requires separate interface'
    },
    {
      feature: 'Real-time Research Integration',
      replyguy: true,
      copyai: false,
      description: 'ReplyGuy includes fact-checking for replies, Copy.ai focuses on copy creation'
    },
    {
      feature: 'Marketing Copy Templates',
      replyguy: false,
      copyai: true,
      description: 'Copy.ai offers extensive marketing templates, ReplyGuy is reply-focused'
    },
    {
      feature: 'Sales Copy Generation',
      replyguy: false,
      copyai: true,
      description: 'Copy.ai excels at sales copy, ReplyGuy focuses on authentic engagement'
    }
  ];

  return (
    <MarketingWrapper>
      <Breadcrumb 
        items={[
          { label: 'Alternatives', href: '/alternatives' },
          { label: 'ReplyGuy vs Copy.ai' }
        ]} 
      />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              ReplyGuy vs Copy.ai: Which is Better for Twitter Replies?
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Compare ReplyGuy&apos;s Twitter-focused AI reply generation vs Copy.ai&apos;s marketing copy platform. See which tool better serves your Twitter engagement strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try ReplyGuy Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Comparison */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              ReplyGuy vs Copy.ai: At a Glance
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border-2 border-purple-200">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-purple-900 mb-2">ReplyGuy</h3>
                  <p className="text-purple-700">Twitter Reply Specialist</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Twitter-specific AI replies</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Personalized writing style</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Chrome extension</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Real-time fact checking</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-purple-900">$19/month</p>
                  <p className="text-purple-700">300 replies included</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Copy.ai</h3>
                  <p className="text-gray-600">Marketing Copy Generation</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Marketing copy templates</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Sales copy generation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Multiple copy variations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-gray-500">No Twitter-specific features</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">$36/month</p>
                  <p className="text-gray-600">Pro plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Detailed Feature Comparison
            </h2>
            
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-lg shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-center font-semibold text-purple-900">ReplyGuy</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Copy.ai</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.feature}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.replyguy ? (
                          <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-6 h-6 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.copyai ? (
                          <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-6 h-6 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {comparisonFeatures.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">{item.feature}</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium mb-2">ReplyGuy</p>
                      {item.replyguy ? (
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-8 h-8 text-red-500 mx-auto" />
                      )}
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium mb-2">Copy.ai</p>
                      {item.copyai ? (
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-8 h-8 text-red-500 mx-auto" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto text-white">
            <h2 className="text-3xl font-bold mb-6">
              Need Twitter-Specific AI Instead of General Marketing Copy?
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Get specialized Twitter reply generation that focuses on authentic engagement, not sales copy.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}