import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
      },
    }
  );
};

export const createBrowserClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

export async function getUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserSubscription(userId: string) {
  const supabase = createServerClient();
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      subscription_plans (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
    
  return subscription;
}

export async function getUserUsage(userId: string) {
  const supabase = createServerClient();
  
  // Get today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: dailyUsage } = await supabase
    .from('daily_usage')
    .select('reply_count')
    .eq('user_id', userId)
    .eq('date', today.toISOString().split('T')[0])
    .single();
    
  // Get monthly usage
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const { data: monthlyUsage } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false });
    
  return {
    dailyCount: dailyUsage?.reply_count || 0,
    monthlyCount: monthlyUsage?.length || 0,
    recentUsage: monthlyUsage || [],
  };
}