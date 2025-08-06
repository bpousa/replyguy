import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { ArrowRight, CheckCircle, Twitter, Chrome, Users, TrendingUp, MessageCircle, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Twitter Reply Generator - AI-Powered Tweet Responses | ReplyGuy',
  description: 'Generate engaging Twitter replies instantly with AI. Our Twitter reply generator creates authentic responses that boost engagement and grow your following. Free Chrome extension included.',
  keywords: 'Twitter reply generator, tweet reply generator, Twitter AI replies, automated Twitter responses, Twitter engagement tool, tweet response generator, Twitter reply bot, AI Twitter replies, Twitter marketing tool, Twitter growth',
  openGraph: {
    title: 'Twitter Reply Generator - AI-Powered Tweet Responses',
    description: 'Generate engaging Twitter replies instantly with AI. Boost engagement and grow your following with authentic tweet responses. Chrome extension included.',
    url: 'https://replyguy.appendment.com/twitter-reply-generator',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'Twitter Reply Generator Interface - Generate engaging tweet responses',
      },
    ],
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/twitter-reply-generator',
  },
};

export default function TwitterReplyGeneratorPage() {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Increase Engagement',
      description: 'Generate replies that get more likes, retweets, and followers on Twitter'
    },
    {
      icon: MessageCircle,
      title: 'Save Time',
      description: 'Create perfect Twitter replies in seconds instead of spending minutes thinking'
    },
    {
      icon: Users,
      title: 'Build Audience',
      description: 'Consistent, engaging replies help grow your Twitter following organically'
    },
    {
      icon: Heart,
      title: 'Authentic Voice',
      description: 'Replies sound genuinely like you with Write Like Me™ personalization'
    }
  ];

  const twitterStrategies = [
    {
      type: 'Agreeable Replies',
      description: 'Support and amplify popular opinions to build connections',
      example: 'Absolutely agree! This is exactly what the industry needs right now. Thanks for sharing this insight!'
    },
    {
      type: 'Thoughtful Questions',
      description: 'Ask engaging questions that spark meaningful conversations',
      example: 'This is fascinating! Have you noticed any specific patterns in how this affects different age groups?'
    },
    {
      type: 'Value-Add Responses',
      description: 'Share relevant experiences and additional insights',
      example: 'Great point! We\'ve seen similar results in our work. One thing that helped us was focusing on X...'
    },
    {
      type: 'Supportive Encouragement',
      description: 'Offer genuine support and motivation to other users',
      example: 'You\'re doing amazing work! Keep pushing forward - the community needs voices like yours.'
    }
  ];

  return (
    <MarketingWrapper>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="flex items-center gap-4">
                <Image
                  src="/reply_guy_logo.png"
                  alt="Twitter Reply Generator"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
                <Twitter className="w-12 h-12 text-blue-500" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Twitter Reply Generator</span> That Grows Your Following
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Generate engaging Twitter replies that sound authentically human and boost your engagement. 
              Our AI-powered Twitter reply generator helps you craft the perfect responses to grow your audience and increase interactions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Generate Twitter Replies Free
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
                  Add Twitter Extension
                </a>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>10 free Twitter replies monthly</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Works directly in Twitter</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>No credit card required</span>
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
                Why Use Our Twitter Reply Generator?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Transform your Twitter engagement with AI-powered replies that sound authentically human
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <benefit.icon className="w-8 h-8 text-blue-600" />
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

      {/* Twitter Strategy Examples */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Master Twitter Reply Strategies
              </h2>
              <p className="text-xl text-gray-600">
                Our Twitter reply generator creates different types of engaging responses
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {twitterStrategies.map((strategy, index) => (
                <Card key={index} className="shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {strategy.type}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {strategy.description}
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-700 italic">
                        &quot;{strategy.example}&quot;
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chrome Extension Feature */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Generate Twitter Replies Directly in Your Browser
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Our Chrome extension integrates seamlessly with Twitter, allowing you to generate 
                  perfect replies without leaving the platform. No copying and pasting required!
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">One-click reply generation in Twitter</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Matches your personal writing style</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Works with both tweets and replies</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Free to install and use</span>
                  </div>
                </div>

                <Button 
                  size="lg"
                  className="gap-2"
                  asChild
                >
                  <a 
                    href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Chrome className="w-5 h-5" />
                    Install Twitter Reply Extension
                  </a>
                </Button>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/feature-showcase640x400.png"
                  alt="Twitter Reply Generator Chrome Extension"
                  width={640}
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
              Start Growing Your Twitter Following Today
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join the thousands of Twitter users who generate more engaging replies with our AI-powered tool. 
              Get 10 free Twitter replies to start - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Generating Twitter Replies
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/x-reply-generator">
                <Button size="lg" variant="outline">
                  Try X Reply Generator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}