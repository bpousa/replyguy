-- Add profile completion tracking to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_profile_completed 
ON public.users(profile_completed_at) 
WHERE profile_completed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.profile_completed_at IS 'Timestamp when user completed their profile information via the onboarding modal';

-- Update existing users who already have complete profiles
-- (users with both full_name and phone are considered complete)
UPDATE public.users 
SET profile_completed_at = created_at 
WHERE profile_completed_at IS NULL 
  AND full_name IS NOT NULL 
  AND full_name != '' 
  AND phone IS NOT NULL 
  AND phone != '';

-- Update users who signed up via email form (they provided name during signup)
UPDATE public.users 
SET profile_completed_at = created_at 
WHERE profile_completed_at IS NULL 
  AND full_name IS NOT NULL 
  AND full_name != ''
  AND created_at > NOW() - INTERVAL '7 days'; -- Recent signups likely from email form