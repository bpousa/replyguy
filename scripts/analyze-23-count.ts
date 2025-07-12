import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function analyze23Count() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'test-business@replyguy.com')
    .single();
    
  if (!user) {
    console.error('User not found');
    return;
  }
  
  console.log('\n🔍 Analyzing where count of 23 might come from...\n');
  
  // Get all recent daily usage
  const { data: allDaily } = await supabase
    .from('daily_usage')
    .select('date, replies_generated, created_at')
    .eq('user_id', user.id)
    .gte('date', '2025-07-01')
    .order('date', { ascending: false });
    
  if (!allDaily) return;
  
  console.log('Recent daily usage:');
  allDaily.forEach(d => {
    console.log(`  ${d.date}: ${d.replies_generated} replies`);
  });
  
  // Check if 23 appears anywhere
  const has23 = allDaily.find(d => d.replies_generated === 23);
  if (has23) {
    console.log(`\n✅ Found exact count of 23 on ${has23.date}`);
  }
  
  // Check combinations
  console.log('\nChecking combinations that might produce 23:');
  for (let i = 0; i < allDaily.length; i++) {
    for (let j = i + 1; j < allDaily.length; j++) {
      const sum = allDaily[i].replies_generated + allDaily[j].replies_generated;
      if (sum >= 22 && sum <= 24) {
        console.log(`  ${allDaily[i].date} (${allDaily[i].replies_generated}) + ${allDaily[j].date} (${allDaily[j].replies_generated}) = ${sum}`);
      }
    }
  }
  
  // Check if it could be a stale cache from earlier today
  console.log('\n🕒 Checking if 23 could be from earlier today:');
  const todayRecord = allDaily.find(d => d.date === '2025-07-08');
  if (todayRecord) {
    console.log(`  Current count for today: ${todayRecord.replies_generated}`);
    console.log(`  If user saw 23 earlier, then ${todayRecord.replies_generated - 23} replies were made since then`);
    
    // Check creation time
    const createdAt = new Date(todayRecord.created_at);
    console.log(`  First reply today was at: ${createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  }
  
  // Check get_current_usage function which tracks billing period
  console.log('\n💳 Checking billing period totals:');
  const { data: currentUsage } = await supabase
    .rpc('get_current_usage', { p_user_id: user.id });
    
  if (currentUsage && currentUsage.length > 0) {
    console.log(`  Total replies this billing period: ${currentUsage[0].total_replies}`);
    console.log(`  Could 23 be from the extension misreading the total? ${currentUsage[0].total_replies === 23 ? 'YES!' : 'No'}`);
  }
}

analyze23Count().catch(console.error);