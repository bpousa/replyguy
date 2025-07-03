-- Fix email confirmation by ensuring trigger fires on both INSERT and UPDATE

-- 1. Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create a new trigger that fires on INSERT OR UPDATE
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. But we need to modify handle_new_user to handle both cases properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- For UPDATE operations, only proceed if email was just confirmed
  IF TG_OP = 'UPDATE' THEN
    -- Check if email confirmation just happened
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
      RAISE NOTICE '[handle_new_user] Email just confirmed for user %', NEW.email;
    ELSE
      -- Not an email confirmation update, skip
      RETURN NEW;
    END IF;
  END IF;
  
  -- Check if user already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- User exists, just ensure subscription exists
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
    END IF;
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
  
  -- Create free subscription
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
  END IF;
  
  -- Handle referral if provided
  BEGIN
    DECLARE
      v_referral_code VARCHAR(20);
      v_referrer_id UUID;
    BEGIN
      v_referral_code := NEW.raw_user_meta_data->>'referral_code';
      
      IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
        SELECT id INTO v_referrer_id
        FROM public.users
        WHERE referral_code = v_referral_code
        LIMIT 1;
        
        IF v_referrer_id IS NOT NULL THEN
          UPDATE public.users 
          SET referred_by = v_referrer_id 
          WHERE id = NEW.id;
          
          INSERT INTO public.referrals (
            referrer_id,
            referred_id,
            referral_code,
            status,
            created_at
          ) VALUES (
            v_referrer_id,
            NEW.id,
            v_referral_code,
            'pending',
            NOW()
          ) ON CONFLICT (referred_id) DO NOTHING;
        END IF;
      END IF;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Referral processing error: %', SQLERRM;
  END;
  
  -- Generate referral code
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Referral code generation error: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verify the trigger now handles INSERT OR UPDATE
SELECT 'Trigger configuration after fix:' as status;
SELECT tgname, 
       CASE 
           WHEN tgtype::int & 4 = 4 AND tgtype::int & 16 = 16 THEN 'INSERT OR UPDATE'
           WHEN tgtype::int & 4 = 4 THEN 'INSERT ONLY'
           WHEN tgtype::int & 16 = 16 THEN 'UPDATE ONLY'
           ELSE 'OTHER'
       END as trigger_events
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 5. Test with a recent unconfirmed user
DO $$
DECLARE
    test_user RECORD;
BEGIN
    -- Find a recent unconfirmed user
    SELECT * INTO test_user
    FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at > NOW() - INTERVAL '2 hours'
    LIMIT 1;
    
    IF test_user.id IS NOT NULL THEN
        RAISE NOTICE 'Testing email confirmation for user: %', test_user.email;
        
        -- Check if they exist in public.users
        IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user.id) THEN
            RAISE NOTICE 'User exists in public.users';
        ELSE
            RAISE NOTICE 'User MISSING from public.users - this is the problem!';
        END IF;
        
        -- Check subscription
        IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = test_user.id) THEN
            RAISE NOTICE 'User has subscription';
        ELSE
            RAISE NOTICE 'User MISSING subscription';
        END IF;
    END IF;
END $$;

SELECT 'Email confirmation trigger fixed - should now work properly' as message;