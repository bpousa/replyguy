import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { ArrowRight, CheckCircle, Chrome, Users, TrendingUp, MessageCircle, Zap, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'X Reply Generator - AI-Powered Responses for X Platform | ReplyGuy',
  description: 'Generate engaging X replies instantly with AI. Our X reply generator creates authentic responses that boost engagement on X (formerly Twitter). Free Chrome extension included.',
  keywords: 'X reply generator, X AI replies, X platform replies, X response generator, automated X replies, X engagement tool, X reply bot, AI X replies, X marketing tool, X growth tool',
  openGraph: {
    title: 'X Reply Generator - AI-Powered Responses for X Platform',
    description: 'Generate engaging X replies instantly with AI. Boost engagement and grow your following on X with authentic responses. Chrome extension included.',
    url: 'https://replyguy.com/x-reply-generator',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'X Reply Generator Interface - Generate engaging X platform responses',
      },
    ],
  },
  alternates: {
    canonical: 'https://replyguy.com/x-reply-generator',
  },
};

export default function XReplyGeneratorPage() {
  const xFeatures = [
    {
      icon: Zap,
      title: 'Instant X Replies',
      description: 'Generate perfect responses for X posts in seconds, not minutes'
    },
    {
      icon: Shield,
      title: 'Undetectable AI',
      description: 'Replies bypass AI detection and sound genuinely human on X'
    },
    {
      icon: Users,
      title: 'X Growth Focused',
      description: 'Optimized for X\'s algorithm to maximize engagement and reach'
    },
    {
      icon: Chrome,
      title: 'Native X Integration',
      description: 'Works directly in X with our Chrome extension - no copy/paste needed'
    }
  ];

  const xStrategies = [
    'Reply to trending topics for maximum visibility',
    'Engage with influencers in your niche',
    'Add value to conversations with thoughtful insights',
    'Use humor appropriately to increase engagement',
    'Ask questions to spark meaningful discussions',
    'Share relevant experiences and expertise'
  ];

  return (
    <MarketingWrapper>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-8">
              <Image
                src="/reply_guy_logo.png"
                alt="X Reply Generator"
                width={80}
                height={80}
                className="mx-auto object-contain"
                priority
              />
            </div>
            
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              Optimized for X Platform
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="gradient-text">X Reply Generator</span> for Maximum Engagement
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Generate engaging X replies that sound authentically human and boost your presence on X (formerly Twitter). 
              Our AI-powered X reply generator is specifically optimized for the X platform&apos;s unique culture and algorithm.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Generating X Replies
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                className="gap-2"
                asChild
              >
                <a 
                  href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Chrome className="w-4 h-4" />
                  Install X Extension
                </a>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>10 free X replies monthly</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Works natively in X platform</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Authentic human-like responses</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* X-Specific Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built Specifically for X Platform
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our X reply generator understands the unique culture and engagement patterns of X
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {xFeatures.map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                      <feature.icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* X Platform Strategies */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Proven X Engagement Strategies
              </h2>
              <p className="text-xl text-gray-600">
                Our X reply generator implements strategies that work best on the X platform
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {xStrategies.map((strategy, index) => (
                <div key={index} className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-lg">
                  <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 font-medium">{strategy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Write Like Me for X */}
      <section className="py-20 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Your Voice, Amplified on X
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Our Write Like Me™ technology analyzes your X posting history to generate 
                  replies that sound authentically like you. Maintain your unique voice while 
                  scaling your X engagement.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Analyzes your X posting style</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Matches your tone and personality</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Maintains authentic voice across replies</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Continuously learns and improves</span>
                  </div>
                </div>

                <Link href="/write-like-me">
                  <Button size="lg" variant="outline">
                    Learn About Write Like Me™
                  </Button>
                </Link>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/generated-reply1280x800.png"
                  alt="X Reply Generator with Write Like Me"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison with Twitter */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                X vs Twitter: What&apos;s Changed?
              </h2>
              <p className="text-xl text-gray-600">
                Our X reply generator adapts to the evolving platform
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Same Core Features
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">280 character replies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Real-time conversations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Hashtag and mention support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Thread reply functionality</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    X Platform Enhancements
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Updated UI and branding</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Enhanced algorithm changes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">New engagement metrics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Evolving content policies</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Dominate X Platform Conversations
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands using our X reply generator to create more engaging conversations. 
              Get 10 free X replies to start - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Generating X Replies
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/ai-reply-generator">
                <Button size="lg" variant="outline">
                  Try AI Reply Generator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}