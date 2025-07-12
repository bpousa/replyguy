import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDailyUsage(email: string) {
  console.log(`\n🔍 Debugging daily usage for: ${email}`);
  console.log('='.repeat(50));
  
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    
  if (userError || !user) {
    console.error('❌ User not found:', userError);
    return;
  }
  
  console.log('\n👤 User Details:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Timezone: ${user.timezone || 'Not set (defaults to America/New_York)'}`);
  console.log(`  Daily Goal: ${user.daily_goal || 10}`);
  
  // Get current time info
  const now = new Date();
  const utcDate = now.toISOString().split('T')[0];
  console.log('\n⏰ Time Information:');
  console.log(`  Current UTC time: ${now.toISOString()}`);
  console.log(`  Current UTC date: ${utcDate}`);
  
  // Calculate user's timezone date
  const userTimezone = user.timezone || 'America/New_York';
  let userDate = utcDate;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    userDate = formatter.format(now);
    console.log(`  User's timezone date: ${userDate} (${userTimezone})`);
  } catch (e) {
    console.error(`  ❌ Invalid timezone: ${userTimezone}`);
  }
  
  // Get database server time
  const { data: dbTime } = await supabase.rpc('get_current_timestamp');
  if (dbTime) {
    const dbDate = new Date(dbTime);
    console.log(`  Database server time: ${dbTime}`);
    console.log(`  Database server date: ${dbDate.toISOString().split('T')[0]}`);
  }
  
  // Get recent daily usage records
  console.log('\n📊 Daily Usage Records (last 7 days):');
  const { data: usageRecords, error: usageError } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(7);
    
  if (usageError) {
    console.error('❌ Failed to fetch usage records:', usageError);
  } else if (!usageRecords || usageRecords.length === 0) {
    console.log('  No usage records found');
  } else {
    usageRecords.forEach(record => {
      console.log(`\n  Date: ${record.date}`);
      console.log(`    Replies: ${record.replies_generated}`);
      console.log(`    Memes: ${record.memes_generated}`);
      console.log(`    Suggestions: ${record.suggestions_used}`);
      console.log(`    Goal achieved: ${record.goal_achieved ? '✅' : '❌'}`);
      console.log(`    Created: ${record.created_at}`);
    });
  }
  
  // Check today's usage specifically
  console.log('\n🎯 Today\'s Usage Analysis:');
  const todayUsage = usageRecords?.find(r => r.date === userDate);
  if (todayUsage) {
    console.log(`  ✅ Found usage record for today (${userDate}):`);
    console.log(`    Replies: ${todayUsage.replies_generated} / ${user.daily_goal || 10}`);
  } else {
    console.log(`  ❌ No usage record found for today (${userDate})`);
  }
  
  // Check if there's a mismatch (usage for UTC date but not user date)
  const utcUsage = usageRecords?.find(r => r.date === utcDate);
  if (utcUsage && utcUsage.date !== userDate) {
    console.log(`\n  ⚠️  Found usage record for UTC date (${utcDate}) but not user's timezone date!`);
    console.log(`    This might explain why the counter shows yesterday's data`);
  }
  
  // Get current usage from the function
  console.log('\n🔧 Testing get_current_usage function:');
  const { data: currentUsage, error: currentUsageError } = await supabase
    .rpc('get_current_usage', { p_user_id: user.id });
    
  if (currentUsageError) {
    console.error('❌ get_current_usage failed:', currentUsageError);
  } else {
    console.log('  Current usage from function:', currentUsage);
  }
  
  // Test the track_daily_usage function
  console.log('\n🔧 Testing track_daily_usage function:');
  console.log(`  Calling with user date: ${userDate}`);
  const { data: trackResult, error: trackError } = await supabase
    .rpc('track_daily_usage', {
      p_user_id: user.id,
      p_usage_type: 'reply',
      p_count: 0, // Don't actually increment, just test
      p_date: userDate
    });
    
  if (trackError) {
    console.error('❌ track_daily_usage failed:', trackError);
  } else {
    console.log('  Track result:', trackResult);
  }
  
  // Get billing period info
  console.log('\n💳 Billing Period Analysis:');
  const { data: billingPeriod } = await supabase
    .rpc('get_current_billing_period', { p_user_id: user.id });
    
  if (billingPeriod && billingPeriod.length > 0) {
    const period = billingPeriod[0];
    console.log(`  Period start: ${period.period_start}`);
    console.log(`  Period end: ${period.period_end}`);
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run the debug script
const email = process.argv[2] || 'test-business@replyguy.com';
debugDailyUsage(email).catch(console.error);