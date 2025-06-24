import { createClient } from '@supabase/supabase-js';

// This script creates test accounts for each subscription level
// Run with: npx tsx scripts/setup-test-accounts.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

// Create admin client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestAccount {
  email: string;
  password: string;
  planId: string;
  displayName: string;
}

const testAccounts: TestAccount[] = [
  {
    email: 'test-free@replyguy.com',
    password: 'TestFree123!',
    planId: 'free',
    displayName: 'Test Free User'
  },
  {
    email: 'test-basic@replyguy.com',
    password: 'TestBasic123!',
    planId: 'basic',
    displayName: 'Test Basic User'
  },
  {
    email: 'test-pro@replyguy.com',
    password: 'TestPro123!',
    planId: 'pro',
    displayName: 'Test Pro User'
  },
  {
    email: 'test-business@replyguy.com',
    password: 'TestBusiness123!',
    planId: 'business',
    displayName: 'Test Business User'
  }
];

async function createTestAccount(account: TestAccount) {
  try {
    console.log(`\nCreating test account: ${account.email}`);
    
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: account.displayName
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`User ${account.email} already exists, skipping auth creation`);
        
        // Get existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === account.email);
        
        if (!existingUser) {
          throw new Error('Could not find existing user');
        }
        
        // Use existing user ID
        await setupUserData(existingUser.id, account);
      } else {
        throw authError;
      }
    } else if (authData.user) {
      await setupUserData(authData.user.id, account);
    }
    
  } catch (error) {
    console.error(`Failed to create ${account.email}:`, error);
  }
}

async function setupUserData(userId: string, account: TestAccount) {
  // Step 2: Ensure user record exists
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: account.email,
      daily_goal: 10,
      timezone: 'America/New_York'
    }, {
      onConflict: 'id'
    });

  if (userError) {
    console.error('Failed to create user record:', userError);
    return;
  }

  // Step 3: Get plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', account.planId)
    .single();

  if (planError || !plan) {
    console.error('Failed to get plan:', planError);
    return;
  }

  // Step 4: Create or update subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: account.planId,
      status: 'active',
      stripe_customer_id: `cus_test_${account.planId}_${userId.substring(0, 8)}`,
      stripe_subscription_id: `sub_test_${account.planId}_${userId.substring(0, 8)}`,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (subError) {
    console.error('Failed to create subscription:', subError);
    return;
  }

  // Step 5: Initialize usage tracking
  await supabase
    .from('user_usage')
    .upsert({
      user_id: userId,
      reply_count: 0,
      meme_count: 0,
      suggestion_count: 0
    }, {
      onConflict: 'user_id'
    });

  // Step 6: Initialize daily usage
  await supabase
    .from('daily_usage')
    .upsert({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      replies_generated: 0,
      memes_generated: 0
    }, {
      onConflict: 'user_id,date'
    });

  console.log(`✅ Successfully created test account:
  - Email: ${account.email}
  - Password: ${account.password}
  - Plan: ${plan.name} (${account.planId})
  - Limits:
    - Replies: ${plan.reply_limit}/month
    - Memes: ${plan.meme_limit}/month
    - Suggestions: ${plan.suggestion_limit === -1 ? 'Unlimited' : plan.suggestion_limit + '/month'}
    - Style Matching: ${plan.enable_style_matching ? 'Yes' : 'No'}
    - Write Like Me: ${plan.enable_write_like_me ? 'Yes' : 'No'}
`);
}

async function main() {
  console.log('Setting up test accounts for ReplyGuy...\n');
  
  // Create accounts sequentially to avoid rate limits
  for (const account of testAccounts) {
    await createTestAccount(account);
  }
  
  console.log('\n✨ Test account setup complete!');
  console.log('\nYou can now log in with these accounts to test each subscription level.');
}

main().catch(console.error);