-- Comprehensive fix for webhook integration with Go High Level
-- This migration addresses URL configuration, HTTP extension usage, and logging

-- First, ensure we have the trigger_logs table for debugging
CREATE TABLE IF NOT EXISTS public.trigger_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  user_id UUID,
  user_email VARCHAR(255),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a comprehensive webhook function with better error handling and logging
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

  -- Call webhook for new user processing - MAIN WEBHOOK LOGIC
  -- Only proceed if we have sufficient user data (email is always required, plus additional metadata)
  IF NEW.email IS NOT NULL AND 
     (NEW.raw_user_meta_data IS NOT NULL OR
      NEW.raw_user_meta_data->>'full_name' IS NOT NULL OR 
      NEW.raw_user_meta_data->>'phone' IS NOT NULL) THEN
    
    -- Use production URL as default, but make it configurable
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
    
    -- Log webhook attempt with full details
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('webhook_attempt', 'auth.users', NEW.id, NEW.email, true, 
      jsonb_build_object(
        'webhook_url', v_webhook_url,
        'app_url', v_app_url,
        'has_headers', v_request_headers IS NOT NULL,
        'has_body', v_request_body IS NOT NULL,
        'body_size', LENGTH(v_request_body::TEXT)
      )
    );
    
    BEGIN
      -- Use extensions.http_post (the correct schema for Supabase)
      SELECT extensions.http_post(
        url := v_webhook_url,
        headers := v_request_headers,
        body := v_request_body
      ) INTO request_id;
      
      -- Log successful webhook call
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
      VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
        jsonb_build_object(
          'request_id', request_id, 
          'webhook_url', v_webhook_url,
          'method', 'extensions.http_post',
          'headers', v_request_headers,
          'body_preview', LEFT(v_request_body::TEXT, 200)
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      -- Log webhook failure with detailed error information
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message, metadata)
      VALUES ('webhook_failed', 'auth.users', NEW.id, NEW.email, false, v_error_message,
        jsonb_build_object(
          'webhook_url', v_webhook_url,
          'method', 'extensions.http_post',
          'error_code', SQLSTATE,
          'headers', v_request_headers
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
        'has_metadata', NEW.raw_user_meta_data IS NOT NULL,
        'metadata_keys', CASE 
          WHEN NEW.raw_user_meta_data IS NOT NULL 
          THEN (SELECT array_agg(key) FROM jsonb_each_text(NEW.raw_user_meta_data))
          ELSE NULL
        END
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

-- Recreate trigger to use updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
GRANT SELECT, INSERT ON TABLE public.trigger_logs TO postgres, service_role;

-- Set up configuration for webhook URL (can be overridden if needed)
ALTER DATABASE postgres SET app.settings.webhook_base_url = 'https://replyguy.appendment.com';

-- Create a function to test the webhook manually
CREATE OR REPLACE FUNCTION public.test_webhook_connection(test_url TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  test_request_id BIGINT;
  v_test_url TEXT;
  v_result JSONB;
BEGIN
  v_test_url := COALESCE(test_url, 'https://replyguy.appendment.com/api/ghl/test-webhook');
  
  BEGIN
    -- Test if extensions.http_post works
    SELECT extensions.http_post(
      url := v_test_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-supabase-event', 'webhook.test'
      ),
      body := jsonb_build_object(
        'test', true,
        'source', 'manual_test',
        'timestamp', NOW()::TEXT,
        'message', 'Testing webhook connectivity from Supabase'
      )
    ) INTO test_request_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'request_id', test_request_id,
      'url', v_test_url,
      'method', 'extensions.http_post',
      'message', 'Webhook test successful'
    );
    
  EXCEPTION WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'url', v_test_url,
      'method', 'extensions.http_post',
      'message', 'Webhook test failed'
    );
  END;
  
  -- Log the test result
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
  VALUES ('webhook_test', 'manual', NULL, NULL, (v_result->>'success')::boolean, v_result);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the webhook functionality immediately
DO $$
DECLARE
  test_result JSONB;
BEGIN
  SELECT public.test_webhook_connection() INTO test_result;
  RAISE NOTICE 'Webhook test result: %', test_result;
END $$;