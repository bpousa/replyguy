-- Fix referral bonuses not being applied after email verification

-- 1. First check the current state
SELECT 'Checking pending referrals...' as status;
SELECT 
    r.id,
    r.referral_code,
    r.status,
    r.created_at,
    referrer.email as referrer_email,
    referred.email as referred_email,
    au_referred.email_confirmed_at as referred_confirmed_at
FROM public.referrals r
JOIN public.users referrer ON r.referrer_id = referrer.id
JOIN public.users referred ON r.referred_id = referred.id
JOIN auth.users au_referred ON referred.id = au_referred.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- 2. Create the complete_referral function if it doesn't exist
CREATE OR REPLACE FUNCTION public.complete_referral(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referral RECORD;
    v_referrer_tier TEXT;
    v_bonus_replies INT;
    v_bonus_research INT;
BEGIN
    -- Find pending referral for this user
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE referred_id = p_user_id
    AND status = 'pending'
    LIMIT 1;
    
    IF v_referral.id IS NULL THEN
        RETURN; -- No pending referral
    END IF;
    
    -- Get referrer's subscription tier
    SELECT s.plan_id INTO v_referrer_tier
    FROM public.users u
    JOIN public.subscriptions s ON u.id = s.user_id
    WHERE u.id = v_referral.referrer_id
    AND s.status = 'active'
    LIMIT 1;
    
    -- Set bonus amounts based on tier
    IF v_referrer_tier = 'free' THEN
        v_bonus_replies := 10;
        v_bonus_research := 1;
    ELSE
        v_bonus_replies := 10;
        v_bonus_research := 1;
    END IF;
    
    -- Update referrer's bonus counts
    UPDATE public.users
    SET 
        bonus_replies = COALESCE(bonus_replies, 0) + v_bonus_replies,
        bonus_research = COALESCE(bonus_research, 0) + v_bonus_research,
        updated_at = NOW()
    WHERE id = v_referral.referrer_id;
    
    -- Mark referral as completed
    UPDATE public.referrals
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE id = v_referral.id;
    
    RAISE NOTICE 'Referral completed for user % (referrer: %)', p_user_id, v_referral.referrer_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error completing referral: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the email verification handler
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if email was just confirmed (wasn't confirmed before)
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Complete any pending referral
        PERFORM public.complete_referral(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_email_verified();

-- 5. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add bonus_replies column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bonus_replies'
    ) THEN
        ALTER TABLE public.users ADD COLUMN bonus_replies INTEGER DEFAULT 0;
        RAISE NOTICE 'Added bonus_replies column';
    END IF;
    
    -- Add bonus_research column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bonus_research'
    ) THEN
        ALTER TABLE public.users ADD COLUMN bonus_research INTEGER DEFAULT 0;
        RAISE NOTICE 'Added bonus_research column';
    END IF;
END $$;

-- 6. Process any existing verified users with pending referrals
SELECT 'Processing existing verified users with pending referrals...' as status;
DO $$
DECLARE
    v_user RECORD;
    v_count INT := 0;
BEGIN
    FOR v_user IN 
        SELECT DISTINCT r.referred_id
        FROM public.referrals r
        JOIN auth.users au ON r.referred_id = au.id
        WHERE r.status = 'pending'
        AND au.email_confirmed_at IS NOT NULL
    LOOP
        PERFORM public.complete_referral(v_user.referred_id);
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Processed % pending referrals', v_count;
END $$;

-- 7. Specifically check antoni.mike+17@gmail.com's referral
SELECT 'Checking antoni.mike+17@gmail.com referral status...' as status;
SELECT 
    u.email,
    u.bonus_replies,
    u.bonus_research,
    COUNT(r.id) as total_referrals,
    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_referrals
FROM public.users u
LEFT JOIN public.referrals r ON u.id = r.referrer_id
WHERE u.email = 'antoni.mike+17@gmail.com'
GROUP BY u.id, u.email, u.bonus_replies, u.bonus_research;

-- 8. Check if antoni.mike+18@gmail.com is confirmed and their referral status
SELECT 'Checking antoni.mike+18@gmail.com status...' as status;
SELECT 
    u.email,
    au.email_confirmed_at,
    r.status as referral_status,
    r.referral_code,
    referrer.email as referred_by
FROM public.users u
JOIN auth.users au ON u.id = au.id
LEFT JOIN public.referrals r ON u.id = r.referred_id
LEFT JOIN public.users referrer ON r.referrer_id = referrer.id
WHERE u.email = 'antoni.mike+18@gmail.com';

-- 9. Final verification
SELECT 'Final status after fixes:' as status;
SELECT 
    'Total pending referrals' as metric,
    COUNT(*) as count
FROM public.referrals
WHERE status = 'pending'
UNION ALL
SELECT 
    'Total completed referrals' as metric,
    COUNT(*) as count
FROM public.referrals
WHERE status = 'completed';

SELECT 'Fix applied! Email verification trigger restored and pending referrals processed.' as message;