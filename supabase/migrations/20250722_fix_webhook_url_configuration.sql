-- Fix webhook URL configuration to use the correct domain
-- The app is hosted at replyguy.appendment.com, not replyguy.com

-- Update the app URL setting to the correct domain
ALTER DATABASE postgres SET app.settings.app_url = 'https://replyguy.appendment.com';

-- Add a comment to explain the configuration
COMMENT ON DATABASE postgres IS 'ReplyGuy production database - webhook URL: https://replyguy.appendment.com';

-- Verify the setting (this will be shown in migration output)
DO $$
BEGIN
  RAISE NOTICE 'app.settings.app_url is now set to: %', current_setting('app.settings.app_url', true);
END $$;