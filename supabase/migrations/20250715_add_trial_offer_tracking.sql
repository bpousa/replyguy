-- Add tracking for trial offer shown to users
-- This prevents showing the $1 trial offer multiple times

-- Add column to track if user has seen the trial offer
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS has_seen_trial_offer BOOLEAN DEFAULT FALSE;

-- Add timestamp for when they saw the offer (for analytics)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS trial_offer_shown_at TIMESTAMPTZ;

-- Add which offer they accepted (if any)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS trial_offer_accepted VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN public.users.has_seen_trial_offer IS 'Whether the user has been shown the $1 trial offer on first login';
COMMENT ON COLUMN public.users.trial_offer_shown_at IS 'Timestamp when the trial offer was first shown';
COMMENT ON COLUMN public.users.trial_offer_accepted IS 'Which trial offer was accepted: growth_trial, professional_trial, or null if declined';

-- Create an index for faster queries on free users who haven't seen the offer
CREATE INDEX IF NOT EXISTS idx_users_trial_offer_eligibility 
ON public.users(has_seen_trial_offer) 
WHERE has_seen_trial_offer = FALSE;