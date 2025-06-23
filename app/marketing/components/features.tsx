'use client';

import { motion } from 'framer-motion';
import { 
  Brain, 
  Sparkles, 
  Target, 
  Zap, 
  Shield, 
  BarChart,
  Image,
  RefreshCw
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Human-Like Replies',
    description: 'No more "As an AI" cringe. Our replies pass the human test every time.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Image,
    title: 'Smart Meme Integration',
    description: 'Let AI decide when a meme would enhance your reply. Perfect meme selection powered by Imgflip.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Target,
    title: 'Style Matching',
    description: 'Replies that match the vibe of the original tweet. Formal? Casual? We adapt.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Zap,
    title: 'Daily Goals',
    description: 'Build your engagement habit with customizable daily reply goals and celebrations.',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    icon: Shield,
    title: 'Anti-AI Detection',
    description: 'Advanced filtering removes AI tells. Your replies stay undetectable.',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: BarChart,
    title: 'Real-Time Research',
    description: 'Get current stats, facts, and figures with Perplexity AI for data-backed responses.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Features that Make You a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                Reply Legend
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to craft engaging, authentic responses that get noticed.
            </p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-lg transition-shadow h-full">
                <div className={`${feature.bgColor} w-14 h-14 rounded-lg flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* How it works */}
        <div id="how-it-works" className="mt-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600">
                Three simple steps to Twitter greatness
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-purple-600 mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Paste the Tweet</h3>
              <p className="text-gray-600">
                Copy any tweet you want to reply to and paste it into ReplyGuy
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-purple-600 mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Your Intent</h3>
              <p className="text-gray-600">
                Tell us what you want to say and pick your tone. Enable memes for extra engagement
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-purple-600 mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Copy & Tweet</h3>
              <p className="text-gray-600">
                Get your perfectly crafted, human-sounding reply. Copy, paste, and watch the likes roll in
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}