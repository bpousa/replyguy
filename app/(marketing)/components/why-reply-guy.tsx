import { CheckCircle, TrendingUp, Users, Heart } from 'lucide-react';

export function WhyReplyGuy() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Why Being a Reply Guy Works
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-4xl mx-auto">
            The &quot;Reply Guy&quot; strategy is one of the most underrated growth tactics on Twitter. When done authentically and strategically, 
            replying to tweets can be more effective than creating original content for building your audience and establishing thought leadership.
          </p>

          {/* Strategy Deep Dive */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">The Science Behind Reply-Based Growth</h3>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-6">
                <strong>Twitter&apos;s algorithm favors engagement over follower count.</strong> When you reply to a tweet, you&apos;re not just engaging with the original poster - 
                you&apos;re positioning yourself in front of their entire audience. A single thoughtful reply on a viral tweet can reach tens of thousands of potential followers 
                who are already engaged and interested in the topic.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h4 className="font-bold text-blue-800 mb-3">📈 The Multiplier Effect</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    When you reply to an influencer&apos;s tweet that gets 1,000 likes, your reply potentially reaches 1,000+ engaged users who are already 
                    interested in the topic. Compare this to posting original content that might only reach your existing followers.
                  </p>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Original tweet: Reaches your followers (~100-1,000 people)</li>
                    <li>• Strategic reply: Reaches their audience (~1,000-10,000+ people)</li>
                    <li>• Viral reply: Can reach 100,000+ engaged users</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                  <h4 className="font-bold text-green-800 mb-3">🎯 Higher Conversion Rates</h4>
                  <p className="text-green-700 text-sm mb-3">
                    People who discover you through replies are pre-qualified. They&apos;re already engaging with content similar to yours, 
                    making them much more likely to follow and become genuine fans of your content.
                  </p>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• 3-5x higher follow rates than cold outreach</li>
                    <li>• Better audience quality and engagement</li>
                    <li>• Natural conversation starters for DMs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
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
          
          {/* Strategic Implementation Guide */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">The ReplyGuy Success Framework</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Find the Right Conversations</h4>
                <p className="text-gray-600 text-sm">
                  Target tweets from accounts in your niche with 100+ likes. These have engaged audiences but aren&apos;t oversaturated with replies.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Add Genuine Value</h4>
                <p className="text-gray-600 text-sm">
                  Don&apos;t just agree or disagree. Add insights, ask thoughtful questions, or share relevant experiences that enhance the conversation.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Maintain Authenticity</h4>
                <p className="text-gray-600 text-sm">
                  Use your natural voice and personality. ReplyGuy&apos;s AI helps you sound like yourself, not a generic bot.
                </p>
              </div>
            </div>
          </div>

          {/* Timing and Frequency Guide */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Optimal Reply Strategy & Timing</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-gray-900 mb-4">📅 Best Times to Reply</h4>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Within 1-2 hours</strong> of original tweet for maximum visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Peak hours:</strong> 9-11 AM and 1-3 PM in your target audience&apos;s timezone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Trending topics:</strong> React quickly to viral conversations for maximum reach</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">🎯 Daily Reply Goals</h4>
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="font-semibold text-green-800">Beginner: 5-10 replies/day</div>
                    <div className="text-green-700 text-sm">Focus on quality over quantity. Build the habit first.</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="font-semibold text-blue-800">Intermediate: 10-20 replies/day</div>
                    <div className="text-blue-700 text-sm">Mix of engagement types across different conversations.</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="font-semibold text-purple-800">Advanced: 20-50 replies/day</div>
                    <div className="text-purple-700 text-sm">Systematic approach targeting specific growth objectives.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-8 text-center">
            <p className="text-lg text-purple-900 mb-2">
              <strong>Pro tip:</strong> Quality beats quantity every time.
            </p>
            <p className="text-purple-700 mb-4">
              10 thoughtful, authentic replies will outperform 50 generic ones. ReplyGuy helps you maintain quality while increasing speed.
            </p>
            <div className="text-sm text-purple-600 italic">
              Remember: You&apos;re building relationships, not just numbers. Every reply is an opportunity to connect with someone who could become a customer, collaborator, or friend.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}