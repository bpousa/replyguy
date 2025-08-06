import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, CheckCircle, Chrome } from 'lucide-react';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/reply_guy_logo.png"
              alt="ReplyGuy Logo"
              width={80}
              height={80}
              className="mx-auto object-contain"
              priority
            />
          </div>
          
          {/* Badge */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
              AI-Powered Reply Generation
            </div>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <Chrome className="w-4 h-4" />
              Now with Chrome Extension
            </div>
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            AI Twitter Reply Generator That <span className="gradient-text">Writes Like You</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Generate authentic, human-like replies to X (Twitter) posts in seconds with our AI reply generator. 
            Build your audience, increase engagement, and save hours daily with replies that sound genuinely like you. 
            Chrome extension included for seamless Twitter integration!
          </p>

          {/* Extended Value Proposition */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why ReplyGuy is Different</h2>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">🎯 Write Like Me™ Technology</h3>
                  <p className="text-gray-600 text-sm">
                    Our proprietary AI learns your unique writing style, tone, and voice to generate replies that authentically represent you. 
                    No more generic, robotic responses - just authentic engagement that builds real connections.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">🛡️ Anti-AI Detection</h3>
                  <p className="text-gray-600 text-sm">
                    Advanced algorithms ensure your AI-generated replies pass human detection. We use sophisticated techniques 
                    to maintain natural language patterns and avoid common AI tells that could damage your credibility.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">⚡ Real-Time Fact Checking</h3>
                  <p className="text-gray-600 text-sm">
                    Optional Perplexity AI integration provides real-time fact-finding for complex topics, ensuring your replies are 
                    not just authentic but also accurate and informed when discussing current events or technical subjects.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">🔧 Chrome Extension Integration</h3>
                  <p className="text-gray-600 text-sm">
                    Generate replies directly within X (Twitter) without switching tabs. Our Chrome extension seamlessly integrates 
                    with your existing workflow, making engagement effortless and efficient.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Problem/Solution Section */}
          <div className="max-w-4xl mx-auto mb-12 text-left">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <h3 className="text-lg font-bold text-red-800 mb-3">❌ The Twitter Engagement Problem</h3>
                <ul className="space-y-2 text-red-700 text-sm">
                  <li>• Spend hours crafting individual replies</li>
                  <li>• Generic responses that don&apos;t reflect your voice</li>
                  <li>• Miss opportunities due to time constraints</li>
                  <li>• Inconsistent engagement hurts growth</li>
                  <li>• Writer&apos;s block prevents meaningful participation</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <h3 className="text-lg font-bold text-green-800 mb-3">✅ The ReplyGuy Solution</h3>
                <ul className="space-y-2 text-green-700 text-sm">
                  <li>• Generate 10+ replies in seconds</li>
                  <li>• Maintain your authentic voice and tone</li>
                  <li>• Never miss engagement opportunities</li>
                  <li>• Consistent, quality interactions daily</li>
                  <li>• AI-powered creativity and context awareness</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Start Free Trial
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
                href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje?authuser=3&hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Chrome className="w-4 h-4" />
                Add to Chrome
              </a>
            </Button>
            <Link href="#features">
              <Button size="lg" variant="ghost">
                See How It Works
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>10 free replies per month</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}