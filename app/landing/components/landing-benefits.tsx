import { User, Shield, Zap, MessageSquare, TrendingUp, Chrome } from 'lucide-react';

export function LandingBenefits() {
  const benefits = [
    {
      icon: User,
      title: 'Write Like Me™ Technology',
      description: 'Our proprietary AI analyzes your writing patterns, tone, and voice to generate replies that authentically represent you. No more generic, robotic responses.',
      highlight: 'Sounds exactly like you',
      color: 'purple'
    },
    {
      icon: Shield,
      title: 'Anti-AI Detection',
      description: 'Advanced algorithms ensure your AI-generated replies pass human review. We use sophisticated techniques to maintain natural language patterns.',
      highlight: 'Passes human review',
      color: 'green'
    },
    {
      icon: Zap,
      title: 'Instant Enhancement',
      description: 'Transform your thoughts into perfect replies instantly. Takes what you want to say and makes it better, or gives you ideas when you&apos;re stuck.',
      highlight: 'AI enhances your thoughts',
      color: 'blue'
    },
    {
      icon: MessageSquare,
      title: 'Context-Aware Responses',
      description: 'Understands tweet context, sentiment, and conversation flow. Chooses from 50+ reply types for perfectly appropriate responses.',
      highlight: '50+ reply types',
      color: 'orange'
    },
    {
      icon: TrendingUp,
      title: 'Grow Faster on X',
      description: 'Users report 3x higher engagement rates and faster follower growth. Build real connections that convert to loyal audience with AI assistance.',
      highlight: '3x faster growth',
      color: 'emerald'
    },
    {
      icon: Chrome,
      title: 'Chrome Extension Integration',
      description: 'Enhance and insert replies directly within X without switching tabs. One-click insertion makes engagement effortless.',
      highlight: 'One-click insertion',
      color: 'indigo'
    }
  ];

  const colorClasses: Record<string, string> = {
    purple: 'from-purple-100 to-purple-200 text-purple-700',
    green: 'from-green-100 to-green-200 text-green-700',
    blue: 'from-blue-100 to-blue-200 text-blue-700',
    orange: 'from-orange-100 to-orange-200 text-orange-700',
    emerald: 'from-emerald-100 to-emerald-200 text-emerald-700',
    indigo: 'from-indigo-100 to-indigo-200 text-indigo-700'
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Everything You Need to Win on X (Twitter)
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              ReplyGuy combines cutting-edge AI with smart features to help you engage authentically, 
              save time, and grow your presence. No more writer&apos;s block or missed opportunities.
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {benefits.map((benefit, index) => (
              <div 
                key={benefit.title}
                className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[benefit.color]} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <benefit.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <div className="inline-flex items-center bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-200 mb-3">
                      ✨ {benefit.highlight}
                    </div>
                    <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Problem vs Solution comparison */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-center mb-8">Stop Struggling with Twitter Engagement</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Problem */}
              <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <h4 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                  ❌ Without ReplyGuy
                </h4>
                <ul className="space-y-3 text-red-700 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Spend hours crafting individual replies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Generic responses that don&apos;t reflect your voice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Miss trending opportunities due to time constraints</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Inconsistent engagement hurts growth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Writer&apos;s block prevents meaningful participation</span>
                  </li>
                </ul>
              </div>

              {/* Solution */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                  ✅ With ReplyGuy
                </h4>
                <ul className="space-y-3 text-green-700 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Transform your thoughts into perfect replies instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Maintain your authentic voice and personality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Never miss engagement opportunities again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Consistent, quality interactions drive growth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>AI-powered creativity eliminates writer&apos;s block</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom CTA teaser */}
          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-4">
              Ready to transform your X engagement strategy?
            </p>
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              Join creators growing 3x faster with AI
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}