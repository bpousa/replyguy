import { createClient } from '@supabase/supabase-js';

// This script fixes subscription for a specific user
// Run with: npx tsx scripts/fix-user-subscription.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserSubscription(email: string) {
  console.log(`Fixing subscription for: ${email}`);
  
  // Get user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error('User not found');
    return;
  }
  
  console.log(`User ID: ${user.id}`);
  
  // Ensure user record exists
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      daily_goal: 10,
      timezone: 'America/New_York'
    }, {
      onConflict: 'id'
    });
    
  if (userError) {
    console.error('Failed to upsert user:', userError);
  }
  
  // Check existing subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  if (existingSub) {
    console.log('Existing subscription found:', existingSub);
    
    // Update to ensure it's active
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('user_id', user.id);
      
    if (updateError) {
      console.error('Failed to update subscription:', updateError);
    } else {
      console.log('✅ Updated existing subscription to active');
    }
  } else {
    // Create X Pro subscription for main user
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: 'pro',
        status: 'active',
        stripe_customer_id: `cus_main_${user.id.substring(0, 8)}`,
        stripe_subscription_id: `sub_main_${user.id.substring(0, 8)}`,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      
    if (subError) {
      console.error('Failed to create subscription:', subError);
    } else {
      console.log('✅ Created new Pro subscription');
    }
  }
  
  // Initialize usage tracking
  await supabase
    .from('user_usage')
    .upsert({
      user_id: user.id,
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
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      replies_generated: 0,
      memes_generated: 0
    }, {
      onConflict: 'user_id,date'
    });
    
  console.log('✅ User subscription fixed!');
  
  // Verify the fix
  const { data: finalSub } = await supabase
    .from('subscriptions')
    .select(`
      *,
      subscription_plans!inner (*)
    `)
    .eq('user_id', user.id)
    .single();
    
  console.log('\nFinal subscription state:', finalSub);
}

// Fix the main user
fixUserSubscription('mikegiannulis@gmail.com').catch(console.error);