import { Star, Chrome, Zap, Users, TrendingUp, Shield } from 'lucide-react';

export function LandingSocialProof() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Growing Creators
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join the community of creators using AI technology to grow their X presence authentically.
            </p>
          </div>

          {/* Real metrics grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Users Growing */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">3x</div>
              <p className="text-gray-600 text-sm">Faster Growth Rate</p>
              <p className="text-xs text-gray-500 mt-1">Users report increased engagement</p>
            </div>

            {/* Reply Enhancement Speed */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">Instant</div>
              <p className="text-gray-600 text-sm">Reply Enhancement</p>
              <p className="text-xs text-gray-500 mt-1">Transform thoughts to perfect replies</p>
            </div>

            {/* Reply Types Available */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
              <p className="text-gray-600 text-sm">Reply Types & Styles</p>
              <p className="text-xs text-gray-500 mt-1">From agreement to witty responses</p>
            </div>
          </div>

          {/* Technology credibility */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-12">
            <h3 className="text-2xl font-bold text-center mb-6">Powered by Leading AI Technology</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2">Claude Sonnet</h4>
                <p className="text-sm text-gray-600">Advanced reasoning for contextual reply selection</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold mb-2">OpenAI GPT</h4>
                <p className="text-sm text-gray-600">Smart categorization of reply opportunities</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Zap className="w-8 h-8 text-orange-600" />
                </div>
                <h4 className="font-semibold mb-2">Perplexity Search</h4>
                <p className="text-sm text-gray-600">Real-time fact-checking for accuracy</p>
              </div>
            </div>
          </div>

          {/* Feature highlights as social proof */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Why Creators Choose ReplyGuy</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="font-semibold mb-2">🎯 Write Like Me™ Technology</h4>
                <p className="text-sm text-white/90">
                  Our proprietary AI learns your unique writing style, ensuring every reply sounds authentically like you.
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="font-semibold mb-2">🛡️ Anti-AI Detection</h4>
                <p className="text-sm text-white/90">
                  Advanced algorithms ensure your replies pass human review and avoid generic AI patterns.
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="font-semibold mb-2">⚡ Instant Generation</h4>
                <p className="text-sm text-white/90">
                  Generate multiple reply options in seconds, not minutes. Perfect for real-time engagement.
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="font-semibold mb-2">🎨 Chrome Extension</h4>
                <p className="text-sm text-white/90">
                  Reply directly from X without switching tabs. Seamless workflow integration.
                </p>
              </div>
            </div>
          </div>

          {/* Usage stats */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Trusted by growing creators worldwide
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}