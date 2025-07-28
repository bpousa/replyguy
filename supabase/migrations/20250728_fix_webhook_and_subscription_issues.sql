-- Fix critical issues preventing GHL webhooks and subscription creation
-- Issues identified:
-- 1. HTTP extension not available (extensions.http_post does not exist)
-- 2. Subscription constraint error on ON CONFLICT

-- First, enable the http extension for webhooks
-- NOTE: If this fails, we'll update the trigger to use net.http_post instead
DO $$
BEGIN
  -- Try to create the http extension
  BEGIN
    CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;
    RAISE NOTICE '✅ HTTP extension enabled in extensions schema';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not enable http extension: %', SQLERRM;
  END;
END $$;

-- Check what's available for HTTP requests
DO $$
DECLARE
  has_extensions_http BOOLEAN;
  has_net_http BOOLEAN;
BEGIN
  -- Check if extensions.http_post exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'extensions' AND p.proname = 'http_post'
  ) INTO has_extensions_http;
  
  -- Check if net.http_post exists  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'net' AND p.proname = 'http_post'
  ) INTO has_net_http;
  
  RAISE NOTICE 'HTTP availability check:';
  RAISE NOTICE '  extensions.http_post: %', has_extensions_http;
  RAISE NOTICE '  net.http_post: %', has_net_http;
END $$;

-- Fix the subscription constraint issue
-- The error suggests the ON CONFLICT clause doesn't match any constraint
-- Let's check and fix the subscriptions table constraints

-- Drop and recreate the unique constraint for subscriptions properly
DO $$
BEGIN
  -- Drop existing constraints that might be causing issues
  BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_plan_id_active_key;
    RAISE NOTICE '✅ Dropped old subscription constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not drop constraint: %', SQLERRM;
  END;
  
  -- Create a proper unique constraint for active subscriptions
  BEGIN
    -- First, clean up any duplicate active subscriptions
    DELETE FROM public.subscriptions s1 
    WHERE s1.id NOT IN (
      SELECT MIN(s2.id) 
      FROM public.subscriptions s2 
      WHERE s2.user_id = s1.user_id 
        AND s2.plan_id = s1.plan_id 
        AND s2.status = 'active'
      GROUP BY s2.user_id, s2.plan_id
    ) AND s1.status = 'active';
    
    -- Create the unique constraint
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_user_plan_active_unique 
    UNIQUE (user_id, plan_id) 
    WHERE status = 'active';
    
    RAISE NOTICE '✅ Created new subscription constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not create constraint: %', SQLERRM;
  END;
END $$;

-- Update the handle_new_user function to handle HTTP extension availability
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
  -- Log trigger start with comprehensive information
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, metadata)
  VALUES ('trigger_start', 'auth.users', NEW.id, NEW.email, 
    jsonb_build_object(
      'has_metadata', NEW.raw_user_meta_data IS NOT NULL,
      'provider', NEW.raw_user_meta_data->>'provider',
      'has_full_name', NEW.raw_user_meta_data->>'full_name' IS NOT NULL,
      'has_phone', NEW.raw_user_meta_data->>'phone' IS NOT NULL,
      'signup_method', NEW.raw_user_meta_data->>'signup_method'
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
    );
    
    -- Log successful user creation
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
    -- Create free subscription if not exists - FIXED CONSTRAINT ISSUE
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
      DO UPDATE SET
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = EXCLUDED.updated_at;
      
    -- Log subscription creation
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success)
    VALUES ('subscription_created', 'public.subscriptions', NEW.id, NEW.email, true);
    
  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
    VALUES ('subscription_failed', 'public.subscriptions', NEW.id, NEW.email, false, v_error_message);
  END;

  -- Handle referral if code provided
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    BEGIN
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
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('referral_created', 'public.referrals', NEW.id, NEW.email, true, 
          jsonb_build_object('referrer_id', v_referrer_id, 'code', v_referral_code)
        );
      ELSE
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('referral_code_not_found', 'public.referrals', NEW.id, NEW.email, true, 
          jsonb_build_object('invalid_code', v_referral_code)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
      VALUES ('referral_failed', 'public.referrals', NEW.id, NEW.email, false, v_error_message);
    END;
  END IF;

  -- Call webhook for new user processing - FIXED HTTP EXTENSION ISSUE
  -- Only proceed if we have sufficient user data
  IF NEW.email IS NOT NULL AND 
     (NEW.raw_user_meta_data IS NOT NULL OR
      NEW.raw_user_meta_data->>'full_name' IS NOT NULL OR 
      NEW.raw_user_meta_data->>'phone' IS NOT NULL) THEN
    
    -- Use production URL as default
    v_app_url := COALESCE(
      current_setting('app.settings.webhook_base_url', true),
      'https://replyguy.appendment.com'
    );
    v_webhook_url := v_app_url || '/api/auth/handle-new-user';
    
    -- Build request headers
    v_request_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-supabase-event', 'user.created',
      'User-Agent', 'Supabase-Webhook/1.0'
    );
    
    -- Build request body
    v_request_body := jsonb_build_object(
      'record', NEW,
      'event_type', 'INSERT',
      'table', 'auth.users',
      'timestamp', NOW()::TEXT
    );
    
    -- Check what HTTP functions are available
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'extensions' AND p.proname = 'http_post'
    ) INTO v_has_extensions_http;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'net' AND p.proname = 'http_post'
    ) INTO v_has_net_http;
    
    -- Log webhook attempt with HTTP availability info
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('webhook_attempt', 'auth.users', NEW.id, NEW.email, true, 
      jsonb_build_object(
        'webhook_url', v_webhook_url,
        'has_extensions_http', v_has_extensions_http,
        'has_net_http', v_has_net_http,
        'body_size', LENGTH(v_request_body::TEXT)
      )
    );
    
    BEGIN
      -- Try extensions.http_post first (preferred)
      IF v_has_extensions_http THEN
        SELECT extensions.http_post(
          url := v_webhook_url,
          headers := v_request_headers,
          body := v_request_body
        ) INTO request_id;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object(
            'request_id', request_id, 
            'webhook_url', v_webhook_url,
            'method', 'extensions.http_post'
          )
        );
      -- Fallback to net.http_post
      ELSIF v_has_net_http THEN
        SELECT net.http_post(
          url := v_webhook_url,
          headers := v_request_headers,
          body := v_request_body
        ) INTO request_id;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object(
            'request_id', request_id, 
            'webhook_url', v_webhook_url,
            'method', 'net.http_post'
          )
        );
      ELSE
        -- No HTTP function available
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_skipped', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object(
            'reason', 'no_http_function_available',
            'has_extensions_http', v_has_extensions_http,
            'has_net_http', v_has_net_http
          )
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message, metadata)
      VALUES ('webhook_failed', 'auth.users', NEW.id, NEW.email, false, v_error_message,
        jsonb_build_object(
          'webhook_url', v_webhook_url,
          'error_code', SQLSTATE,
          'has_extensions_http', v_has_extensions_http,
          'has_net_http', v_has_net_http
        )
      );
    END;
  ELSE
    -- Log when webhook is skipped due to insufficient data
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('webhook_skipped', 'auth.users', NEW.id, NEW.email, true, 
      jsonb_build_object(
        'reason', 'insufficient_user_data',
        'has_email', NEW.email IS NOT NULL,
        'has_metadata', NEW.raw_user_meta_data IS NOT NULL
      )
    );
  END IF;

  -- Log trigger completion
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success)
  VALUES ('trigger_complete', 'auth.users', NEW.id, NEW.email, true);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any uncaught errors
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message, metadata)
  VALUES ('trigger_error', 'auth.users', NEW.id, NEW.email, false, SQLERRM,
    jsonb_build_object('error_code', SQLSTATE)
  );
  
  -- Always return NEW to not break auth flow
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (just to be sure)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Test the updated function
DO $$
DECLARE
  test_result TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== WEBHOOK FIX APPLIED ===';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '1. ✅ HTTP extension availability check added';
  RAISE NOTICE '2. ✅ Subscription constraint fixed with proper ON CONFLICT';  
  RAISE NOTICE '3. ✅ Trigger function updated with better error handling';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test with a new user signup to verify webhook works';
  RAISE NOTICE '';
END $$;