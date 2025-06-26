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
        .select('daily_goal, timezone')
        .eq('id', user.id)
        .single();
        
      if (userData) {
        setDailyGoal(userData.daily_goal || 10);
      }
      
      // Get user with active subscription and plan details
      const { data: userWithSub } = await supabase
        .from('users')
        .select(`
          *,
          subscriptions!inner(
            status,
            plan_id,
            current_period_end,
            subscription_plans!inner(*)
          )
        `)
        .eq('id', user.id)
        .eq('subscriptions.is_active', true)
        .single();
        
      if (userWithSub?.subscriptions?.[0]) {
        const subscription = userWithSub.subscriptions[0];
        // Get current month's meme usage
        const { data: currentUsage } = await supabase
          .rpc('get_current_usage', { p_user_id: user.id })
          .single() as { data: { total_replies: number; total_memes: number } | null };
          
        setSubscription({
          plan_id: subscription.plan_id,
          subscription_plans: subscription.subscription_plans,
          status: subscription.status,
          memes_used: currentUsage?.total_memes || 0
        });
      }
      
      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabase
        .from('daily_usage')
        .select('replies_generated')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
        
      if (usage) {
        setDailyCount(usage.replies_generated || 0);
      }
    };
    
    loadUserData();
    
    // Subscribe to auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserData();
      }
    });
    
    return () => {
      authSubscription?.unsubscribe();
    };
  }, [supabase]);

  const handleGenerate = async (input: UserInput) => {
    if (!user) {
      toast.error('Please sign in to generate replies');
      return;
    }
    
    // Check usage limits
    try {
      const limitsResponse = await fetch('/api/check-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!limitsResponse.ok) {
        console.error('Failed to check limits:', limitsResponse.status);
        // Continue without limit checking for now
      } else {
        const limitsData = await limitsResponse.json();
        
        if (!limitsData.canGenerate) {
      toast.error(
        <div className="flex flex-col gap-2">
          <p>You&apos;ve reached your monthly limit of {limitsData.limits.reply_limit} replies.</p>
          <a 
            href="/pricing" 
            className="text-sm underline font-medium"
          >
            Upgrade your plan to continue
          </a>
        </div>,
        { duration: 5000 }
      );
      return;
        }
      }
    } catch (error) {
      console.error('Error checking limits:', error);
      // Continue without limit checking
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
      
      // Update daily count using the database function
      await supabase.rpc('track_daily_usage', {
        p_user_id: user.id,
        p_usage_type: 'reply',
        p_count: 1
      });
      
      // Also track meme if generated
      if (result.data.memeUrl) {
        await supabase.rpc('track_daily_usage', {
          p_user_id: user.id,
          p_usage_type: 'meme',
          p_count: 1
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
            <ReplyForm 
              onSubmit={handleGenerate} 
              isLoading={isGenerating}
              user={user}
              subscription={subscription}
            />
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