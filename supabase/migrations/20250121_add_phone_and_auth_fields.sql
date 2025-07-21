-- Add phone and SMS opt-in fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_opt_in_date TIMESTAMPTZ;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;

-- Add check constraint for phone format (E.164 format)
ALTER TABLE public.users 
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');

-- Comment on columns
COMMENT ON COLUMN public.users.phone IS 'User phone number in E.164 format';
COMMENT ON COLUMN public.users.phone_verified IS 'Whether the phone number has been verified';
COMMENT ON COLUMN public.users.sms_opt_in IS 'User has opted in to receive SMS growth tips';
COMMENT ON COLUMN public.users.sms_opt_in_date IS 'Timestamp when user opted in for SMS';