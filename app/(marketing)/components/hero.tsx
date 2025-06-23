'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-300 rounded-full blur-3xl opacity-20" />
        <div className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-blue-300 rounded-full blur-3xl opacity-20" />
      </div>
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Now with AI-powered memes!
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Turn Your Twitter Game from{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                Cringe to King
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              AI-powered replies that actually sound human. No more "As an AI" nonsense. 
              Just authentic, engaging responses that get likes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/signup">
                <Button size="lg" className="group">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>10 free replies/month</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
          
          {/* Demo preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16"
          >
            <div className="relative mx-auto max-w-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-2xl blur-xl opacity-20" />
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="font-medium">@techbro</div>
                      <div className="text-gray-600">Just deployed to production on a Friday 🚀</div>
                    </div>
                  </div>
                  <div className="pl-13 space-y-2">
                    <div className="text-sm text-gray-500">Reply Guy suggests:</div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                      "Living dangerously, I see! Hope your weekend plans include being on-call 😅 
                      May the server gods be merciful 🙏"
                    </div>
                    <div className="flex gap-2">
                      <div className="text-xs bg-gray-100 rounded px-2 py-1">Witty</div>
                      <div className="text-xs bg-gray-100 rounded px-2 py-1">Relatable</div>
                      <div className="text-xs bg-purple-100 text-purple-700 rounded px-2 py-1">+Meme</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}