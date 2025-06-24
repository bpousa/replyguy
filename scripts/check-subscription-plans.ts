import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPlans() {
  // Get all subscription plans with all fields
  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
    
  if (error) {
    console.error('Error fetching plans:', error);
    return;
  }
  
  console.log('Current subscription plans in database:');
  console.log('======================================\n');
  
  plans?.forEach(plan => {
    console.log(`Plan ID: ${plan.id}`);
    console.log(`Name: ${plan.name}`);
    console.log('Full plan object:', JSON.stringify(plan, null, 2));
    console.log('---\n');
  });
  
  // Test a specific user query
  const testEmail = 'test-business@replyguy.com';
  console.log(`\nTesting query for ${testEmail}:`);
  
  const { data: userData } = await supabase
    .from('users')
    .select('*, subscription_plans!subscription_tier(*)')
    .eq('email', testEmail)
    .single();
    
  console.log('User data:', JSON.stringify(userData, null, 2));
}

checkPlans().catch(console.error);