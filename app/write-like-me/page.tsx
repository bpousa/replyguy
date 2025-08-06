import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { ArrowRight, CheckCircle, Brain, Users, Zap, Shield, Target, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Write Like Me™ - AI That Matches Your Writing Style | ReplyGuy',
  description: 'Write Like Me™ technology analyzes your writing style to generate Twitter replies that sound authentically like you. Maintain your unique voice while scaling engagement with AI.',
  keywords: 'Write Like Me, AI writing style, personalized AI replies, authentic AI writing, AI voice matching, Twitter personality, AI writing assistant, personalized Twitter replies, voice cloning AI, writing style analysis',
  openGraph: {
    title: 'Write Like Me™ - AI That Matches Your Writing Style',
    description: 'Revolutionary AI technology that analyzes your writing style to generate replies that sound authentically like you. Maintain your voice while scaling engagement.',
    url: 'https://replyguy.com/write-like-me',
    images: [
      {
        url: '/generated-reply1280x800.png',
        width: 1280,
        height: 800,
        alt: 'Write Like Me AI Technology - Generate replies in your unique voice',
      },
    ],
  },
  alternates: {
    canonical: 'https://replyguy.com/write-like-me',
  },
};

export default function WriteLikeMePage() {
  const features = [
    {
      icon: Brain,
      title: 'Advanced Style Analysis',
      description: 'AI analyzes your tweet history to understand your unique voice, tone, and personality'
    },
    {
      icon: Users,
      title: 'Authentic Voice Matching',
      description: 'Generates replies that sound exactly like you wrote them, maintaining consistency'
    },
    {
      icon: Zap,
      title: 'Instant Personalization',
      description: 'Once trained, every reply perfectly matches your style without additional setup'
    },
    {
      icon: Shield,
      title: 'Privacy Protected',
      description: 'Your writing data is analyzed securely and never shared or stored permanently'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Connect Your Twitter',
      description: 'Securely connect your Twitter/X account to analyze your existing tweets'
    },
    {
      step: 2,
      title: 'AI Analyzes Your Style',
      description: 'Our AI studies your writing patterns, tone, vocabulary, and personality markers'
    },
    {
      step: 3,
      title: 'Create Your Voice Profile',
      description: 'Write Like Me™ builds a unique profile that captures your authentic voice'
    },
    {
      step: 4,
      title: 'Generate Personalized Replies',
      description: 'Every AI-generated reply sounds exactly like you wrote it personally'
    }
  ];

  const beforeAfter = [
    {
      scenario: 'Responding to a tech announcement',
      generic: 'This looks interesting! Can\'t wait to try it out and see how it performs.',
      writeLikeMe: 'Whoa, this is exactly what I\'ve been waiting for! The UI looks clean and I\'m definitely gonna test this with my team tomorrow. 🚀'
    },
    {
      scenario: 'Agreeing with a business insight',
      generic: 'Great point! This is very important for businesses to consider.',
      writeLikeMe: 'EXACTLY! This is what I\'ve been telling clients for months. The companies that get this early will have such an advantage.'
    },
    {
      scenario: 'Asking a follow-up question',
      generic: 'Interesting perspective. How do you think this will impact the industry?',
      writeLikeMe: 'Love this take! Quick question - do you think this disrupts the traditional players or just creates a new category altogether?'
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
                alt="Write Like Me AI Technology"
                width={80}
                height={80}
                className="mx-auto object-contain"
                priority
              />
            </div>
            
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              Exclusive Write Like Me™ Technology
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              AI That <span className="gradient-text">Writes Like You</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionary Write Like Me™ technology analyzes your unique writing style to generate 
              Twitter replies that sound authentically like you. Maintain your voice and personality 
              while scaling your engagement with AI that truly understands how you communicate.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try Write Like Me™ Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  See How It Works
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Analyzes your unique voice</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Maintains authenticity</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Private and secure</span>
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
                The Science Behind Write Like Me™
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Advanced AI technology that understands and replicates your unique communication style
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <feature.icon className="w-8 h-8 text-purple-600" />
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

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How Write Like Me™ Works
              </h2>
              <p className="text-xl text-gray-600">
                Four simple steps to get AI that writes exactly like you
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {howItWorks.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 mx-auto">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Image
                src="/generated-reply1280x800.png"
                alt="Write Like Me Technology Process"
                width={800}
                height={500}
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Examples */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Generic AI vs Write Like Me™
              </h2>
              <p className="text-xl text-gray-600">
                See the difference when AI truly understands your voice
              </p>
            </div>

            <div className="space-y-8">
              {beforeAfter.map((example, index) => (
                <Card key={index} className="shadow-lg">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                      {example.scenario}
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="p-6 bg-red-50 rounded-lg border-l-4 border-red-400">
                        <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Generic AI Reply
                        </h4>
                        <p className="text-gray-700 italic">&quot;{example.generic}&quot;</p>
                        <p className="text-sm text-red-600 mt-2">Sounds robotic and impersonal</p>
                      </div>
                      
                      <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-400">
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Write Like Me™ Reply
                        </h4>
                        <p className="text-gray-700 italic">&quot;{example.writeLikeMe}&quot;</p>
                        <p className="text-sm text-green-600 mt-2">Authentic, personal, and engaging</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Why Your Voice Matters
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Your unique voice is what builds relationships, trust, and engagement on social media. 
                  Write Like Me™ ensures that even AI-generated replies maintain the authenticity that 
                  makes your audience connect with you.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Maintain Brand Consistency</h4>
                      <p className="text-gray-600">Every reply reflects your personal or brand voice perfectly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Build Authentic Relationships</h4>
                      <p className="text-gray-600">Followers can&apos;t tell the difference - it&apos;s genuinely you</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Scale Without Losing Yourself</h4>
                      <p className="text-gray-600">Engage more without compromising your unique personality</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Continuous Learning</h4>
                      <p className="text-gray-600">AI improves over time, getting better at matching your style</p>
                    </div>
                  </div>
                </div>

                <Link href="/auth/signup">
                  <Button size="lg" className="gap-2">
                    Experience Write Like Me™
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <Image
                    src="/feature-showcase640x400.png"
                    alt="Write Like Me Voice Analysis"
                    width={500}
                    height={400}
                    className="rounded-lg shadow-xl"
                  />
                  <div className="absolute -top-4 -right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Your Voice
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Start Writing Like You With AI
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Experience the only AI reply generator that truly captures your unique voice. 
              Try Write Like Me™ technology free - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try Write Like Me™ Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/twitter-reply-generator">
                <Button size="lg" variant="outline">
                  See Reply Examples
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}