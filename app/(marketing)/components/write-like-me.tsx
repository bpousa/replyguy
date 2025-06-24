'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, User, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';

const examples = [
  {
    generic: "I appreciate your perspective on this topic. It's important to consider multiple viewpoints when discussing such matters.",
    personalized: "totally feel you on this one fr... the way ppl just ignore the obvious is wild 💀",
    style: "Casual Gen Z"
  },
  {
    generic: "Thank you for sharing this information. I found it quite informative and helpful.",
    personalized: "This is brilliant! Exactly what I needed to see today. Mind if I share this with my team? 🚀",
    style: "Enthusiastic Professional"
  },
  {
    generic: "I disagree with your assessment. The data suggests a different conclusion.",
    personalized: "Actually, if you look at the Q3 numbers from Gartner, they're showing the opposite trend. Here's the link: [source]",
    style: "Data-Driven Analyst"
  },
  {
    generic: "That's an interesting point. Have you considered the alternative approach?",
    personalized: "ok but what if... hear me out... we flip the whole thing? like what if the problem IS the solution? 🤔",
    style: "Creative Thinker"
  }
];

export function WriteLikeMe() {
  const [currentExample, setCurrentExample] = useState(0);
  const [isTransforming, setIsTransforming] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransforming(true);
      setTimeout(() => {
        setCurrentExample((prev) => (prev + 1) % examples.length);
        setIsTransforming(false);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              NEW FEATURE
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Write Like Me™
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Train AI on your unique voice. Upload your best tweets and let ReplyGuy learn your style, 
              tone, and personality to generate authentic replies that sound exactly like you.
            </p>
          </div>

          {/* Interactive Demo */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Generic Side */}
              <div className="relative">
                <div className="absolute -top-4 -left-4 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                  Generic AI
                </div>
                <div className={`bg-gray-50 rounded-lg p-6 transition-opacity duration-500 ${isTransforming ? 'opacity-50' : 'opacity-100'}`}>
                  <p className="text-gray-700 leading-relaxed">
                    {examples[currentExample].generic}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center">
                <motion.div
                  animate={{
                    x: isTransforming ? [0, 20, 0] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <ArrowRight className="w-8 h-8 text-purple-600" />
                </motion.div>
              </div>

              {/* Personalized Side */}
              <div className="relative">
                <div className="absolute -top-4 -right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {examples[currentExample].style}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentExample}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200"
                  >
                    <p className="text-gray-800 leading-relaxed font-medium">
                      {examples[currentExample].personalized}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Maintain Authenticity</h3>
              <p className="text-gray-600">
                Your voice, amplified. Never lose your unique style while scaling your social presence.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personal Brand</h3>
              <p className="text-gray-600">
                Perfect for influencers and thought leaders who need to maintain consistent voice.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Learn & Adapt</h3>
              <p className="text-gray-600">
                Upload 10+ tweets and watch as AI learns your patterns, vocabulary, and tone.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-6">
              Available on <span className="font-semibold text-purple-600">X Pro</span> and <span className="font-semibold text-purple-600">X Business</span> plans
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8">
                Start Training Your AI
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}