import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { ArrowRight, CheckCircle, Zap, Shield, Brain, Chrome, Users, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Reply Generator - Create Human-Like Responses Instantly | ReplyGuy',
  description: 'Generate authentic AI replies for social media posts in seconds. Our advanced AI reply generator creates human-like responses that boost engagement. Free trial - no credit card required.',
  keywords: 'AI reply generator, artificial intelligence replies, automated responses, AI-generated replies, smart reply generator, AI response tool, intelligent replies, automated reply system, AI chat responses, machine learning replies',
  openGraph: {
    title: 'AI Reply Generator - Create Human-Like Responses Instantly',
    description: 'Generate authentic AI replies for social media posts in seconds. Advanced AI reply generator with human-like responses. Free trial available.',
    url: 'https://replyguy.com/ai-reply-generator',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'AI Reply Generator Interface - Create authentic responses instantly',
      },
    ],
  },
  alternates: {
    canonical: 'https://replyguy.com/ai-reply-generator',
  },
};

export default function AIReplyGeneratorPage() {
  const features = [
    {
      icon: Brain,
      title: 'Advanced AI Technology',
      description: 'Powered by GPT-3.5, Claude, and Perplexity for intelligent, contextual responses'
    },
    {
      icon: Shield,
      title: 'Anti-AI Detection',
      description: 'Replies sound genuinely human with advanced detection avoidance technology'
    },
    {
      icon: Zap,
      title: 'Instant Generation',
      description: 'Generate authentic replies in seconds, not minutes'
    },
    {
      icon: Users,
      title: 'Write Like You',
      description: 'Personalized responses that match your unique writing style and voice'
    },
    {
      icon: Chrome,
      title: 'Chrome Extension',
      description: 'Seamless integration directly in your browser for any social platform'
    },
    {
      icon: TrendingUp,
      title: 'Boost Engagement',
      description: 'Increase replies, likes, and follower growth with better responses'
    }
  ];

  const useCases = [
    'Social media management for brands',
    'Personal Twitter/X engagement',
    'Customer service responses',
    'Community management',
    'Content creator interactions',
    'Professional networking replies'
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
                alt="AI Reply Generator"
                width={80}
                height={80}
                className="mx-auto object-contain"
                priority
              />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              The Most Advanced <span className="gradient-text">AI Reply Generator</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create authentic, human-like replies for any social media post using cutting-edge AI technology. 
              Our AI reply generator understands context, tone, and audience to craft perfect responses every time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try AI Reply Generator Free
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
                  Install Chrome Extension
                </a>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>10 free AI replies monthly</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Human-like responses</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose Our AI Reply Generator?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Advanced artificial intelligence meets human authenticity to create the perfect reply generation tool
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-purple-600" />
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

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How Our AI Reply Generator Works
              </h2>
              <p className="text-xl text-gray-600">
                Advanced AI technology in 4 simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Input Analysis
                    </h3>
                    <p className="text-gray-600">
                      Our AI analyzes the original post, context, and your intended response style to understand the conversation
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Reply Classification
                    </h3>
                    <p className="text-gray-600">
                      AI determines the optimal reply type - agreement, disagreement, humor, question, or supportive response
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Personalized Generation
                    </h3>
                    <p className="text-gray-600">
                      Creates authentic replies using your writing style with Write Like Me™ technology for genuine responses
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Human-Like Output
                    </h3>
                    <p className="text-gray-600">
                      Delivers natural, engaging replies that bypass AI detection and sound authentically human
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <Image
                  src="/main-interface12880x800.png"
                  alt="AI Reply Generator Interface"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Perfect for Every AI Reply Need
              </h2>
              <p className="text-xl text-gray-600">
                Our AI reply generator works across all platforms and use cases
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {useCases.map((useCase, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{useCase}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Start Generating Better AI Replies Today
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands who trust our AI reply generator for authentic, engaging responses. 
              Get 10 free AI-generated replies to start - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/twitter-reply-generator">
                <Button size="lg" variant="outline">
                  Try Twitter Reply Generator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}