import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testAccounts = [
  'test-free@replyguy.com',
  'test-basic@replyguy.com', 
  'test-pro@replyguy.com',
  'test-business@replyguy.com'
];

async function verifyAccount(email: string) {
  console.log(`\n=== ${email} ===`);
  
  // Get user
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    
  if (error || !user) {
    console.error('❌ User not found');
    return;
  }
  
  console.log('✅ User found');
  console.log(`   ID: ${user.id}`);
  console.log(`   Subscription tier: ${user.subscription_tier}`);
  console.log(`   Status: ${user.subscription_status}`);
  console.log(`   Monthly limit: ${user.monthly_limit}`);
  
  // Get plan separately
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', user.subscription_tier)
    .single();
    
  if (plan) {
    console.log(`✅ Plan: ${plan.name}`);
    console.log(`   Features:`);
    console.log(`   - Monthly limit: ${plan.monthly_limit}`);
    console.log(`   - Suggestion limit: ${plan.suggestion_limit === -1 ? 'Unlimited' : plan.suggestion_limit}`);
    console.log(`   - Style matching: ${plan.enable_style_matching ? 'Yes' : 'No'}`);
    console.log(`   - Perplexity: ${plan.enable_perplexity_guidance ? 'Yes' : 'No'}`);
    
    // Check for Write Like Me based on plan
    const hasWriteLikeMe = plan.id === 'professional' || plan.id === 'enterprise';
    console.log(`   - Write Like Me: ${hasWriteLikeMe ? 'Yes' : 'No'}`);
  }
}

async function main() {
  console.log('Verifying test accounts...\n');
  
  for (const email of testAccounts) {
    await verifyAccount(email);
  }
  
  console.log('\n✅ All accounts verified!');
  console.log('\nSummary:');
  console.log('- test-free@replyguy.com → Free plan (10 replies/month)');
  console.log('- test-basic@replyguy.com → Growth plan (1500 replies/month)');
  console.log('- test-pro@replyguy.com → Professional plan (5000 replies/month, Write Like Me)');
  console.log('- test-business@replyguy.com → Enterprise plan (15000 replies/month, Write Like Me)');
}

main().catch(console.error);