-- Create function to call webhook on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Check if user has metadata to process
  IF NEW.raw_user_meta_data IS NOT NULL AND 
     (NEW.raw_user_meta_data->>'full_name' IS NOT NULL OR 
      NEW.raw_user_meta_data->>'phone' IS NOT NULL) THEN
    
    -- Call the webhook endpoint
    SELECT net.http_post(
      url := current_setting('app.settings.app_url') || '/api/auth/handle-new-user',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-supabase-event', 'user.created'
      ),
      body := jsonb_build_object(
        'record', NEW,
        'event_type', 'INSERT'
      )
    ) INTO request_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Set the app URL configuration (update this with your actual URL)
ALTER DATABASE postgres SET app.settings.app_url = 'https://replyguy.com';

-- For local development, you can override this:
-- ALTER DATABASE postgres SET app.settings.app_url = 'http://localhost:3000';