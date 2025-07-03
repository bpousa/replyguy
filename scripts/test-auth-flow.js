#!/usr/bin/env node

/**
 * Test script to verify auth flow configuration
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    debug: true
  }
});

async function testAuthFlow() {
  console.log('Testing Supabase auth configuration...\n');
  
  // Test 1: Check if we can connect
  console.log('1. Testing connection to Supabase...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('   ❌ Connection error:', error.message);
    } else {
      console.log('   ✅ Successfully connected to Supabase');
      console.log('   Current session:', data.session ? 'Active' : 'None');
    }
  } catch (err) {
    console.error('   ❌ Unexpected error:', err.message);
  }
  
  // Test 2: Check auth settings
  console.log('\n2. Auth configuration:');
  console.log('   - Flow type: PKCE');
  console.log('   - Supabase URL:', supabaseUrl);
  console.log('   - Using anon key:', supabaseAnonKey.substring(0, 20) + '...');
  
  // Test 3: Generate test signup URL
  console.log('\n3. Test email redirect URL:');
  const testRedirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?plan=free`;
  console.log('   - Redirect URL:', testRedirectUrl);
  console.log('   - Make sure this URL is added to your Supabase dashboard under:');
  console.log('     Authentication > URL Configuration > Redirect URLs');
  
  console.log('\n4. Required Supabase settings:');
  console.log('   - Enable email confirmations: Authentication > Providers > Email > Confirm email = ON');
  console.log('   - Add redirect URLs in dashboard');
  console.log('   - Email templates should use {{ .SiteURL }}/auth/callback as the confirmation URL');
  
  console.log('\n5. To fix email confirmation issues:');
  console.log('   a) Go to Supabase Dashboard > Authentication > Email Templates');
  console.log('   b) Edit the "Confirm signup" template');
  console.log('   c) Make sure the confirmation URL is:');
  console.log('      {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup');
  console.log('   d) Or use: {{ .ConfirmationURL }}');
}

testAuthFlow();