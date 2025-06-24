import { CheckCircle, TrendingUp, Users, Heart } from 'lucide-react';

export function WhyReplyGuy() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Being a Reply Guy Works
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Rapid Audience Growth</h3>
                  <p className="text-gray-600">
                    Quality replies get seen by thousands. When you consistently add value 
                    to conversations, people naturally follow you.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Network Effects</h3>
                  <p className="text-gray-600">
                    Every reply is an opportunity to connect with influencers and their 
                    audiences. Build relationships that matter.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Authentic Engagement</h3>
                  <p className="text-gray-600">
                    Our AI helps you sound like yourself, not a robot. Build genuine 
                    connections that lead to real relationships.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Consistency is Key</h3>
                  <p className="text-gray-600">
                    Success on X comes from showing up daily. ReplyGuy makes it easy to 
                    maintain momentum with daily goals and quick generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-8 text-center">
            <p className="text-lg text-purple-900 mb-2">
              <strong>Pro tip:</strong> Aim for 10-20 quality replies per day.
            </p>
            <p className="text-purple-700">
              That's 300-600 opportunities per month to grow your audience and build your brand.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}