import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { ArrowRight, CheckCircle, X, DollarSign, Users, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ReplyGuy vs Hootsuite: Best Twitter Reply Generator Alternative 2025',
  description: 'Compare ReplyGuy vs Hootsuite for Twitter automation. ReplyGuy offers AI-powered replies with personalization while Hootsuite focuses on enterprise management. See the difference.',
  keywords: 'ReplyGuy vs Hootsuite, Hootsuite alternative, Twitter reply generator, social media automation, Twitter AI tools, Hootsuite comparison, enterprise twitter tools',
  openGraph: {
    title: 'ReplyGuy vs Hootsuite: Best Twitter Reply Generator Alternative 2025',
    description: 'Detailed comparison of ReplyGuy vs Hootsuite for Twitter automation. See why ReplyGuy excels at AI-powered replies.',
    url: 'https://replyguy.appendment.com/vs/hootsuite',
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/vs/hootsuite',
  },
};

export default function ReplyGuyVsHootsuiteePage() {
  const comparisonFeatures = [
    {
      feature: 'AI Reply Generation',
      replyguy: true,
      hootsuite: false,
      description: 'ReplyGuy specializes in AI-powered replies, Hootsuite is enterprise management focused'
    },
    {
      feature: 'Write Like Me™ Personalization',
      replyguy: true,
      hootsuite: false,
      description: 'ReplyGuy learns your writing style, Hootsuite uses generic responses'
    },
    {
      feature: 'Chrome Extension',
      replyguy: true,
      hootsuite: false,
      description: 'ReplyGuy works directly on Twitter, Hootsuite requires separate dashboard'
    },
    {
      feature: 'Real-time Research',
      replyguy: true,
      hootsuite: false,
      description: 'ReplyGuy includes fact-checking, Hootsuite has no research capabilities'
    },
    {
      feature: 'Enterprise Team Management',
      replyguy: false,
      hootsuite: true,
      description: 'Hootsuite excels at team management, ReplyGuy focuses on individuals'
    },
    {
      feature: 'Multi-platform Support',
      replyguy: false,
      hootsuite: true,
      description: 'Hootsuite supports many platforms, ReplyGuy specializes in Twitter/X'
    }
  ];

  return (
    <MarketingWrapper>
      <Breadcrumb 
        items={[
          { label: 'Alternatives', href: '/alternatives' },
          { label: 'ReplyGuy vs Hootsuite' }
        ]} 
      />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              ReplyGuy vs Hootsuite: Which is Better for Twitter Replies?
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Compare ReplyGuy&apos;s AI-powered reply generation vs Hootsuite&apos;s enterprise social media management platform. See which tool better fits your Twitter engagement strategy.
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
              ReplyGuy vs Hootsuite: At a Glance
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border-2 border-purple-200">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-purple-900 mb-2">ReplyGuy</h3>
                  <p className="text-purple-700">AI Reply Specialist</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">AI-powered reply generation</span>
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Hootsuite</h3>
                  <p className="text-gray-600">Enterprise Social Management</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Enterprise team management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Multi-platform support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-gray-500">No AI reply generation</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">$99/month</p>
                  <p className="text-gray-600">Professional plan</p>
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
                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Hootsuite</th>
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
                        {item.hootsuite ? (
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
                      <p className="text-sm text-gray-600 font-medium mb-2">Hootsuite</p>
                      {item.hootsuite ? (
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
              Looking for a More Affordable Alternative to Hootsuite for Twitter Replies?
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Get AI-powered replies at a fraction of the cost. No enterprise complexity required.
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