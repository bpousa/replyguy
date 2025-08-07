import { ArrowRight, LogIn, Brain, MessageSquare } from 'lucide-react';

export function LandingHowItWorks() {
  const steps = [
    {
      number: '01',
      icon: LogIn,
      title: 'Connect Your X Account',
      description: 'Sign up with your X (Twitter) account in seconds. Our secure OAuth integration means no passwords needed.',
      details: ['One-click X authentication', 'Secure OAuth integration', 'No passwords required'],
      color: 'from-purple-500 to-purple-600'
    },
    {
      number: '02',
      icon: Brain,
      title: 'AI Learns Your Voice',
      description: 'Our Write Like Me™ technology analyzes your existing tweets to understand your unique writing style and personality.',
      details: ['Analyzes your tweet history', 'Learns your tone and style', 'Adapts to your personality'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      number: '03',
      icon: MessageSquare,
      title: 'Get Your Perfect Reply',
      description: 'AI enhances your thoughts into the perfect reply instantly. One-click insertion directly into X - no copy-paste needed.',
      details: ['Instant enhancement', 'One-click insertion', 'Sounds exactly like you'],
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and transform your Twitter engagement forever. 
              Our simple 3-step process gets you generating authentic replies immediately.
            </p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connection lines for desktop */}
            <div className="hidden lg:block absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
              <div className="flex justify-between items-center h-1">
                <div className="w-1/3 h-0.5 bg-gradient-to-r from-purple-200 to-blue-200"></div>
                <div className="w-1/3 h-0.5 bg-gradient-to-r from-blue-200 to-green-200"></div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-4">
              {steps.map((step, index) => (
                <div key={step.number} className="relative">
                  {/* Mobile connection line */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden absolute left-8 top-20 w-0.5 h-20 bg-gradient-to-b from-gray-300 to-gray-200 z-0"></div>
                  )}
                  
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow relative z-10">
                    {/* Step number */}
                    <div className="absolute -top-4 left-8">
                      <div className={`w-8 h-8 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6`}>
                      <step.icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{step.description}</p>

                    {/* Details */}
                    <ul className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className={`w-1.5 h-1.5 bg-gradient-to-r ${step.color} rounded-full flex-shrink-0`}></div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Desktop arrow */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute -right-4 top-1/2 transform -translate-y-1/2 z-20">
                      <div className="w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom section */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
                Join creators who are growing 3x faster with authentic AI replies. 
                No credit card required - start with 10 free replies today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium">
                  ⚡ Setup in 2 minutes
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium">
                  🎯 Sounds exactly like you
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium">
                  🚀 10 free replies monthly
                </div>
              </div>
            </div>
          </div>

          {/* Process visualization */}
          <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h4 className="text-lg font-bold text-center mb-6">The Technology Behind Your Authentic Voice</h4>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm font-medium text-purple-700">Tweet Analysis</div>
                <div className="text-xs text-gray-600 mt-1">AI studies your style</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-sm font-medium text-blue-700">Context Understanding</div>
                <div className="text-xs text-gray-600 mt-1">Reads conversation flow</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl mb-2">✨</div>
                <div className="text-sm font-medium text-green-700">Reply Generation</div>
                <div className="text-xs text-gray-600 mt-1">Creates authentic responses</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-sm font-medium text-orange-700">One-Click Insert</div>
                <div className="text-xs text-gray-600 mt-1">Direct insertion into X</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}