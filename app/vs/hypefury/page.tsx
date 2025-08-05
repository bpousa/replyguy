import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { ArrowRight, CheckCircle, X, DollarSign, Users, Zap, Shield, Chrome, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ReplyGuy vs Hypefury: Twitter Reply Generator Comparison 2025',
  description: 'Compare ReplyGuy vs Hypefury for Twitter automation. See why ReplyGuy is better for AI-powered replies with Write Like Me technology, Chrome extension, and authentic engagement.',
  keywords: 'ReplyGuy vs Hypefury, Hypefury alternative, Twitter reply generator comparison, social media automation tools, Twitter AI tools, Hypefury review, ReplyGuy review',
  openGraph: {
    title: 'ReplyGuy vs Hypefury: Twitter Reply Generator Comparison 2025',
    description: 'Detailed comparison of ReplyGuy vs Hypefury for Twitter automation. See why ReplyGuy is the better choice for authentic Twitter replies.',
    url: 'https://replyguy.com/vs/hypefury',
  },
  alternates: {
    canonical: 'https://replyguy.com/vs/hypefury',
  },
};

export default function ReplyGuyVsHypefuryPage() {
  const comparisonFeatures = [
    {
      category: 'AI Reply Generation',
      features: [
        {
          feature: 'AI-Powered Reply Generation',
          replyguy: { status: true, detail: 'Advanced AI with GPT-3.5 + Claude' },
          hypefury: { status: false, detail: 'Not available' }
        },
        {
          feature: 'Human-Like Responses',
          replyguy: { status: true, detail: 'Anti-AI detection technology' },
          hypefury: { status: false, detail: 'Not available' }
        },
        {
          feature: 'Write Like Me™ Personalization',
          replyguy: { status: true, detail: 'Analyzes your writing style' },
          hypefury: { status: false, detail: 'Not available' }
        },
        {
          feature: 'Real-time Research Integration',
          replyguy: { status: true, detail: 'Perplexity API integration' },
          hypefury: { status: false, detail: 'Not available' }
        }
      ]
    },
    {
      category: 'Integration & Usability',
      features: [
        {
          feature: 'Chrome Extension',
          replyguy: { status: true, detail: 'Direct Twitter integration' },
          hypefury: { status: false, detail: 'Not available' }
        },
        {
          feature: 'One-Click Reply Generation',
          replyguy: { status: true, detail: 'Generate replies in Twitter' },
          hypefury: { status: false, detail: 'Manual process required' }
        },
        {
          feature: 'Multi-Platform Support',
          replyguy: { status: false, detail: 'Twitter/X focused' },
          hypefury: { status: true, detail: 'Multiple platforms' }
        }
      ]
    },
    {
      category: 'Scheduling & Analytics',
      features: [
        {
          feature: 'Tweet Scheduling',
          replyguy: { status: false, detail: 'Not available' },
          hypefury: { status: true, detail: 'Advanced scheduling' }
        },
        {
          feature: 'Analytics Dashboard',
          replyguy: { status: true, detail: 'Reply performance tracking' },
          hypefury: { status: true, detail: 'Comprehensive analytics' }
        },
        {
          feature: 'Engagement Metrics',
          replyguy: { status: true, detail: 'Reply-focused metrics' },
          hypefury: { status: true, detail: 'General engagement metrics' }
        }
      ]
    },
    {
      category: 'Pricing & Value',
      features: [
        {
          feature: 'Free Plan',
          replyguy: { status: true, detail: '10 free replies monthly' },
          hypefury: { status: true, detail: 'Limited free tier' }
        },
        {
          feature: 'Starting Price',
          replyguy: { status: true, detail: '$19/month (X Basic)' },
          hypefury: { status: false, detail: '$19/month (Creator)' }
        },
        {
          feature: 'Value for Money',
          replyguy: { status: true, detail: 'AI features at low cost' },
          hypefury: { status: false, detail: 'Expensive for reply features' }
        }
      ]
    }
  ];

  const useCases = [
    {
      title: 'Individual Content Creators',
      replyguy: 'Perfect for creators who want to engage authentically with their audience using AI-generated replies that match their voice.',
      hypefury: 'Better for creators who need comprehensive scheduling and multi-platform management.',
      winner: 'ReplyGuy'
    },
    {
      title: 'Small Business Owners',
      replyguy: 'Ideal for businesses that want to increase Twitter engagement through meaningful replies without sounding robotic.',
      hypefury: 'Good for businesses that need full social media management across multiple platforms.',
      winner: 'Tie'
    },
    {
      title: 'Social Media Managers',
      replyguy: 'Great for managers focused on Twitter engagement and building authentic connections.',
      hypefury: 'Better for managers handling multiple clients across various social platforms.',
      winner: 'Hypefury'
    },
    {
      title: 'Twitter Growth Enthusiasts',
      replyguy: 'Unmatched for users who want to grow their Twitter following through authentic, engaging replies.',
      hypefury: 'Limited reply features make it less effective for reply-based growth strategies.',
      winner: 'ReplyGuy'
    }
  ];

  return (
    <MarketingWrapper>
      <Breadcrumb 
        items={[
          { label: 'Alternatives', href: '/alternatives' },
          { label: 'ReplyGuy vs Hypefury' }
        ]} 
      />
      
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                <span className="gradient-text">ReplyGuy</span> vs <span className="text-orange-600">Hypefury</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Detailed comparison of ReplyGuy and Hypefury for Twitter automation. 
                See which tool is better for your Twitter growth and engagement strategy.
              </p>
            </div>

            {/* Quick Comparison Cards */}
            <div className="grid lg:grid-cols-2 gap-8 mb-16">
              {/* ReplyGuy Card */}
              <Card className="shadow-xl border-2 border-purple-200">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Image
                      src="/reply_guy_logo.png"
                      alt="ReplyGuy"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">ReplyGuy</h3>
                  <p className="text-gray-600 mb-4">AI-Powered Twitter Reply Generator</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">AI Reply Generation</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Write Like Me™ Technology</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Chrome Extension</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Anti-AI Detection</span>
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold text-purple-600 mb-4">$19/month</div>
                  <Link href="/auth/signup">
                    <Button size="lg" className="w-full gap-2">
                      Try ReplyGuy Free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Hypefury Card */}
              <Card className="shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Hypefury</h3>
                  <p className="text-gray-600 mb-4">Social Media Growth & Scheduling</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Advanced Scheduling</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Multi-Platform Support</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Analytics Dashboard</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-red-500">
                      <X className="w-4 h-4" />
                      <span className="text-sm">No AI Reply Generation</span>
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold text-orange-600 mb-4">$19/month</div>
                  <Button size="lg" variant="outline" className="w-full">
                    Visit Hypefury
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Feature Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Feature-by-Feature Comparison
              </h2>
              <p className="text-xl text-gray-600">
                See how ReplyGuy and Hypefury compare across key features
              </p>
            </div>

            <div className="space-y-12">
              {comparisonFeatures.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    {category.category}
                  </h3>
                  
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                            <th className="px-6 py-4 text-center font-semibold text-purple-900">ReplyGuy</th>
                            <th className="px-6 py-4 text-center font-semibold text-orange-900">Hypefury</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.features.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {item.feature}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  {item.replyguy.status ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                  ) : (
                                    <X className="w-6 h-6 text-red-500" />
                                  )}
                                  <span className="text-xs text-gray-600 text-center">
                                    {item.replyguy.detail}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  {item.hypefury.status ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                  ) : (
                                    <X className="w-6 h-6 text-red-500" />
                                  )}
                                  <span className="text-xs text-gray-600 text-center">
                                    {item.hypefury.detail}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Case Comparison */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Which Tool Is Right for You?
              </h2>
              <p className="text-xl text-gray-600">
                Choose the best tool based on your specific needs and use case
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {useCases.map((useCase, index) => (
                <Card key={index} className="shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {useCase.title}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">ReplyGuy:</h4>
                        <p className="text-purple-800 text-sm">
                          {useCase.replyguy}
                        </p>
                      </div>
                      
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <h4 className="font-semibold text-orange-900 mb-2">Hypefury:</h4>
                        <p className="text-orange-800 text-sm">
                          {useCase.hypefury}
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-100 rounded-lg">
                        <span className="font-semibold text-gray-900">
                          Best Choice: {useCase.winner === 'ReplyGuy' ? '🟣' : useCase.winner === 'Hypefury' ? '🟠' : '⚖️'} {useCase.winner}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final Recommendation */}
      <section className="py-20 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Our Recommendation
            </h2>
            
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-purple-600 mb-4">
                Choose ReplyGuy if you want:
              </h3>
              <ul className="text-left max-w-2xl mx-auto space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>AI-powered Twitter reply generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Replies that sound authentically like you</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Chrome extension for seamless integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Focus on Twitter engagement and growth</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Affordable pricing with free tier</span>
                </li>
              </ul>
              
              <p className="text-gray-600 mb-6">
                <strong>Choose Hypefury if you need:</strong> Comprehensive social media management 
                across multiple platforms with advanced scheduling features, and don't need AI reply generation.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try ReplyGuy Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/alternatives">
                <Button size="lg" variant="outline">
                  Compare More Tools
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}