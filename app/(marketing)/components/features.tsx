import Link from 'next/link';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  MessageSquare,
  Target,
  Clock,
  User,
  Search,
  Chrome,
  Image as ImageIcon,
  GitBranch
} from 'lucide-react';

const features = [
  {
    name: 'Write Like Me™',
    description: 'Train AI on your tweets to generate replies in your unique voice and style.',
    icon: User,
    badge: 'NEW',
    link: '/write-like-me',
  },
  {
    name: 'Chrome Extension',
    description: 'Generate replies directly from X with our Chrome extension. No tab switching needed.',
    icon: Chrome,
    badge: 'NEW',
    link: '/chrome-extension',
  },
  {
    name: 'Human-Like Responses',
    description: 'Our AI is trained to avoid AI-isms and create replies that sound genuinely human.',
    icon: Brain,
    link: '/ai-reply-generator',
  },
  {
    name: 'Real-Time Research',
    description: 'Optional fact-checking with Perplexity to add credible data to your replies.',
    icon: Search,
    link: '/how-it-works',
  },
  {
    name: 'Context-Aware',
    description: 'Understands tweet context and chooses from 50+ reply types for perfect responses.',
    icon: MessageSquare,
    link: '/twitter-reply-generator',
  },
  {
    name: 'Instant Generation',
    description: 'Generate a natural sounding reply options in seconds, not minutes.',
    icon: Zap,
    link: '/ai-reply-generator',
  },
  {
    name: 'Daily Goals',
    description: 'Track your reply goals and celebrate your consistency with fun animations.',
    icon: Target,
  },
  {
    name: 'Meme Generation',
    description: 'Create viral memes instantly with AI. Boost engagement by 2x with perfectly-timed visual humor.',
    icon: ImageIcon,
  },
  {
    name: 'Match Tweet Style',
    description: 'Instantly adapt to the original tweets style and tone. Increase getting a reply from the post creator.',
    icon: GitBranch,
    link: '/x-reply-generator',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Everything You Need to Win on X (Twitter)
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            ReplyGuy combines advanced AI with smart features to help you engage 
            authentically and grow your presence. Our comprehensive suite of tools 
            transforms your Twitter engagement strategy from time-consuming to effortless.
          </p>
          
          {/* Detailed Introduction */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-left max-w-5xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">The Complete Twitter Engagement Platform</h3>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>ReplyGuy isn&apos;t just another AI writing tool</strong> - it&apos;s a comprehensive engagement platform designed specifically for Twitter (X) success. 
                While other tools generate generic responses, ReplyGuy focuses on authentic human-like interactions that build real relationships and grow your audience organically.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our AI technology analyzes tweet context, understands conversational nuance, and generates replies that match your unique voice and personality. 
                Whether you&apos;re a content creator, business owner, or social media manager, ReplyGuy helps you maintain consistent, quality engagement 
                without the time investment traditional methods require.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">10x</div>
                  <div className="text-sm text-gray-600">Faster Reply Generation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">50+</div>
                  <div className="text-sm text-gray-600">Reply Type Options</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">99%</div>
                  <div className="text-sm text-gray-600">Human-Like Authenticity</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const FeatureCard = (
              <div 
                className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative ${feature.link ? 'cursor-pointer hover:border-purple-200 border border-transparent' : ''}`}
              >
                {feature.badge && (
                  <div className="absolute -top-2 -right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    {feature.badge}
                  </div>
                )}
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.name}</h3>
                <p className="text-gray-600">{feature.description}</p>
                {feature.link && (
                  <p className="text-purple-600 text-sm mt-2 font-medium">
                    Learn more →
                  </p>
                )}
              </div>
            );

            return feature.link ? (
              <Link key={feature.name} href={feature.link}>
                {FeatureCard}
              </Link>
            ) : (
              <div key={feature.name}>
                {FeatureCard}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}