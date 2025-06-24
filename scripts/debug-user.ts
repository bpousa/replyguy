import { createClient } from '@supabase/supabase-js';

// Debug script to check user data
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUser(email: string) {
  console.log(`\nDebugging user: ${email}\n`);
  
  // Get user from auth
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  
  if (!authUser) {
    console.error('❌ User not found in auth');
    return;
  }
  
  console.log('✅ Auth user found:', authUser.id);
  
  // Check users table
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
    
  console.log('\nUsers table:', userRecord || userError);
  
  // Check subscriptions
  const { data: subs, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', authUser.id);
    
  console.log('\nSubscriptions:', subs || subError);
  
  // Check subscription plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
    
  console.log('\nAvailable plans:', plans?.map(p => ({ id: p.id, name: p.name })));
  
  // Check user_usage
  const { data: usage } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', authUser.id)
    .single();
    
  console.log('\nUser usage:', usage);
  
  // Check daily_usage
  const { data: daily } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('user_id', authUser.id)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();
    
  console.log('\nDaily usage:', daily);
  
  // Test RPC function
  const { data: limits, error: limitsError } = await supabase
    .rpc('get_user_limits', { p_user_id: authUser.id });
    
  console.log('\nRPC get_user_limits:', limits || limitsError);
}

debugUser('mikegiannulis@gmail.com').catch(console.error);