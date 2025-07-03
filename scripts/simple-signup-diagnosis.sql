-- Simple step-by-step diagnosis

-- STEP 1: Check if free plan exists (MOST LIKELY ISSUE)
SELECT 'STEP 1: Checking free plan' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = 'free') 
        THEN '✓ SUCCESS: Free plan exists'
        ELSE '✗ ERROR: Free plan is MISSING! This is causing the signup error.'
    END as result;

-- Show what plans DO exist
SELECT 'Existing plans:' as info;
SELECT id, name, reply_limit FROM public.subscription_plans ORDER BY id;

-- STEP 2: Check users table columns
SELECT 'STEP 2: Checking users table structure' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- STEP 3: Check if referrals table exists
SELECT 'STEP 3: Checking referrals table' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') 
        THEN '✓ SUCCESS: Referrals table exists'
        ELSE '✗ ERROR: Referrals table is MISSING!'
    END as result;

-- STEP 4: Quick fix if free plan is missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = 'free') THEN
        INSERT INTO public.subscription_plans (
            id, name, description,
            price_monthly, price_yearly,
            reply_limit, suggestion_limit, meme_limit, research_limit,
            max_tweet_length, max_response_idea_length, max_reply_length,
            enable_long_replies, enable_style_matching, enable_perplexity_guidance,
            enable_memes, enable_write_like_me,
            created_at, updated_at
        ) VALUES (
            'free', 'Free', 'Get started with ReplyGuy',
            0, 0,
            10, 0, 0, 1,
            280, 200, 280,
            false, false, false,
            false, false,
            NOW(), NOW()
        );
        
        RAISE NOTICE '✓ FIXED: Created missing free plan';
    ELSE
        RAISE NOTICE '✓ Free plan already exists';
    END IF;
END $$;

-- STEP 5: Create referrals table if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') THEN
        CREATE TABLE public.referrals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            referral_code VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ,
            UNIQUE(referred_id)
        );
        
        CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
        CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
        CREATE INDEX idx_referrals_status ON public.referrals(status);
        
        RAISE NOTICE '✓ FIXED: Created missing referrals table';
    ELSE
        RAISE NOTICE '✓ Referrals table already exists';
    END IF;
END $$;

-- STEP 6: Test signup after fixes
SELECT 'STEP 6: Testing signup process after fixes' as step;
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now())::text || '@example.com';
BEGIN
    -- Try the full signup process
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (test_user_id, test_email, 'Test User', NOW(), NOW());
    
    INSERT INTO public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end,
        created_at, updated_at
    ) VALUES (
        test_user_id, 'free', 'active',
        NOW(), NOW() + INTERVAL '30 days',
        NOW(), NOW()
    );
    
    -- Clean up
    DELETE FROM public.subscriptions WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    
    RAISE NOTICE '✓ SUCCESS: Signup process works correctly now!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERROR: Signup still failing - %', SQLERRM;
    -- Try cleanup
    DELETE FROM public.subscriptions WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
END $$;

-- Final check
SELECT 'FINAL STATUS:' as status;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = 'free') 
        THEN '✓ Free plan exists - signup should work now!'
        ELSE '✗ Free plan still missing - signup will fail!'
    END as result;