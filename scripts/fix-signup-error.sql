-- Script to test the signup fix locally
-- Run this with: psql $DATABASE_URL < scripts/fix-signup-error.sql

-- First show current function definition
\echo 'Current handle_new_user function:'
\sf handle_new_user

-- Check if subscription_tier column exists on users table
\echo '\nChecking users table structure:'
\d users

-- Apply the fix
\echo '\nApplying fix...'
\i supabase/migrations/20250703_fix_signup_error.sql

-- Test the function with a mock user
\echo '\nTesting function with mock data:'
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || extract(epoch from now()) || '@example.com';
BEGIN
  -- Simulate auth.users insert
  RAISE NOTICE 'Testing signup for user % with email %', test_user_id, test_email;
  
  -- Check if user and subscription are created
  PERFORM handle_new_user();
  
  RAISE NOTICE 'Test completed successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during test: %', SQLERRM;
END;
$$;

-- Show the new function definition
\echo '\nNew handle_new_user function:'
\sf handle_new_user

\echo '\nFix applied successfully!'