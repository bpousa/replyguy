-- Check current trigger function
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname = 'handle_new_user'
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if trigger exists
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS is_enabled,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' 
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');

-- DISABLE THE AUTO-SUBSCRIPTION TRIGGER!
-- This is the fix - we don't want automatic subscriptions for free users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a simpler trigger that just creates the user record without subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
BEGIN
  -- Get referral code from metadata if provided
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- If referral code provided, find the referrer
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = v_referral_code
    LIMIT 1;
  END IF;
  
  -- Insert user profile WITHOUT automatic subscription
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    referred_by,
    created_at,
    updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_referrer_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- NO AUTOMATIC SUBSCRIPTION CREATION!
  -- Users start with NO subscription until they purchase one
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Clean up any auto-created subscriptions for recent test users
DELETE FROM subscriptions 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email LIKE 'antoni.mike+%@gmail.com'
  AND created_at > NOW() - INTERVAL '1 day'
);