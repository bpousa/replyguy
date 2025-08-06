import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { ArrowRight, CheckCircle, X, DollarSign, Users, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ReplyGuy vs Jasper AI: Best Twitter Reply Generator Alternative 2025',
  description: 'Compare ReplyGuy vs Jasper AI for Twitter automation. ReplyGuy specializes in Twitter replies with Chrome extension while Jasper focuses on general content creation.',
  keywords: 'ReplyGuy vs Jasper AI, Jasper alternative, Twitter reply generator, AI writing tools, Twitter AI tools, Jasper AI comparison, social media automation',
  openGraph: {
    title: 'ReplyGuy vs Jasper AI: Best Twitter Reply Generator Alternative 2025',
    description: 'Detailed comparison of ReplyGuy vs Jasper AI for Twitter automation. See why ReplyGuy excels at Twitter-specific AI replies.',
    url: 'https://replyguy.appendment.com/vs/jasper-ai',
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/vs/jasper-ai',
  },
};

export default function ReplyGuyVsJasperPage() {
  const comparisonFeatures = [
    {
      feature: 'Twitter-Specific AI Replies',
      replyguy: true,
      jasper: false,
      description: 'ReplyGuy specializes in Twitter replies, Jasper is general content creation'
    },
    {
      feature: 'Write Like Me™ Personalization',
      replyguy: true,
      jasper: false,
      description: 'ReplyGuy learns your Twitter style, Jasper uses generic AI writing'
    },
    {
      feature: 'Chrome Extension',
      replyguy: true,
      jasper: false,
      description: 'ReplyGuy works directly on Twitter, Jasper requires separate interface'
    },
    {
      feature: 'Real-time Research Integration',
      replyguy: true,
      jasper: false,
      description: 'ReplyGuy includes fact-checking for replies, Jasper focuses on content creation'
    },
    {
      feature: 'Long-form Content Creation',
      replyguy: false,
      jasper: true,
      description: 'Jasper excels at blog posts and articles, ReplyGuy focuses on replies'
    },
    {
      feature: 'Marketing Copy Templates',
      replyguy: false,
      jasper: true,
      description: 'Jasper offers extensive marketing templates, ReplyGuy is reply-focused'
    }
  ];

  return (
    <MarketingWrapper>
      <Breadcrumb 
        items={[
          { label: 'Alternatives', href: '/alternatives' },
          { label: 'ReplyGuy vs Jasper AI' }
        ]} 
      />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              ReplyGuy vs Jasper AI: Which is Better for Twitter Replies?
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Compare ReplyGuy&apos;s Twitter-focused AI reply generation vs Jasper AI&apos;s general content creation platform. See which tool better serves your Twitter engagement needs.
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
              ReplyGuy vs Jasper AI: At a Glance
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Jasper AI</h3>
                  <p className="text-gray-600">General Content Creation</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Long-form content creation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Marketing copy templates</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Brand voice training</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-gray-500">No Twitter-specific features</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">$49/month</p>
                  <p className="text-gray-600">Creator plan</p>
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
                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Jasper AI</th>
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
                        {item.jasper ? (
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
                      <p className="text-sm text-gray-600 font-medium mb-2">Jasper AI</p>
                      {item.jasper ? (
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
              Need Twitter-Specific AI Instead of General Content Creation?
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Get specialized Twitter reply generation at a fraction of the cost of general AI tools.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}