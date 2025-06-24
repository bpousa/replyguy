import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestAccountFix {
  email: string;
  planId: string;
  monthlyLimit: number;
}

const accountsToFix: TestAccountFix[] = [
  {
    email: 'test-free@replyguy.com',
    planId: 'free',
    monthlyLimit: 10
  },
  {
    email: 'test-basic@replyguy.com',
    planId: 'growth', // Maps to 'basic' in UI
    monthlyLimit: 300
  },
  {
    email: 'test-pro@replyguy.com',
    planId: 'professional', // Maps to 'pro' in UI
    monthlyLimit: 500
  },
  {
    email: 'test-business@replyguy.com',
    planId: 'enterprise', // Maps to 'business' in UI
    monthlyLimit: 1000
  }
];

async function fixTestAccount(account: TestAccountFix) {
  console.log(`\nFixing ${account.email}...`);
  
  try {
    // Get the user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === account.email);
    
    if (!user) {
      console.error(`❌ User not found: ${account.email}`);
      return;
    }
    
    console.log(`Found user: ${user.id}`);
    
    // Update user record with correct subscription data
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_tier: account.planId,
        subscription_status: 'active',
        monthly_limit: account.monthlyLimit,
        subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', user.id)
      .select('*')
      .single();
      
    if (error) {
      console.error(`❌ Failed to update user:`, error);
      return;
    }
    
    console.log(`✅ Updated subscription tier to: ${account.planId}`);
    console.log(`   Monthly limit: ${account.monthlyLimit}`);
    console.log(`   Status: ${data.subscription_status}`);
    
    // Initialize usage records
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
      
    // Verify the plan details
    const { data: verifyData } = await supabase
      .from('users')
      .select('*, subscription_plans!subscription_tier(*)')
      .eq('id', user.id)
      .single();
      
    if (verifyData?.subscription_plans) {
      console.log(`✅ Verified plan: ${verifyData.subscription_plans.name}`);
      console.log(`   Features:`);
      console.log(`   - Reply limit: ${verifyData.subscription_plans.reply_limit}/month`);
      console.log(`   - Meme limit: ${verifyData.subscription_plans.meme_limit}/month`);
      console.log(`   - Suggestion limit: ${verifyData.subscription_plans.suggestion_limit === -1 ? 'Unlimited' : verifyData.subscription_plans.suggestion_limit + '/month'}`);
      console.log(`   - Style matching: ${verifyData.subscription_plans.enable_style_matching ? 'Yes' : 'No'}`);
      console.log(`   - Write Like Me: ${verifyData.subscription_plans.enable_write_like_me ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${account.email}:`, error);
  }
}

async function main() {
  console.log('Fixing test accounts to use correct subscription plans...\n');
  
  // First, let's check what plans are available
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
    
  console.log('Available subscription plans:');
  plans?.forEach(plan => {
    console.log(`- ${plan.id}: ${plan.name} (${plan.reply_limit} replies/month)`);
  });
  
  // Fix each test account
  for (const account of accountsToFix) {
    await fixTestAccount(account);
  }
  
  console.log('\n✨ All test accounts have been fixed!');
  console.log('\nTest Account Summary:');
  console.log('====================');
  console.log('\nFree Plan:');
  console.log('  Email: test-free@replyguy.com');
  console.log('  Password: TestFree123!');
  console.log('\nGrowth Plan ($19/month):');
  console.log('  Email: test-basic@replyguy.com');
  console.log('  Password: TestBasic123!');
  console.log('\nProfessional Plan ($49/month):');
  console.log('  Email: test-pro@replyguy.com');
  console.log('  Password: TestPro123!');
  console.log('\nEnterprise Plan ($99/month):');
  console.log('  Email: test-business@replyguy.com');
  console.log('  Password: TestBusiness123!');
}

main().catch(console.error);