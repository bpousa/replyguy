'use client';

import { useState, useEffect } from 'react';
import ReplyForm from '@/app/components/reply-form';
import ReplyOutput from '@/app/components/reply-output';
import { UserInput, GeneratedReply } from '@/app/lib/types';
import { Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DailyGoalTracker } from '@/app/components/daily-goal-tracker';
import { createBrowserClient } from '@/app/lib/auth';


export default function HomePage() {
  const supabase = createBrowserClient();
  const [generatedReply, setGeneratedReply] = useState<GeneratedReply | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUser(user);
      
      // Get user's settings
      const { data: userData } = await supabase
        .from('users')
        .select('daily_goal')
        .eq('id', user.id)
        .single();
        
      if (userData?.daily_goal) {
        setDailyGoal(userData.daily_goal);
      }
      
      // Get subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
        
      setSubscription(sub);
      
      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabase
        .from('daily_usage')
        .select('reply_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
        
      if (usage) {
        setDailyCount(usage.reply_count);
      }
    };
    
    loadUserData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async (input: UserInput) => {
    if (!user) {
      toast.error('Please sign in to generate replies');
      return;
    }
    
    // Check usage limits
    const planLimits = {
      free: 10,
      basic: 50,
      pro: 150,
      business: 500,
      enterprise: 1000,
    };
    
    const planName = subscription?.subscription_plans?.id || 'free';
    const monthlyLimit = planLimits[planName as keyof typeof planLimits] || 10;
    
    // Get monthly usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: monthlyUsage } = await supabase
      .from('user_usage')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());
      
    if (monthlyUsage && monthlyUsage.length >= monthlyLimit) {
      toast.error(`You've reached your monthly limit of ${monthlyLimit} replies. Please upgrade your plan.`);
      return;
    }

    setIsGenerating(true);
    setGeneratedReply(null);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate reply');
      }

      setGeneratedReply(result.data);
      toast.success('Reply generated successfully!');
      
      // Track usage
      await supabase.from('user_usage').insert({
        user_id: user.id,
        reply_type: result.data.replyType,
        tokens_used: result.data.tokensUsed || 0,
        cost: result.data.cost || 0,
        has_meme: result.data.memeUrl ? true : false,
      });
      
      // Update daily count
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyUsage } = await supabase
        .from('daily_usage')
        .select('id, reply_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
        
      if (dailyUsage) {
        await supabase
          .from('daily_usage')
          .update({ reply_count: dailyUsage.reply_count + 1 })
          .eq('id', dailyUsage.id);
      } else {
        await supabase
          .from('daily_usage')
          .insert({
            user_id: user.id,
            date: today,
            reply_count: 1,
          });
      }
      
      setDailyCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to generate reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate reply');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleGoalChange = async (newGoal: number) => {
    setDailyGoal(newGoal);
    
    if (user) {
      await supabase
        .from('users')
        .update({ daily_goal: newGoal })
        .eq('id', user.id);
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

        {/* Daily Goal Tracker */}
        <div className="mb-8">
          <DailyGoalTracker 
            currentCount={dailyCount} 
            goal={dailyGoal}
            onGoalChange={handleGoalChange}
          />
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

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>
            Built with ❤️ using{' '}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Next.js
            </a>
            ,{' '}
            <a
              href="https://www.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Claude
            </a>
            , and{' '}
            <a
              href="https://openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              OpenAI
            </a>
          </p>
          <p className="mt-2">
            <a
              href="https://github.com/bpousa/replyguy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View on GitHub
            </a>
          </p>
        </footer>
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