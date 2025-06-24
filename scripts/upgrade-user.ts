import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function upgradeUser(email: string) {
  console.log(`Upgrading ${email} to Professional plan...`);
  
  // Update user to professional plan
  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'professional',
      subscription_status: 'active',
      monthly_limit: 500,
      subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('email', email)
    .select('*')
    .single();
    
  if (error) {
    console.error('Failed to upgrade user:', error);
    return;
  }
  
  console.log('✅ User upgraded successfully!');
  console.log('Subscription tier:', data.subscription_tier);
  console.log('Status:', data.subscription_status);
  console.log('Monthly limit:', data.monthly_limit);
  
  // Initialize usage tracking
  await supabase
    .from('user_usage')
    .upsert({
      user_id: data.id,
      reply_count: 0,
      meme_count: 0,
      suggestion_count: 0
    }, {
      onConflict: 'user_id'
    });
    
  // Initialize daily usage
  await supabase
    .from('daily_usage')
    .upsert({
      user_id: data.id,
      date: new Date().toISOString().split('T')[0],
      replies_generated: 0,
      memes_generated: 0
    }, {
      onConflict: 'user_id,date'
    });
    
  console.log('✅ Usage tracking initialized');
}

upgradeUser('mikegiannulis@gmail.com').catch(console.error);