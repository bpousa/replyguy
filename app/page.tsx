'use client';

import { useState } from 'react';
import ReplyForm from './components/reply-form';
import ReplyOutput from './components/reply-output';
import { UserInput, GeneratedReply } from './lib/types';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const [generatedReply, setGeneratedReply] = useState<GeneratedReply | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (input: UserInput) => {
    setIsGenerating(true);
    setGeneratedReply(null);

    try {
      // TODO: Implement the actual API calls
      // For now, using a mock response
      const mockReply: GeneratedReply = {
        reply: "That's exactly what happened to me last week! Found a typo in a variable name after staring at it for hours. The debugging struggle is real.",
        replyType: 'Relatable Confession',
        cost: 0.016,
        processingTime: 2500,
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGeneratedReply(mockReply);
    } catch (error) {
      console.error('Failed to generate reply:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold gradient-text">
              ReplyGuy
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Create authentic, human-like replies to tweets with AI
          </p>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 card-hover">
            <h2 className="text-xl font-semibold mb-4">Create Your Reply</h2>
            <ReplyForm onSubmit={handleGenerate} isLoading={isGenerating} />
          </div>

          {/* Output display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Reply</h2>
            <ReplyOutput reply={generatedReply} isLoading={isGenerating} />
          </div>
        </div>

        {/* Features section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="Cost Optimized"
            description="90% token reduction through smart classification"
            icon="💰"
          />
          <FeatureCard
            title="Human-Like"
            description="No AI-isms, just natural conversation"
            icon="💬"
          />
          <FeatureCard
            title="Context Aware"
            description="50+ reply types matched to your needs"
            icon="🎯"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { 
  title: string; 
  description: string; 
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center card-hover">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}