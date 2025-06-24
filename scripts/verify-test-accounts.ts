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
  
  // Get user with plan
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      subscription_plans!subscription_tier (
        id,
        name,
        monthly_limit,
        suggestion_limit,
        enable_style_matching,
        enable_perplexity_guidance,
        enable_write_like_me
      )
    `)
    .eq('email', email)
    .single();
    
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  if (!data) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('✅ User found');
  console.log(`   Subscription tier: ${data.subscription_tier}`);
  console.log(`   Status: ${data.subscription_status}`);
  console.log(`   Monthly limit: ${data.monthly_limit}`);
  
  if (data.subscription_plans) {
    console.log(`✅ Plan details loaded:`);
    console.log(`   Plan name: ${data.subscription_plans.name}`);
    console.log(`   Reply limit: ${data.subscription_plans.monthly_limit}/month`);
    console.log(`   Suggestion limit: ${data.subscription_plans.suggestion_limit === -1 ? 'Unlimited' : data.subscription_plans.suggestion_limit}`);
    console.log(`   Features:`);
    console.log(`   - Style matching: ${data.subscription_plans.enable_style_matching ? 'Yes' : 'No'}`);
    console.log(`   - Perplexity research: ${data.subscription_plans.enable_perplexity_guidance ? 'Yes' : 'No'}`);
    console.log(`   - Write Like Me: ${data.subscription_plans.enable_write_like_me || (data.subscription_tier === 'professional' || data.subscription_tier === 'enterprise') ? 'Yes' : 'No'}`);
  } else {
    console.log('❌ Plan details not found');
  }
  
  // Check usage
  const { data: usage } = await supabase
    .rpc('get_current_usage', { p_user_id: data.id })
    .single();
    
  if (usage) {
    console.log(`   Current usage:`);
    console.log(`   - Replies: ${usage.total_replies || 0}`);
    console.log(`   - Memes: ${usage.total_memes || 0}`);
    console.log(`   - Suggestions: ${usage.total_suggestions || 0}`);
  }
}

async function main() {
  console.log('Verifying test accounts...\n');
  
  for (const email of testAccounts) {
    await verifyAccount(email);
  }
  
  console.log('\n✅ Verification complete!');
}

main().catch(console.error);