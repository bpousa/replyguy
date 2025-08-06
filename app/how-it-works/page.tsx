import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { ArrowRight, CheckCircle, Brain, MessageCircle, Search, Zap, Users, Chrome, Target, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works - AI Twitter Reply Generator Process | ReplyGuy',
  description: 'Learn how ReplyGuy AI generates authentic Twitter replies. Our 4-step process uses advanced AI to analyze, classify, research, and create human-like responses that boost engagement.',
  keywords: 'how AI reply generator works, Twitter AI process, AI reply technology, automated Twitter responses, AI writing process, Twitter reply automation, AI content generation, social media automation',
  openGraph: {
    title: 'How It Works - AI Twitter Reply Generator Process',
    description: 'Discover the advanced AI technology behind ReplyGuy. Learn our 4-step process for generating authentic, human-like Twitter replies.',
    url: 'https://replyguy.appendment.com/how-it-works',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'How ReplyGuy AI Reply Generator Works - Step by step process',
      },
    ],
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/how-it-works',
  },
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: 1,
      title: 'Input Analysis',
      icon: Brain,
      description: 'AI analyzes the original tweet, context, and your response preferences',
      details: [
        'Reads and understands the original tweet content',
        'Analyzes conversation context and thread history',
        'Considers your intended response tone and style',
        'Identifies key topics and sentiment'
      ]
    },
    {
      number: 2,
      title: 'Reply Classification',
      icon: Target,
      description: 'GPT-3.5 determines the most effective reply type for maximum engagement',
      details: [
        'Classifies optimal response strategy (agree, question, add value, etc.)',
        'Selects from 50+ proven reply patterns',
        'Considers audience and conversation dynamics',
        'Optimizes for engagement and authenticity'
      ]
    },
    {
      number: 3,
      title: 'Research & Context',
      icon: Search,
      description: 'Optional real-time fact-checking and additional context gathering',
      details: [
        'Uses Perplexity API for real-time information',
        'Verifies facts and current information',
        'Gathers additional context when needed',
        'Ensures accuracy and relevance'
      ]
    },
    {
      number: 4,
      title: 'Human-Like Generation',
      icon: MessageCircle,
      description: 'Claude AI creates the final reply using Write Like Me™ personalization',
      details: [
        'Generates response in your unique voice and style',
        'Applies anti-AI detection techniques',
        'Ensures natural, conversational tone',
        'Creates engaging, authentic replies'
      ]
    }
  ];

  const aiModels = [
    {
      name: 'GPT-3.5 Turbo',
      purpose: 'Reply Classification',
      icon: Target,
      description: 'Fast, cost-effective classification of the best reply type for each situation'
    },
    {
      name: 'Perplexity API',
      purpose: 'Real-time Research',
      icon: Search,
      description: 'Optional fact-checking and current information gathering for accurate responses'
    },
    {
      name: 'Claude 3.5 Sonnet',
      purpose: 'Strategic Reasoning',
      icon: Brain,
      description: 'Advanced reasoning to select the optimal reply strategy and approach'
    },
    {
      name: 'Claude 3 Opus',
      purpose: 'Final Generation',
      icon: MessageCircle,
      description: 'Premium AI model for creating the most human-like, engaging final replies'
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Generate perfect replies in under 10 seconds'
    },
    {
      icon: Users,
      title: 'Authentically You',
      description: 'Write Like Me™ ensures replies sound like you wrote them'
    },
    {
      icon: Shield,
      title: 'Undetectable',
      description: 'Advanced anti-AI detection bypasses all detection tools'
    },
    {
      icon: Chrome,
      title: 'Seamless Integration',
      description: 'Works directly in Twitter/X with our Chrome extension'
    }
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
                alt="How ReplyGuy Works"
                width={80}
                height={80}
                className="mx-auto object-contain"
                priority
              />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              How <span className="gradient-text">ReplyGuy</span> Creates Perfect Replies
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Discover the advanced AI technology behind ReplyGuy&apos;s human-like Twitter replies. 
              Our 4-step process combines multiple AI models to create authentic responses that 
              boost engagement and sound exactly like you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try It Now - Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/ai-reply-generator">
                <Button size="lg" variant="outline">
                  See Examples
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>4 advanced AI models</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Under 10 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Human-like results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Process */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our 4-Step AI Process
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Each step is carefully designed to create the most authentic, engaging replies possible
              </p>
            </div>

            <div className="space-y-12">
              {steps.map((step, index) => (
                <div key={index} className={`flex flex-col lg:flex-row gap-8 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                        {step.number}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {step.title}
                      </h3>
                    </div>
                    
                    <p className="text-xl text-gray-600 mb-6">
                      {step.description}
                    </p>
                    
                    <div className="space-y-3">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <span className="text-gray-700">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex justify-center">
                    <div className="w-32 h-32 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                      <step.icon className="w-16 h-16 text-purple-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Models Used */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Powered by the Best AI Models
              </h2>
              <p className="text-xl text-gray-600">
                We use different AI models for different tasks to optimize quality and cost
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {aiModels.map((model, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <model.icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {model.name}
                        </h3>
                        <p className="text-sm text-purple-600 font-medium">
                          {model.purpose}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {model.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Demonstration */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  See It in Action
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Watch how our AI processes a real tweet and generates an authentic reply 
                  that matches your voice and maximizes engagement.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Input: Original tweet + your preferences</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Processing: AI analysis and classification</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Output: Perfect reply in your voice</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Link href="/auth/signup">
                    <Button size="lg" className="gap-2">
                      Try It Yourself
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
                      Install Extension
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/main-interface12880x800.png"
                  alt="ReplyGuy AI Process Demonstration"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Our Process Works Better
              </h2>
              <p className="text-xl text-gray-600">
                Multi-model approach ensures the highest quality, most authentic replies
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <benefit.icon className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
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
              Ready to Experience the Technology?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              See how our advanced AI process creates perfect Twitter replies for you. 
              Get 10 free replies to start - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Generating Replies
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/write-like-me">
                <Button size="lg" variant="outline">
                  Learn About Write Like Me™
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}