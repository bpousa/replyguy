-- COMPREHENSIVE WEBHOOK TRIGGER FIX
-- This fixes both the subscription constraint issue and the restrictive trigger condition

-- First: Fix the subscription constraint issue
DO $$
BEGIN
  -- Drop existing constraint that's causing the ON CONFLICT error
  BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_plan_id_active_key;
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_plan_active_unique;
    RAISE NOTICE '✅ Dropped old subscription constraints';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not drop constraints: %', SQLERRM;
  END;
  
  -- Create proper unique index for active subscriptions
  BEGIN
    DROP INDEX IF EXISTS idx_subscriptions_user_plan_unique;
    CREATE UNIQUE INDEX idx_subscriptions_user_plan_unique 
    ON public.subscriptions (user_id, plan_id);
    
    RAISE NOTICE '✅ Created subscription unique index';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not create index: %', SQLERRM;
  END;
END $$;

-- Second: Apply the fixed trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_new_referral_code VARCHAR(20);
  request_id BIGINT;
  v_app_url TEXT;
  v_error_message TEXT;
  v_webhook_url TEXT;
  v_request_body JSONB;
  v_request_headers JSONB;
  v_has_extensions_http BOOLEAN;
  v_has_net_http BOOLEAN;
BEGIN
  -- Log trigger start
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, metadata)
  VALUES ('trigger_start', 'auth.users', NEW.id, NEW.email, 
    jsonb_build_object(
      'has_metadata', NEW.raw_user_meta_data IS NOT NULL,
      'provider', NEW.raw_user_meta_data->>'provider',
      'has_full_name', NEW.raw_user_meta_data->>'full_name' IS NOT NULL,
      'has_phone', NEW.raw_user_meta_data->>'phone' IS NOT NULL,
      'signup_method', NEW.raw_user_meta_data->>'signup_method',
      'selected_plan', NEW.raw_user_meta_data->>'selected_plan'
    )
  );

  -- Skip if user already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('user_exists_skip', 'auth.users', NEW.id, NEW.email, true, 
      jsonb_build_object('reason', 'User already exists in public.users')
    );
    RETURN NEW;
  END IF;

  BEGIN
    -- Generate referral code
    LOOP
      v_new_referral_code := UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FOR 6)
      );
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = v_new_referral_code);
    END LOOP;

    -- Create user profile
    INSERT INTO public.users (
      id, email, full_name, phone, sms_opt_in, referral_code, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'phone', COALESCE((NEW.raw_user_meta_data->>'sms_opt_in')::boolean, false),
      v_new_referral_code, NOW(), NOW()
    );
    
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('user_created', 'public.users', NEW.id, NEW.email, true, 
      jsonb_build_object('referral_code', v_new_referral_code)
    );

  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
    VALUES ('user_creation_failed', 'public.users', NEW.id, NEW.email, false, v_error_message);
  END;

  BEGIN
    -- Create subscription with FIXED constraint
    INSERT INTO public.subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at
    ) VALUES (
      NEW.id, 'free', 'active', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()
    ) ON CONFLICT (user_id, plan_id) DO UPDATE SET
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = EXCLUDED.updated_at;
      
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success)
    VALUES ('subscription_created', 'public.subscriptions', NEW.id, NEW.email, true);
    
  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
    VALUES ('subscription_failed', 'public.subscriptions', NEW.id, NEW.email, false, v_error_message);
  END;

  -- Handle referrals
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    BEGIN
      SELECT id INTO v_referrer_id FROM public.users WHERE referral_code = v_referral_code;
      
      IF v_referrer_id IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (v_referrer_id, NEW.id, 'pending') ON CONFLICT DO NOTHING;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('referral_created', 'public.referrals', NEW.id, NEW.email, true, 
          jsonb_build_object('referrer_id', v_referrer_id, 'code', v_referral_code)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
      VALUES ('referral_failed', 'public.referrals', NEW.id, NEW.email, false, v_error_message);
    END;
  END IF;

  -- CRITICAL FIX: Always call webhook for new users (removed restrictive condition)
  IF NEW.email IS NOT NULL THEN
    
    v_app_url := COALESCE(
      current_setting('app.settings.webhook_base_url', true),
      'https://replyguy.appendment.com'
    );
    v_webhook_url := v_app_url || '/api/auth/handle-new-user';
    
    v_request_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-supabase-event', 'user.created',
      'User-Agent', 'Supabase-Webhook/1.0'
    );
    
    v_request_body := jsonb_build_object(
      'record', NEW, 'event_type', 'INSERT', 'table', 'auth.users', 'timestamp', NOW()::TEXT
    );
    
    -- Check HTTP function availability
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'extensions' AND p.proname = 'http_post'
    ) INTO v_has_extensions_http;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'net' AND p.proname = 'http_post'
    ) INTO v_has_net_http;
    
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('webhook_attempt', 'auth.users', NEW.id, NEW.email, true, 
      jsonb_build_object(
        'webhook_url', v_webhook_url, 'has_extensions_http', v_has_extensions_http,
        'has_net_http', v_has_net_http, 'body_size', LENGTH(v_request_body::TEXT),
        'condition_fix', 'ALWAYS_WEBHOOK_FOR_EMAIL_USERS'
      )
    );
    
    BEGIN
      IF v_has_extensions_http THEN
        SELECT extensions.http_post(
          url := v_webhook_url, headers := v_request_headers, body := v_request_body
        ) INTO request_id;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object('request_id', request_id, 'webhook_url', v_webhook_url, 'method', 'extensions.http_post')
        );
      ELSIF v_has_net_http THEN
        SELECT net.http_post(
          url := v_webhook_url, headers := v_request_headers, body := v_request_body
        ) INTO request_id;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object('request_id', request_id, 'webhook_url', v_webhook_url, 'method', 'net.http_post')
        );
      ELSE
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_skipped', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object('reason', 'no_http_function_available')
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message, metadata)
      VALUES ('webhook_failed', 'auth.users', NEW.id, NEW.email, false, v_error_message,
        jsonb_build_object('webhook_url', v_webhook_url, 'error_detail', v_error_message)
      );
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  v_error_message := SQLERRM;
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
  VALUES ('function_error', 'auth.users', NEW.id, NEW.email, false, v_error_message);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Log the fix
INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
VALUES (
  'function_updated', 'auth.users', '00000000-0000-0000-0000-000000000000'::uuid, 
  'system@replyguy.com', true, 
  jsonb_build_object(
    'fix_applied', 'COMPREHENSIVE_WEBHOOK_TRIGGER_FIX',
    'date', NOW()::TEXT,
    'description', 'Fixed subscription constraint and removed restrictive webhook condition - now ALL email users get webhooks'
  )
);

-- Success messages
RAISE NOTICE '';
RAISE NOTICE '=== COMPREHENSIVE WEBHOOK FIX APPLIED ===';
RAISE NOTICE '✅ Fixed subscription constraint issue';
RAISE NOTICE '✅ Removed restrictive webhook condition';
RAISE NOTICE '✅ Now webhook fires for ALL users with email';
RAISE NOTICE '✅ Should eliminate webhook duplication';
RAISE NOTICE '✅ Trial tokens should now be generated properly';
RAISE NOTICE '';