import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { ArrowRight, CheckCircle, X, Star, Users, Zap, Shield, Chrome } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Twitter Reply Generator Alternatives 2025 | ReplyGuy vs Competitors',
  description: 'Compare the best Twitter reply generators and AI social media tools. See how ReplyGuy stacks up against Hypefury, Buffer, Hootsuite, and other alternatives for Twitter automation.',
  keywords: 'Twitter reply generator alternatives, Hypefury alternative, Buffer alternative, social media automation tools, Twitter AI tools, best Twitter tools, social media management alternatives, Twitter engagement tools',
  openGraph: {
    title: 'Best Twitter Reply Generator Alternatives 2025 | ReplyGuy vs Competitors',
    description: 'Compare the best Twitter reply generators and AI social media tools. See why ReplyGuy is the top choice for authentic Twitter engagement.',
    url: 'https://replyguy.appendment.com/alternatives',
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/alternatives',
  },
};

export default function AlternativesPage() {
  const alternatives = [
    {
      name: 'Hypefury',
      description: 'Social media scheduling and growth tool with some reply features',
      pricing: 'Starting at $19/month',
      strengths: ['Good scheduling features', 'Analytics dashboard', 'Multiple platform support'],
      weaknesses: ['Limited AI reply generation', 'No personalization', 'Generic responses'],
      rating: 3.5,
      logo: '🚀',
      comparisonUrl: '/vs/hypefury'
    },
    {
      name: 'Buffer',
      description: 'Social media management platform with basic engagement tools',
      pricing: 'Starting at $15/month',
      strengths: ['Comprehensive scheduling', 'Good analytics', 'Team collaboration'],
      weaknesses: ['No AI reply generation', 'Manual reply process', 'No personalization'],
      rating: 3.0,
      logo: '📊',
      comparisonUrl: '/vs/buffer'
    },
    {
      name: 'Hootsuite',
      description: 'Enterprise social media management with monitoring features',
      pricing: 'Starting at $99/month',
      strengths: ['Enterprise features', 'Comprehensive monitoring', 'Team management'],
      weaknesses: ['Very expensive', 'Complex interface', 'No AI replies'],
      rating: 3.0,
      logo: '🦉',
      comparisonUrl: '/vs/hootsuite'
    },
    {
      name: 'Jasper AI',
      description: 'General AI writing tool with some social media features',
      pricing: 'Starting at $40/month',
      strengths: ['Good AI writing', 'Multiple use cases', 'Templates'],
      weaknesses: ['Not Twitter-specific', 'No automation', 'Expensive'],
      rating: 3.5,
      logo: '🤖',
      comparisonUrl: '/vs/jasper-ai'
    },
    {
      name: 'Copy.ai',
      description: 'AI copywriting tool with social media templates',
      pricing: 'Starting at $36/month',
      strengths: ['AI copywriting', 'Various templates', 'Good for content'],
      weaknesses: ['Not reply-focused', 'No automation', 'Generic output'],
      rating: 3.0,
      logo: '✍️',
      comparisonUrl: '/vs/copy-ai'
    },
    {
      name: 'Tweethunter',
      description: 'Twitter growth tool with scheduling and analytics',
      pricing: 'Starting at $49/month',
      strengths: ['Twitter-focused', 'Growth analytics', 'Scheduling'],
      weaknesses: ['No AI replies', 'Expensive', 'Limited features'],
      rating: 3.5,
      logo: '🐦',
      comparisonUrl: '/vs/tweethunter'
    }
  ];

  const replyGuyFeatures = [
    {
      feature: 'AI Reply Generation',
      replyguy: true,
      competitors: 'Limited/None'
    },
    {
      feature: 'Write Like Me™ Personalization',
      replyguy: true,
      competitors: 'None'
    },
    {
      feature: 'Chrome Extension',
      replyguy: true,
      competitors: 'Some'
    },
    {
      feature: 'Anti-AI Detection',
      replyguy: true,
      competitors: 'None'
    },
    {
      feature: 'Real-time Research',
      replyguy: true,
      competitors: 'None'
    },
    {
      feature: 'Human-like Responses',
      replyguy: true,
      competitors: 'Limited'
    },
    {
      feature: 'Affordable Pricing',
      replyguy: true,
      competitors: 'Expensive'
    },
    {
      feature: 'Free Plan Available',
      replyguy: true,
      competitors: 'Limited'
    }
  ];

  return (
    <MarketingWrapper>
      <Breadcrumb 
        items={[
          { label: 'Alternatives' }
        ]} 
      />
      
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Best <span className="gradient-text">Twitter Reply Generator</span> Alternatives in 2025
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Compare ReplyGuy with other Twitter automation tools and social media management platforms. 
              See why thousands choose ReplyGuy for authentic, AI-powered Twitter engagement.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try ReplyGuy Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  See How ReplyGuy Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                ReplyGuy vs Competitors
              </h2>
              <p className="text-xl text-gray-600">
                See how ReplyGuy compares to other Twitter tools and AI writing platforms
              </p>
            </div>

            {/* Desktop: Table view for large screens */}
            <div className="hidden lg:block bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                      <th className="px-6 py-4 text-center font-semibold text-purple-900">ReplyGuy</th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-900">Competitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replyGuyFeatures.map((item, index) => (
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
                        <td className="px-6 py-4 text-center text-gray-600">
                          {item.competitors}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Card-based layout */}
            <div className="lg:hidden space-y-4">
              {replyGuyFeatures.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">{item.feature}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium mb-2">ReplyGuy</p>
                      {item.replyguy ? (
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-8 h-8 text-red-500 mx-auto" />
                      )}
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium mb-2">Competitors</p>
                      <p className="text-sm text-gray-700 font-medium">{item.competitors}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Alternatives Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Popular Twitter Tool Alternatives
              </h2>
              <p className="text-xl text-gray-600">
                Detailed comparison of ReplyGuy with leading social media management tools
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {alternatives.map((alt, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">{alt.logo}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {alt.name}
                      </h3>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(alt.rating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : i < alt.rating 
                                ? 'fill-yellow-200 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">
                          {alt.rating}/5
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">
                        {alt.description}
                      </p>
                      <p className="font-semibold text-purple-600">
                        {alt.pricing}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold text-green-700 mb-2">✅ Strengths:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {alt.strengths.map((strength, i) => (
                          <li key={i}>• {strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold text-red-700 mb-2">❌ Limitations:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {alt.weaknesses.map((weakness, i) => (
                          <li key={i}>• {weakness}</li>
                        ))}
                      </ul>
                    </div>

                    <Link href={alt.comparisonUrl}>
                      <Button variant="outline" className="w-full">
                        Detailed Comparison
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose ReplyGuy */}
      <section className="py-20 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Why ReplyGuy Beats the Competition
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  While other tools focus on scheduling and analytics, ReplyGuy is the only 
                  platform specifically designed for creating authentic, engaging Twitter replies 
                  that sound exactly like you.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Purpose-Built for Replies</h4>
                      <p className="text-gray-600">Unlike general social media tools, ReplyGuy is specifically designed for Twitter reply generation.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Write Like Me™ Technology</h4>
                      <p className="text-gray-600">Only ReplyGuy analyzes your writing style to create personalized responses that sound like you.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Anti-AI Detection</h4>
                      <p className="text-gray-600">Advanced technology ensures your replies bypass AI detection and sound genuinely human.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Chrome className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Seamless Integration</h4>
                      <p className="text-gray-600">Chrome extension works directly in Twitter/X - no copying and pasting required.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Link href="/auth/signup">
                    <Button size="lg" className="gap-2">
                      Try ReplyGuy Free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/chrome-extension">
                    <Button size="lg" variant="outline" className="gap-2">
                      <Chrome className="w-4 h-4" />
                      Install Extension
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="text-center">
                <Image
                  src="/main-interface12880x800.png"
                  alt="ReplyGuy vs Alternatives"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to Try the Best Twitter Reply Generator?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands who chose ReplyGuy over alternatives for authentic Twitter engagement. 
              Get 10 free AI-generated replies to start - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}