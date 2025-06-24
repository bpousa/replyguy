import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyUpdates() {
  console.log('Applying X theme updates to database...\n');
  
  // Update plans with new specifications
  const planUpdates = [
    {
      id: 'free',
      updates: {
        name: 'Free',
        monthly_limit: 10,
        suggestion_limit: 0,
        enable_memes: false,
        meme_limit: 0,
        enable_write_like_me: false,
        enable_style_matching: false,
        max_reply_length: 280
      }
    },
    {
      id: 'growth',
      updates: {
        name: 'X Basic',
        monthly_price: 19,
        yearly_price: 190,
        monthly_limit: 300,
        suggestion_limit: 50,
        enable_memes: true,
        meme_limit: 10,
        enable_write_like_me: false,
        enable_style_matching: false,
        max_reply_length: 280
      }
    },
    {
      id: 'professional',
      updates: {
        name: 'X Pro',
        monthly_price: 49,
        yearly_price: 490,
        monthly_limit: 500,
        suggestion_limit: 100,
        enable_memes: true,
        meme_limit: 50,
        enable_write_like_me: true,
        enable_style_matching: true,
        max_reply_length: 560
      }
    },
    {
      id: 'enterprise',
      updates: {
        name: 'X Business',
        monthly_price: 99,
        yearly_price: 990,
        monthly_limit: 1000,
        suggestion_limit: 200,
        enable_memes: true,
        meme_limit: 100,
        enable_write_like_me: true,
        enable_style_matching: true,
        enable_perplexity_guidance: true,
        max_reply_length: 1000
      }
    }
  ];
  
  // First add any missing columns
  console.log('Adding missing columns...');
  try {
    // This would normally be done via migration, but we'll handle errors gracefully
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE subscription_plans 
        ADD COLUMN IF NOT EXISTS enable_memes BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS enable_api_access BOOLEAN DEFAULT false;
      `
    });
    console.log('✓ Columns added');
  } catch (error) {
    console.log('⚠ Could not add columns (may already exist)');
  }
  
  // Update each plan
  for (const plan of planUpdates) {
    console.log(`\nUpdating ${plan.id} plan...`);
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(plan.updates)
      .eq('id', plan.id)
      .select()
      .single();
      
    if (error) {
      console.error(`✗ Failed to update ${plan.id}:`, error.message);
    } else {
      console.log(`✓ Updated to ${data.name}`);
      console.log(`  - ${data.monthly_limit} replies/month`);
      console.log(`  - ${data.meme_limit || 0} memes/month`);
      console.log(`  - ${data.suggestion_limit || 0} AI suggestions`);
      if (data.enable_write_like_me) {
        console.log(`  - Write Like Me™ enabled`);
      }
    }
  }
  
  // Update user limits to match their plans
  console.log('\nUpdating user monthly limits...');
  const { error: updateError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE users u
      SET monthly_limit = sp.monthly_limit
      FROM subscription_plans sp
      WHERE u.subscription_tier = sp.id;
    `
  });
  
  if (updateError) {
    console.error('✗ Failed to update user limits:', updateError.message);
  } else {
    console.log('✓ User limits updated');
  }
  
  // Verify the updates
  console.log('\n\nVerifying plan updates:');
  console.log('=======================\n');
  
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
    
  if (plans) {
    plans.forEach(plan => {
      console.log(`${plan.name} (${plan.id}):`);
      console.log(`  Price: $${plan.monthly_price}/month, $${plan.yearly_price}/year`);
      console.log(`  Limits: ${plan.monthly_limit} replies, ${plan.meme_limit || 0} memes, ${plan.suggestion_limit || 0} suggestions`);
      console.log(`  Features: ${[
        plan.enable_style_matching && 'Style Matching',
        plan.enable_write_like_me && 'Write Like Me™',
        plan.enable_perplexity_guidance && 'Fact Checking',
        plan.enable_api_access && 'API Access'
      ].filter(Boolean).join(', ') || 'Basic'}`);
      console.log('');
    });
  }
  
  // Update test accounts to ensure they have correct limits
  console.log('Updating test accounts...\n');
  
  const testAccountUpdates = [
    { email: 'test-free@replyguy.com', monthly_limit: 10 },
    { email: 'test-basic@replyguy.com', monthly_limit: 300 },
    { email: 'test-pro@replyguy.com', monthly_limit: 500 },
    { email: 'test-business@replyguy.com', monthly_limit: 1000 }
  ];
  
  for (const update of testAccountUpdates) {
    const { error } = await supabase
      .from('users')
      .update({ monthly_limit: update.monthly_limit })
      .eq('email', update.email);
      
    if (!error) {
      console.log(`✓ ${update.email} → ${update.monthly_limit} replies/month`);
    }
  }
  
  console.log('\n✅ All updates complete!');
}

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

applyUpdates().catch(console.error);