-- Apply this SQL in Supabase SQL Editor as user mike
-- This implements the referral system

-- First, run the migration from the migrations folder
-- Copy and paste the contents of: /supabase/migrations/20250701_create_referral_system.sql

-- Then run these test queries to verify everything is working:

-- Test 1: Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('referrals', 'referral_bonuses');

-- Test 2: Check if functions were created
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_referral_code', 'complete_referral', 'get_user_limits');

-- Test 3: Generate a referral code for a test user (replace with actual user ID)
-- SELECT generate_referral_code('YOUR_USER_ID_HERE');

-- Test 4: Check the updated get_user_limits function includes bonuses
-- SELECT * FROM get_user_limits('YOUR_USER_ID_HERE');

-- Test 5: Verify triggers are in place
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('on_auth_user_created', 'on_email_verified');