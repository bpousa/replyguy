'use client';

import { motion } from 'framer-motion';
import { MessageCircle, TrendingUp, Target, Users } from 'lucide-react';

export function WhyReplyGuy() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Being a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Reply Guy</span> Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Leaving thoughtful comments is the fastest way to grow your X account. Here&apos;s why it&apos;s your secret weapon:
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-sm border"
            >
              <MessageCircle className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Get Seen by Thousands</h3>
              <p className="text-gray-600">
                When you reply to popular tweets, your comment gets exposed to their entire audience. 
                A single well-crafted reply can get you more visibility than 100 original tweets.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-sm border"
            >
              <TrendingUp className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Build Real Relationships</h3>
              <p className="text-gray-600">
                Engaging with others&apos; content shows you&apos;re not just broadcasting but actually participating 
                in conversations. This builds genuine connections that turn into loyal followers.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-sm border"
            >
              <Target className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Daily Goals Keep You Consistent</h3>
              <p className="text-gray-600">
                We help you set and track daily reply goals (default: 10 replies/day). 
                Consistency is key – regular engagement compounds into exponential growth over time.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl p-8 shadow-sm border"
            >
              <Users className="w-12 h-12 text-yellow-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Quality Over Quantity</h3>
              <p className="text-gray-600">
                One thoughtful, engaging reply is worth more than 50 generic responses. 
                ReplyGuy ensures every reply adds value to the conversation and showcases your personality.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-8 text-center"
          >
            <h3 className="text-2xl font-bold mb-3">
              The Math is Simple
            </h3>
            <p className="text-lg opacity-90">
              10 quality replies per day × 30 days = 300 touchpoints with potential followers.
              <br />
              That&apos;s 300 chances to showcase your wit, knowledge, and personality.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}