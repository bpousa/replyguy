#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPerplexityFeature() {
  console.log('🔍 === PERPLEXITY FEATURE VERIFICATION ===\n');

  // Check environment variables
  console.log('1. Environment Variables:');
  console.log('   NEXT_PUBLIC_ENABLE_PERPLEXITY:', process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY);
  console.log('   PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? 'SET' : 'MISSING');
  console.log('');

  // Check subscription plans
  console.log('2. Subscription Plans with Perplexity:');
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, enable_perplexity_guidance, active')
    .eq('active', true)
    .order('sort_order');

  if (plans) {
    plans.forEach(plan => {
      const status = plan.enable_perplexity_guidance ? '✅ ENABLED' : '❌ DISABLED';
      console.log(`   ${plan.name} (${plan.id}): ${status}`);
    });
  }
  console.log('');

  // Check current user subscriptions
  console.log('3. Current User Subscriptions:');
  const { data: users } = await supabase
    .from('users')
    .select(`
      email,
      subscriptions!inner(
        plan_id, status,
        subscription_plans!inner(
          name, enable_perplexity_guidance
        )
      )
    `)
    .eq('subscriptions.is_active', true);

  if (users) {
    users.forEach(user => {
      const sub = user.subscriptions[0];
      const plan = sub.subscription_plans;
      const status = plan.enable_perplexity_guidance ? '✅ HAS ACCESS' : '❌ NO ACCESS';
      console.log(`   ${user.email}: ${plan.name} ${status}`);
    });
  }
  console.log('');

  // Test Perplexity API connectivity
  console.log('4. Perplexity API Test:');
  if (!process.env.PERPLEXITY_API_KEY) {
    console.log('   ❌ PERPLEXITY_API_KEY not set - skipping API test');
  } else {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'Test: What is 1+1?' }],
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        console.log('   ✅ Perplexity API connection successful');
        const data = await response.json();
        console.log('   📝 Response preview:', data.choices[0].message.content.substring(0, 50) + '...');
      } else {
        console.log(`   ❌ Perplexity API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log('   ❌ Perplexity API connection failed:', error.message);
    }
  }
  console.log('');

  // Summary
  console.log('🎯 === DIAGNOSIS SUMMARY ===');
  
  const envEnabled = process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY !== 'false';
  const apiKeySet = !!process.env.PERPLEXITY_API_KEY;
  const businessUsersExist = users?.some(u => u.subscriptions[0].subscription_plans.enable_perplexity_guidance);
  
  console.log('Environment setup:', envEnabled && apiKeySet ? '✅ GOOD' : '❌ ISSUES');
  console.log('Business tier users:', businessUsersExist ? '✅ EXISTS' : '❌ NONE');
  
  if (!envEnabled) {
    console.log('⚠️  NEXT_PUBLIC_ENABLE_PERPLEXITY is disabled');
  }
  if (!apiKeySet) {
    console.log('⚠️  PERPLEXITY_API_KEY is missing');
  }
  if (!businessUsersExist) {
    console.log('⚠️  No users on Business tier (only Business tier has Perplexity)');
  }
  
  console.log('\n🔧 Next steps:');
  if (!businessUsersExist) {
    console.log('   1. Upgrade a test user to Business tier to test Perplexity');
  }
  if (!apiKeySet) {
    console.log('   2. Set PERPLEXITY_API_KEY in .env.local');
  }
  if (!envEnabled) {
    console.log('   3. Set NEXT_PUBLIC_ENABLE_PERPLEXITY=true');
  }
}

verifyPerplexityFeature().catch(console.error);