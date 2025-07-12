import { Button } from '@/app/components/ui/button';
import { Chrome, Zap, Shield, RefreshCw, CheckCircle, ArrowRight, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { MarketingWrapper } from '../components/marketing-wrapper';

export default function ExtensionPage() {
  return (
    <MarketingWrapper>
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Chrome className="w-4 h-4" />
            ReplyGuy Chrome Extension
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Reply Without Leaving X
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Generate perfect replies directly from your Twitter/X timeline. 
            No tab switching, no copy-pasting. Just click and reply with AI-powered assistance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700 text-lg px-8"
              asChild
            >
              <a 
                href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje?authuser=3&hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Chrome className="w-5 h-5" />
                Add to Chrome - Free
              </a>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8"
              asChild
            >
              <a 
                href="https://www.youtube.com/watch?v=EYFCIBYObcE"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Watch Demo Video
              </a>
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            Works with Chrome, Edge, and other Chromium-based browsers
          </p>
        </div>

        {/* Main Demo Image */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/main-interface12880x800.png"
              alt="ReplyGuy Chrome Extension in action"
              width={1280}
              height={800}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Everything You Love About ReplyGuy, Right in X
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">One-Click Replies</h3>
              <p className="text-gray-600">
                Click the ReplyGuy button on any tweet to instantly generate multiple reply options.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Your Data, Your Control</h3>
              <p className="text-gray-600">
                Extension only activates when you click. No tracking, no data collection without consent.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Seamless Sync</h3>
              <p className="text-gray-600">
                All your Write Like Me™ profiles and settings sync automatically with your account.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Install the Extension</h3>
                  <p className="text-gray-600">
                    Add ReplyGuy to Chrome with one click. Sign in with your existing account or create a new one.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Click ReplyGuy on Any Tweet</h3>
                  <p className="text-gray-600">
                    A small ReplyGuy button appears on every tweet. Click it to open the reply generator.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Choose Your Perfect Reply</h3>
                  <p className="text-gray-600">
                    Get multiple AI-generated options instantly. Pick one or customize it further.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Post and Engage</h3>
                  <p className="text-gray-600">
                    Click to insert the reply and post. Build your audience one great reply at a time.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-xl">
              <Image
                src="/generated-reply1280x800.png"
                alt="Reply generation in action"
                width={1280}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Screenshots Gallery */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Powerful Features at Your Fingertips
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/feature-showcase640x400.png"
                  alt="Extension features showcase"
                  width={640}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold">Smart Reply Types</h3>
              <p className="text-gray-600">
                Choose from over 50 reply types. The AI understands context and suggests the best options.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/advanced-options640x400.png"
                  alt="Advanced options and settings"
                  width={640}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold">Advanced Customization</h3>
              <p className="text-gray-600">
                Fine-tune tone, length, and style. Add your own context for even better replies.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="bg-purple-50 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-center mb-8">
              Why Users Love the Extension
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">10x Faster Workflow</h4>
                  <p className="text-sm text-gray-600">No more switching tabs or copy-pasting</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Same Powerful AI</h4>
                  <p className="text-sm text-gray-600">All ReplyGuy features, right in X</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Perfect Integration</h4>
                  <p className="text-sm text-gray-600">Feels like a native X feature</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Always Up-to-Date</h4>
                  <p className="text-sm text-gray-600">Auto-updates with new features</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Embed */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-8">
            See It in Action
          </h2>
          <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/EYFCIBYObcE"
              title="ReplyGuy Chrome Extension Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Reply Smarter?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of X users who are growing their audience with ReplyGuy.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700 text-lg px-8"
              asChild
            >
              <a 
                href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje?authuser=3&hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Chrome className="w-5 h-5" />
                Add to Chrome Now
              </a>
            </Button>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Free plan includes 10 replies per month. No credit card required.
          </p>
        </div>
      </div>
    </MarketingWrapper>
  );
}