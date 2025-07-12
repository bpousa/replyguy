import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkReplyTiming() {
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, timezone')
    .eq('email', 'test-business@replyguy.com')
    .single();
    
  if (!user) {
    console.error('User not found');
    return;
  }
  
  console.log(`\n🕐 Reply Timing Analysis for ${user.timezone || 'UTC'}`);
  console.log('='.repeat(50));
  
  // Get the daily usage records with more details
  const { data: records } = await supabase
    .from('daily_usage')
    .select('date, created_at, replies_generated, memes_generated, suggestions_used')
    .eq('user_id', user.id)
    .in('date', ['2025-07-07', '2025-07-08'])
    .order('date', { ascending: false });
    
  if (!records) return;
  
  for (const record of records) {
    const createdDate = new Date(record.created_at);
    const timezone = user.timezone || 'America/New_York';
    
    // Show times in different timezones
    console.log(`\n📅 Date: ${record.date}`);
    console.log(`  First activity UTC: ${createdDate.toISOString()}`);
    console.log(`  First activity ${timezone}: ${createdDate.toLocaleString('en-US', { timeZone: timezone })}`);
    console.log(`  Total replies: ${record.replies_generated}`);
    console.log(`  Total memes: ${record.memes_generated}`);
    console.log(`  Total suggestions: ${record.suggestions_used}`);
    
    // Calculate what date it would have been in user's timezone when first reply was made
    const userDateAtCreation = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(createdDate);
    
    if (userDateAtCreation !== record.date) {
      console.log(`  ⚠️  TIMEZONE MISMATCH: Activity started on ${userDateAtCreation} in user's timezone but recorded as ${record.date}`);
    }
  }
  
  // Now let's check if there were any replies made late last night
  console.log(`\n\n🌙 Checking for late-night activity...`);
  
  // Get yesterday's date in user timezone
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdayUserDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: user.timezone || 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(yesterday);
  
  // Check what the check-limits API would return right now
  console.log(`\n\n🔍 Simulating check-limits calculation...`);
  const todayUserDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: user.timezone || 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  
  console.log(`  Current time UTC: ${now.toISOString()}`);
  console.log(`  Today in user timezone: ${todayUserDate}`);
  console.log(`  Yesterday in user timezone: ${yesterdayUserDate}`);
  
  // Get today's usage
  const { data: todayUsage } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayUserDate)
    .single();
    
  if (todayUsage) {
    console.log(`\n  Today's usage (${todayUserDate}): ${todayUsage.replies_generated} replies`);
  } else {
    console.log(`\n  No usage found for today (${todayUserDate})`);
  }
}

checkReplyTiming().catch(console.error);