-- Add logging to track trigger execution and failures
-- This will help diagnose future issues

-- Create logging table
CREATE TABLE IF NOT EXISTS public.trigger_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trigger_logs_created_at ON public.trigger_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trigger_logs_user_id ON public.trigger_logs(user_id);

-- Grant permissions
GRANT ALL ON public.trigger_logs TO postgres, service_role;
GRANT USAGE ON SEQUENCE public.trigger_logs_id_seq TO postgres, service_role;

-- Update handle_new_user function to include logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_new_referral_code VARCHAR(20);
  request_id bigint;
  v_app_url TEXT;
  v_error_message TEXT;
BEGIN
  -- Log trigger start
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, metadata)
  VALUES ('trigger_start', 'auth.users', NEW.id, NEW.email, 
    jsonb_build_object(
      'has_metadata', NEW.raw_user_meta_data IS NOT NULL,
      'provider', NEW.raw_user_meta_data->>'provider'
    )
  );

  -- Skip if user already exists
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
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
      VALUES ('referral_failed', 'public.referrals', NEW.id, NEW.email, false, v_error_message);
    END;
  END IF;

  -- Call webhook for new user processing
  IF NEW.raw_user_meta_data IS NOT NULL AND 
     (NEW.raw_user_meta_data->>'full_name' IS NOT NULL OR 
      NEW.raw_user_meta_data->>'phone' IS NOT NULL) THEN
    
    v_app_url := 'https://replyguy.appendment.com';
    
    BEGIN
      -- Try extensions.http_post first
      SELECT extensions.http_post(
        url := v_app_url || '/api/auth/handle-new-user',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-supabase-event', 'user.created'
        ),
        body := jsonb_build_object(
          'record', NEW,
          'event_type', 'INSERT'
        )
      ) INTO request_id;
      
      INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
      VALUES ('webhook_sent', 'auth.users', NEW.id, NEW.email, true, 
        jsonb_build_object('request_id', request_id, 'url', v_app_url)
      );
      
    EXCEPTION WHEN OTHERS THEN
      v_error_message := SQLERRM;
      -- Try net.http_post as fallback
      BEGIN
        SELECT net.http_post(
          url := v_app_url || '/api/auth/handle-new-user',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-supabase-event', 'user.created'
          ),
          body := jsonb_build_object(
            'record', NEW,
            'event_type', 'INSERT'
          )
        ) INTO request_id;
        
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, metadata)
        VALUES ('webhook_sent_fallback', 'auth.users', NEW.id, NEW.email, true, 
          jsonb_build_object('request_id', request_id, 'url', v_app_url, 'method', 'net.http_post')
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message, metadata)
        VALUES ('webhook_failed', 'auth.users', NEW.id, NEW.email, false, SQLERRM,
          jsonb_build_object('original_error', v_error_message, 'url', v_app_url)
        );
      END;
    END;
  END IF;

  -- Log trigger completion
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success)
  VALUES ('trigger_complete', 'auth.users', NEW.id, NEW.email, true);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any uncaught errors
  INSERT INTO public.trigger_logs (event_type, table_name, user_id, user_email, success, error_message)
  VALUES ('trigger_error', 'auth.users', NEW.id, NEW.email, false, SQLERRM);
  
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

-- Add RLS policy for trigger_logs (service role only)
ALTER TABLE public.trigger_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage trigger logs"
  ON public.trigger_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create a view for recent trigger activity
CREATE OR REPLACE VIEW public.recent_trigger_activity AS
SELECT 
  created_at,
  event_type,
  user_email,
  success,
  error_message,
  metadata
FROM public.trigger_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Grant read access to the view
GRANT SELECT ON public.recent_trigger_activity TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TRIGGER LOGGING ENABLED ===';
  RAISE NOTICE 'You can now monitor trigger execution with:';
  RAISE NOTICE '  SELECT * FROM public.trigger_logs ORDER BY created_at DESC;';
  RAISE NOTICE '  SELECT * FROM public.recent_trigger_activity;';
  RAISE NOTICE '';
END $$;