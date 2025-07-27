import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Chrome, Zap, Shield, RefreshCw } from 'lucide-react';

export function ChromeExtension() {
  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              <Chrome className="w-4 h-4" />
              <span>Chrome Extension Available</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Reply Without Leaving X
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your AI copilot for Twitter/X. Generate perfect replies directly from your timeline—no tab switching, 
              no copy-pasting. Just click and reply.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div className="order-2 lg:order-1">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Lightning Fast Workflow</h3>
                    <p className="text-gray-600">
                      From tweet to reply in one click. The extension seamlessly integrates into X, 
                      making engagement 100x faster than ever before.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                    <p className="text-gray-600">
                      Your data stays yours. The extension only processes tweets you choose to reply to, 
                      with enterprise-grade security.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Syncs with Your Account</h3>
                    <p className="text-gray-600">
                      All your Write Like Me™ profiles and settings sync automatically. 
                      Use the same powerful AI features right where you tweet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-purple-600 hover:bg-purple-700"
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
                  asChild
                >
                  <a 
                    href="https://www.youtube.com/watch?v=dfyVo62Ji-M"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch Demo Video
                  </a>
                </Button>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <Image
                  src="/main-interface12880x800.png"
                  alt="ReplyGuy Chrome Extension Interface"
                  width={1280}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/generated-reply1280x800.png"
                alt="Generated Reply Example"
                width={1280}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-6">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/feature-showcase640x400.png"
                  alt="Extension Features"
                  width={640}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
                <h3 className="text-2xl font-bold mb-3">Join Other Happy Users</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <p className="text-sm">Average 3x engagement boost</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <p className="text-sm">Save 2+ hours daily</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <p className="text-sm">Powerful Chrome extension makes it easy </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-4 bg-white text-purple-700 hover:bg-gray-100"
                  asChild
                >
                  <a 
                    href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje?authuser=3&hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Install Now →
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}