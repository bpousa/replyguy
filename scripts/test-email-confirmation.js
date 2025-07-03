const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailConfirmation() {
  console.log('Testing email confirmation settings...\n');
  
  // Create a test email with timestamp
  const timestamp = Date.now();
  const testEmail = `test-confirm-${timestamp}@example.com`;
  
  console.log(`Attempting to sign up with: ${testEmail}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123',
      options: {
        emailRedirectTo: `http://localhost:3000/auth/callback`,
        data: {
          selected_plan: 'free',
          referral_code: ''
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error);
      return;
    }
    
    console.log('\nSignup response:');
    console.log('- User created:', !!data.user);
    console.log('- User ID:', data.user?.id);
    console.log('- Email:', data.user?.email);
    console.log('- Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('- Confirmation sent at:', data.user?.confirmation_sent_at || 'Not sent');
    console.log('- Session created:', !!data.session);
    
    if (!data.user?.email_confirmed_at && data.user?.confirmation_sent_at) {
      console.log('\n✅ Email confirmation is working correctly!');
      console.log('A confirmation email should have been sent to:', testEmail);
    } else if (data.user?.email_confirmed_at) {
      console.log('\n⚠️  User was auto-confirmed (likely in development mode)');
    } else {
      console.log('\n❌ Email confirmation may not be working properly');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testEmailConfirmation();