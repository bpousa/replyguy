-- Fix handle_new_user function to properly create users with all metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_new_referral_code VARCHAR(20);
  request_id bigint;
BEGIN
  -- Skip if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Generate a unique referral code
  LOOP
    v_new_referral_code := UPPER(
      SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FOR 6)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = v_new_referral_code);
  END LOOP;

  -- Create user profile with all metadata
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    sms_opt_in,
    referral_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'sms_opt_in')::boolean, false),
    v_new_referral_code,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create free subscription if not exists
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
  ) ON CONFLICT (user_id, plan_id) 
    WHERE status = 'active' 
    DO NOTHING;

  -- Handle referral if code provided
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id 
    FROM public.users 
    WHERE referral_code = v_referral_code;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Create referral record
      INSERT INTO public.referrals (
        referrer_id,
        referred_id,
        status
      ) VALUES (
        v_referrer_id,
        NEW.id,
        'pending'
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Call webhook for new user processing (if needed)
  IF NEW.raw_user_meta_data IS NOT NULL AND 
     (NEW.raw_user_meta_data->>'full_name' IS NOT NULL OR 
      NEW.raw_user_meta_data->>'phone' IS NOT NULL) THEN
    
    -- Call the webhook endpoint (non-blocking)
    BEGIN
      SELECT net.http_post(
        url := COALESCE(
          current_setting('app.settings.app_url', true),
          'https://replyguy.appendment.com'
        ) || '/api/auth/handle-new-user',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-supabase-event', 'user.created'
        ),
        body := jsonb_build_object(
          'record', NEW,
          'event_type', 'INSERT'
        )
      ) INTO request_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Failed to call webhook: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but always return NEW to not break auth flow
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users that might be missing data
-- This will update users who have metadata but missing fields
UPDATE public.users u
SET 
  full_name = COALESCE(u.full_name, a.raw_user_meta_data->>'full_name', ''),
  phone = COALESCE(u.phone, a.raw_user_meta_data->>'phone'),
  sms_opt_in = COALESCE(u.sms_opt_in, (a.raw_user_meta_data->>'sms_opt_in')::boolean, false),
  updated_at = NOW()
FROM auth.users a
WHERE u.id = a.id
  AND a.raw_user_meta_data IS NOT NULL
  AND (
    (u.full_name IS NULL OR u.full_name = '') AND a.raw_user_meta_data->>'full_name' IS NOT NULL
    OR u.phone IS NULL AND a.raw_user_meta_data->>'phone' IS NOT NULL
  );