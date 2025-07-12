import { 
  Brain, 
  Zap, 
  TrendingUp, 
  MessageSquare,
  Target,
  Clock,
  User,
  Search,
  Chrome
} from 'lucide-react';

const features = [
  {
    name: 'Write Like Me™',
    description: 'Train AI on your tweets to generate replies in your unique voice and style.',
    icon: User,
    badge: 'NEW',
  },
  {
    name: 'Chrome Extension',
    description: 'Generate replies directly from X with our Chrome extension. No tab switching needed.',
    icon: Chrome,
    badge: 'NEW',
  },
  {
    name: 'Human-Like Responses',
    description: 'Our AI is trained to avoid AI-isms and create replies that sound genuinely human.',
    icon: Brain,
  },
  {
    name: 'Real-Time Research',
    description: 'Optional fact-checking with Perplexity to add credible data to your replies.',
    icon: Search,
  },
  {
    name: 'Context-Aware',
    description: 'Understands tweet context and chooses from 50+ reply types for perfect responses.',
    icon: MessageSquare,
  },
  {
    name: 'Instant Generation',
    description: 'Generate multiple reply options in seconds, not minutes.',
    icon: Zap,
  },
  {
    name: 'Daily Goals',
    description: 'Track your reply goals and celebrate your consistency with fun animations.',
    icon: Target,
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Win on X
          </h2>
          <p className="text-lg text-gray-600">
            ReplyGuy combines advanced AI with smart features to help you engage 
            authentically and grow your presence.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div 
              key={feature.name} 
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}