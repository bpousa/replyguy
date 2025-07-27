-- Fix HTTP extension usage in webhook function
-- Use net.http_post instead of extensions.http_post

-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create a comprehensive webhook function using the correct HTTP extension
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
  -- Always proceed for any new user signup (removed metadata requirement)
  IF NEW.email IS NOT NULL THEN
    
    -- Use production URL - hardcoded for now to ensure it works
    v_app_url := 'https://replyguy.appendment.com';
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
      -- Try http_post (standard HTTP extension)
      SELECT http_post(
        v_webhook_url,
        v_request_body::text,
        'application/json'::text
      ) INTO request_id;
      
      -- Log successful webhook call
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
      VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
        jsonb_build_object(
          'request_id', request_id, 
          'webhook_url', v_webhook_url,
          'method', 'http_post',
          'headers', v_request_headers,
          'body_preview', LEFT(v_request_body::TEXT, 200)
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      
      -- If http_post fails, try net.http_post as fallback
      BEGIN
        SELECT net.http_post(
          url := v_webhook_url,
          headers := v_request_headers,
          body := v_request_body
        ) INTO request_id;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_sent_fallback', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object(
            'request_id', request_id, 
            'webhook_url', v_webhook_url,
            'method', 'net.http_post',
            'fallback_from', 'http_post'
          )
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log webhook failure with detailed error information
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message, metadata)
        VALUES ('webhook_failed', 'auth.users', NEW.id, NEW.email, false, SQLERRM,
          jsonb_build_object(
            'webhook_url', v_webhook_url,
            'methods_tried', ARRAY['http_post', 'net.http_post'],
            'original_error', v_error_message,
            'fallback_error', SQLERRM,
            'error_code', SQLSTATE,
            'headers', v_request_headers
          )
        );
      END;
    END;
  ELSE
    -- Log when webhook is skipped due to no email
    INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
    VALUES ('webhook_skipped', 'auth.users', NEW.id, NEW.email, true, 
      jsonb_build_object(
        'reason', 'no_email',
        'has_email', NEW.email IS NOT NULL
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