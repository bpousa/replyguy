import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { MarketingWrapper } from '@/app/components/marketing-wrapper';
import { ArrowRight, CheckCircle, Chrome, Download, Zap, Shield, Users, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chrome Extension for Twitter Replies | ReplyGuy AI Extension',
  description: 'Install ReplyGuy Chrome extension for instant AI-powered Twitter replies. Generate authentic responses directly in X/Twitter without leaving your browser. Free to install and use.',
  keywords: 'Chrome extension Twitter, Twitter Chrome extension, X Chrome extension, AI Twitter extension, Twitter reply extension, Chrome extension replies, browser extension Twitter, Twitter automation extension, AI reply extension',
  openGraph: {
    title: 'Chrome Extension for Twitter Replies | ReplyGuy AI Extension',
    description: 'Install ReplyGuy Chrome extension for instant AI-powered Twitter replies. Generate authentic responses directly in X/Twitter. Free to install.',
    url: 'https://replyguy.com/chrome-extension',
    images: [
      {
        url: '/feature-showcase640x400.png',
        width: 640,
        height: 400,
        alt: 'ReplyGuy Chrome Extension for Twitter - Generate replies directly in browser',
      },
    ],
  },
  alternates: {
    canonical: 'https://replyguy.com/chrome-extension',
  },
};

export default function ChromeExtensionPage() {
  const extensionFeatures = [
    {
      icon: Zap,
      title: 'One-Click Generation',
      description: 'Generate perfect replies with a single click directly in Twitter/X'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data stays private with secure API connections and no data storage'
    },
    {
      icon: Users,
      title: 'Matches Your Voice',
      description: 'Write Like Me™ technology ensures replies sound authentically like you'
    },
    {
      icon: Chrome,
      title: 'Native Integration',
      description: 'Seamlessly integrates with Twitter/X interface - no disruption to your workflow'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Install Extension',
      description: 'Add ReplyGuy to Chrome from the Web Store in under 30 seconds'
    },
    {
      step: 2,
      title: 'Browse Twitter/X',
      description: 'Navigate to any tweet you want to reply to as you normally would'
    },
    {
      step: 3,
      title: 'Click ReplyGuy',
      description: 'See the ReplyGuy button appear next to the reply button'
    },
    {
      step: 4,
      title: 'Generate & Post',
      description: 'AI generates an authentic reply that you can edit and post instantly'
    }
  ];

  const reviews = [
    {
      name: 'Sarah M.',
      role: 'Social Media Manager',
      rating: 5,
      comment: 'This Chrome extension has transformed how I manage Twitter engagement. Saves me hours every day!'
    },
    {
      name: 'Mike R.',
      role: 'Content Creator',
      rating: 5,
      comment: 'The replies sound exactly like me. My audience can\'t tell they\'re AI-generated. Incredible technology!'
    },
    {
      name: 'Jessica L.',
      role: 'Marketing Director',
      rating: 5,
      comment: 'Easy to install and use. The Chrome extension works flawlessly with our team\'s Twitter strategy.'
    }
  ];

  return (
    <MarketingWrapper>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-8 flex justify-center items-center gap-4">
              <Image
                src="/reply_guy_logo.png"
                alt="ReplyGuy Chrome Extension"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
              <Chrome className="w-16 h-16 text-blue-600" />
            </div>
            
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Download className="w-4 h-4" />
              Free Chrome Extension
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Generate Twitter Replies <span className="gradient-text">Directly in Your Browser</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Install the ReplyGuy Chrome extension and generate authentic, AI-powered Twitter replies 
              without ever leaving X/Twitter. No copying, no pasting - just seamless reply generation 
              that sounds exactly like you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
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
                  Install Chrome Extension
                </a>
              </Button>
              <Link href="/auth/signup">
                <Button size="lg" variant="outline" className="gap-2">
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>100% free to install</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Works in Twitter/X</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>10 free replies monthly</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Extension Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose ReplyGuy Chrome Extension?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                The most advanced Twitter reply extension with AI technology that sounds human
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {extensionFeatures.map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <feature.icon className="w-8 h-8 text-blue-600" />
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
                How the Chrome Extension Works
              </h2>
              <p className="text-xl text-gray-600">
                Get started in under 2 minutes with these simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 mx-auto">
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

            <div className="text-center mt-12">
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
                  Install Extension Now
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot/Demo Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  See It in Action
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Watch how seamlessly ReplyGuy integrates with Twitter/X. The extension appears 
                  right where you need it, generating perfect replies that match your voice and style.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Appears automatically on every tweet</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Generates contextual responses instantly</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Edit and customize before posting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Works with all tweet types and threads</span>
                  </div>
                </div>

                <div className="flex gap-4">
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
                      Try It Now
                    </a>
                  </Button>
                  <Link href="/how-it-works">
                    <Button size="lg" variant="outline">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/feature-showcase640x400.png"
                  alt="ReplyGuy Chrome Extension Interface"
                  width={640}
                  height={400}
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Reviews */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Loved by Chrome Extension Users
              </h2>
              <p className="text-xl text-gray-600">
                See what users are saying about the ReplyGuy Chrome extension
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {reviews.map((review, index) => (
                <Card key={index} className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4 italic">
                      &quot;{review.comment}&quot;
                    </p>
                    <div>
                      <p className="font-semibold text-gray-900">{review.name}</p>
                      <p className="text-sm text-gray-600">{review.role}</p>
                    </div>
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
              Install ReplyGuy Chrome Extension Today
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of users who generate better Twitter replies directly in their browser. 
              Free to install with 10 free replies monthly - no credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                  Install Chrome Extension
                </a>
              </Button>
              <Link href="/auth/signup">
                <Button size="lg" variant="outline" className="gap-2">
                  Create Account First
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingWrapper>
  );
}