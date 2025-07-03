-- Fix missing email verification trigger for referral completion
-- This ensures referral bonuses are awarded when email is confirmed

-- 1. First check if the trigger exists
SELECT 
  'Checking for email verification trigger...' as status,
  EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_email_verified'
  ) as trigger_exists;

-- 2. Create or replace the handle_email_verified function
CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if email was just confirmed (transition from NULL to NOT NULL)
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    RAISE NOTICE 'Email verified for user: %, attempting to complete referral', NEW.id;
    
    BEGIN
      -- Try to complete referral
      PERFORM complete_referral(NEW.id);
      RAISE NOTICE 'Referral completion attempted for user: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail the trigger
      RAISE WARNING 'Error completing referral for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;

CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_email_verified();

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_email_verified() TO postgres, authenticated, anon, service_role;

-- 5. Verify the trigger was created
SELECT 
  'Trigger creation result:' as status,
  tgname as trigger_name,
  tgenabled as is_enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_email_verified';

-- 6. Process any existing users who have confirmed emails but incomplete referrals
-- This will catch any users who confirmed their email before the trigger was active
DO $$
DECLARE
  v_user RECORD;
  v_processed INTEGER := 0;
BEGIN
  RAISE NOTICE 'Processing existing confirmed users with pending referrals...';
  
  FOR v_user IN
    SELECT 
      au.id,
      au.email,
      au.email_confirmed_at,
      r.id as referral_id,
      r.status as referral_status
    FROM auth.users au
    JOIN referrals r ON r.referred_id = au.id
    WHERE au.email_confirmed_at IS NOT NULL
      AND r.status = 'pending'
  LOOP
    BEGIN
      PERFORM complete_referral(v_user.id);
      v_processed := v_processed + 1;
      RAISE NOTICE 'Processed referral for user: % (%)', v_user.id, v_user.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to process referral for user %: %', v_user.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processed % pending referrals for confirmed users', v_processed;
END $$;

-- 7. Verify the specific case mentioned by the user
SELECT 
  'Checking specific referral case:' as status,
  r.id,
  r.status,
  r.completed_at,
  u_referrer.email as referrer_email,
  u_referred.email as referred_email,
  au_referred.email_confirmed_at as referred_email_confirmed,
  rb.bonus_replies,
  rb.bonus_research,
  rb.total_referrals
FROM referrals r
JOIN users u_referrer ON r.referrer_id = u_referrer.id
JOIN users u_referred ON r.referred_id = u_referred.id
JOIN auth.users au_referred ON au_referred.id = u_referred.id
LEFT JOIN referral_bonuses rb ON rb.user_id = r.referrer_id
WHERE u_referrer.email = 'antoni.mike+17@gmail.com'
   OR u_referred.email = 'antoni.mike+18@gmail.com';

SELECT 'Email verification trigger has been fixed. Referral bonuses should now be awarded when users confirm their email.' as message;