// Test script to verify the signup fix works
// Run with: node scripts/test-signup-fix.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testSignup() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('Testing signup with:', testEmail);
  
  try {
    // Attempt to sign up a new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
        referral_code: '', // Test without referral
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
      return false;
    }
    
    console.log('User created successfully:', data.user.id);
    
    // Check if user profile was created
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return false;
    }
    
    console.log('User profile created:', profile);
    
    // Check if subscription was created
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    if (subError) {
      console.error('Error fetching subscription:', subError);
      return false;
    }
    
    console.log('Subscription created:', subscription);
    
    // Clean up test user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (deleteError) {
      console.error('Error deleting test user:', deleteError);
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

async function testSignupWithReferral() {
  // First create a referrer user
  const referrerEmail = `referrer_${Date.now()}@example.com`;
  const { data: referrer, error: referrerError } = await supabase.auth.admin.createUser({
    email: referrerEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });
  
  if (referrerError) {
    console.error('Error creating referrer:', referrerError);
    return false;
  }
  
  // Wait a bit for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get referrer's referral code
  const { data: referrerProfile } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', referrer.user.id)
    .single();
  
  if (!referrerProfile || !referrerProfile.referral_code) {
    console.error('Referrer profile or referral code not found');
    return false;
  }
  
  console.log('Referrer created with code:', referrerProfile.referral_code);
  
  // Now test signup with referral
  const testEmail = `referred_${Date.now()}@example.com`;
  
  console.log('Testing signup with referral code:', referrerProfile.referral_code);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Referred User',
      referral_code: referrerProfile.referral_code,
    },
  });
  
  if (error) {
    console.error('Signup with referral error:', error);
    // Clean up referrer
    await supabase.auth.admin.deleteUser(referrer.user.id);
    return false;
  }
  
  console.log('Referred user created successfully');
  
  // Check if referral was recorded
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', data.user.id)
    .single();
  
  if (referral) {
    console.log('Referral recorded:', referral);
  }
  
  // Clean up
  await supabase.auth.admin.deleteUser(data.user.id);
  await supabase.auth.admin.deleteUser(referrer.user.id);
  
  return true;
}

async function main() {
  console.log('Starting signup tests...\n');
  
  // Test 1: Basic signup
  console.log('Test 1: Basic signup without referral');
  const test1 = await testSignup();
  console.log('Result:', test1 ? 'PASSED' : 'FAILED');
  console.log('\n---\n');
  
  // Test 2: Signup with referral
  console.log('Test 2: Signup with referral code');
  const test2 = await testSignupWithReferral();
  console.log('Result:', test2 ? 'PASSED' : 'FAILED');
  
  console.log('\nAll tests completed');
  process.exit(test1 && test2 ? 0 : 1);
}

main().catch(console.error);