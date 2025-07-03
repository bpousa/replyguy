const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testEmailConfirmationFlow() {
  console.log('=== Testing Email Confirmation Flow ===\n');
  
  try {
    // 1. Check current auth configuration
    console.log('1. Checking Supabase auth configuration...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1
    });
    
    if (listError) {
      console.error('Error accessing admin API:', listError);
      return;
    }
    
    console.log('✓ Admin API accessible\n');
    
    // 2. Create a test user
    const testEmail = `test-${Date.now()}@example.com`;
    console.log(`2. Creating test user: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: false,
      user_metadata: { selected_plan: 'growth' }
    });
    
    if (signUpError) {
      console.error('Error creating test user:', signUpError);
      return;
    }
    
    console.log('✓ Test user created:', signUpData.user.id);
    
    // 3. Generate a confirmation link
    console.log('\n3. Generating confirmation link...');
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: testEmail,
    });
    
    if (linkError) {
      console.error('Error generating link:', linkError);
      // Clean up
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return;
    }
    
    console.log('✓ Confirmation link generated');
    console.log('Link structure:', {
      hasToken: !!linkData.properties.hashed_token,
      redirectTo: linkData.properties.redirect_to,
      verificationType: linkData.properties.verification_type
    });
    
    // 4. Analyze the redirect flow
    console.log('\n4. Email confirmation flow:');
    console.log('   a) User clicks email link → Supabase /auth/v1/verify');
    console.log('   b) Supabase verifies token internally');
    console.log('   c) Supabase redirects to /auth/callback (without parameters)');
    console.log('   d) Our /auth/callback checks for existing session');
    console.log('   e) If session found → redirect to checkout/dashboard');
    console.log('   f) If no session → redirect to /auth/verify with from=email-callback');
    console.log('   g) /auth/verify polls for session establishment');
    
    // 5. Check if user can be confirmed
    console.log('\n5. Confirming user email...');
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      signUpData.user.id,
      { email_confirmed_at: new Date().toISOString() }
    );
    
    if (confirmError) {
      console.error('Error confirming email:', confirmError);
    } else {
      console.log('✓ User email confirmed successfully');
    }
    
    // 6. Clean up
    console.log('\n6. Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(signUpData.user.id);
    
    if (deleteError) {
      console.error('Error deleting test user:', deleteError);
    } else {
      console.log('✓ Test user deleted');
    }
    
    console.log('\n=== Email Confirmation Flow Test Complete ===');
    console.log('\nKey fixes implemented:');
    console.log('1. auth/callback now checks for existing sessions when no parameters');
    console.log('2. auth/verify has enhanced polling for email-callback redirects');
    console.log('3. Added "from=email-callback" marker for better flow tracking');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testEmailConfirmationFlow();