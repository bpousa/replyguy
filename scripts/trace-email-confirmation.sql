-- Trace what happens during email confirmation

-- 1. Temporarily modify handle_new_user to add logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE '[handle_new_user] Triggered for user %, email_confirmed_at: %', NEW.email, NEW.email_confirmed_at;
  
  -- Only process if user doesn't already exist
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    RAISE NOTICE '[handle_new_user] User already exists, skipping';
    RETURN NEW;
  END IF;
  
  -- IMPORTANT: Only create user if email is confirmed OR if this is initial creation
  -- During email confirmation, Supabase updates the existing auth.users row
  IF NEW.email_confirmed_at IS NULL AND OLD.id IS NOT NULL THEN
    RAISE NOTICE '[handle_new_user] This is an update without email confirmation, skipping';
    RETURN NEW;
  END IF;

  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '[handle_new_user] Created user in public.users';
  
  -- Create free subscription if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id AND status = 'active') THEN
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'free',
      'active',
      NOW(),
      NOW() + INTERVAL '30 days',
      NOW(),
      NOW()
    );
    RAISE NOTICE '[handle_new_user] Created subscription';
  END IF;
  
  -- Handle referral (simplified, won't fail)
  BEGIN
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
      RAISE NOTICE '[handle_new_user] Processing referral code: %', NEW.raw_user_meta_data->>'referral_code';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[handle_new_user] Referral error (ignored): %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  -- CRITICAL: Always return NEW
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Check current trigger configuration
SELECT 'Current trigger type:' as info;
SELECT tgname, 
       CASE tgtype::int & 1 WHEN 0 THEN 'STATEMENT' ELSE 'ROW' END as level,
       CASE tgtype::int & 2 WHEN 0 THEN 'AFTER' ELSE 'BEFORE' END as timing,
       CASE 
           WHEN tgtype::int & 4 = 4 THEN 'INSERT'
           WHEN tgtype::int & 8 = 8 THEN 'DELETE'  
           WHEN tgtype::int & 16 = 16 THEN 'UPDATE'
           WHEN tgtype::int & 20 = 20 THEN 'INSERT OR UPDATE'
           ELSE 'UNKNOWN'
       END as events
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 3. The issue might be that the trigger fires on INSERT but not UPDATE
-- Let's check if we need to change it
SELECT 'If the trigger is INSERT only, email confirmation (UPDATE) wont fire it' as warning;