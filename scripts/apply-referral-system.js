#!/usr/bin/env node

/**
 * Script to apply the referral system migration
 * This script applies the SQL migration using Supabase JS SDK
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  console.log('🚀 Applying referral system migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250701_create_referral_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('⚠️  This migration needs to be applied via Supabase SQL Editor\n');
    
    // Test current state
    console.log('🔍 Checking current database state...\n');
    
    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['referrals', 'referral_bonuses']);
      
    if (tables && tables.length > 0) {
      console.log('✅ Found existing tables:', tables.map(t => t.table_name).join(', '));
      console.log('⚠️  Migration may have already been applied!');
    } else {
      console.log('ℹ️  Referral tables not found - migration needs to be applied');
    }
    
    // Check if get_user_billing_period function exists
    console.log('\n🔍 Checking for get_user_billing_period function...');
    
    try {
      // Try to call the function with a test UUID
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const { data: billingPeriod, error: funcError } = await supabase
        .rpc('get_user_billing_period', { p_user_id: testUserId });
      
      if (funcError && funcError.message.includes('does not exist')) {
        console.log('❌ get_user_billing_period function not found');
        console.log('   You need to apply: /scripts/apply-billing-period-fix.sql first!');
      } else {
        console.log('✅ get_user_billing_period function exists');
      }
    } catch (error) {
      console.log('❌ Could not check for get_user_billing_period function');
    }
    
    // Instructions for manual application
    console.log('\n📋 To apply the referral system migration:\n');
    console.log('1. Go to your Supabase dashboard: https://app.supabase.com');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Make sure you are logged in as user "mike"');
    console.log('4. Copy and paste the SQL from:');
    console.log('   /supabase/migrations/20250701_create_referral_system.sql');
    console.log('5. Click "Run" to execute the migration\n');
    
    console.log('📝 The migration will:');
    console.log('   - Create referrals and referral_bonuses tables');
    console.log('   - Add referral tracking functions');
    console.log('   - Update get_user_limits to include bonuses for ALL tiers');
    console.log('   - Set up triggers for automatic referral code generation');
    console.log('   - Allow paid users to refer up to 10 friends (100 bonus replies)');
    console.log('   - Allow free users to refer up to 4 friends (40 bonus replies)\n');
    
    // Test if we can check existing user referral codes
    console.log('🔍 Checking for users with referral codes...');
    
    const { data: usersWithCodes, error: usersError } = await supabase
      .from('users')
      .select('id, email, referral_code')
      .not('referral_code', 'is', null)
      .limit(5);
      
    if (usersWithCodes && usersWithCodes.length > 0) {
      console.log(`\n✅ Found ${usersWithCodes.length} users with referral codes:`);
      usersWithCodes.forEach(user => {
        console.log(`   ${user.email}: ${user.referral_code}`);
      });
    } else {
      console.log('\nℹ️  No users have referral codes yet');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
applyMigration();