-- URGENT: Apply this migration in Supabase SQL Editor
-- This fixes the usage tracking to align with billing cycles

-- Step 1: Create the missing get_user_billing_period function
CREATE OR REPLACE FUNCTION get_user_billing_period(p_user_id UUID)
RETURNS TABLE(period_start DATE, period_end DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_billing_anchor_day INTEGER;
    v_current_date DATE;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Get the current date
    v_current_date := CURRENT_DATE;
    
    -- Get the billing anchor day from the user's active subscription
    SELECT s.billing_anchor_day INTO v_billing_anchor_day
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- If no billing anchor day found, default to 1st of month
    IF v_billing_anchor_day IS NULL THEN
        v_billing_anchor_day := 1;
    END IF;
    
    -- Calculate the billing period start date
    IF EXTRACT(DAY FROM v_current_date)::INTEGER >= v_billing_anchor_day THEN
        -- Current month's period
        v_period_start := DATE_TRUNC('month', v_current_date) + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    ELSE
        -- Previous month's period
        v_period_start := DATE_TRUNC('month', v_current_date - INTERVAL '1 month') + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    END IF;
    
    -- Handle edge case for billing anchor days > 28
    IF v_billing_anchor_day > 28 THEN
        -- Check if the calculated start date is valid
        IF EXTRACT(DAY FROM v_period_start)::INTEGER != v_billing_anchor_day THEN
            -- Use the last day of the month instead
            v_period_start := DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day';
        END IF;
    END IF;
    
    -- Calculate the period end date (day before next period starts)
    v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- Handle edge case for period end as well
    IF v_billing_anchor_day > 28 THEN
        -- Ensure end date doesn't skip months
        DECLARE
            v_next_month DATE;
            v_next_anchor_date DATE;
        BEGIN
            v_next_month := DATE_TRUNC('month', v_period_start + INTERVAL '1 month');
            v_next_anchor_date := v_next_month + (v_billing_anchor_day - 1) * INTERVAL '1 day';
            
            -- If next anchor date would be invalid, use last day of next month
            IF EXTRACT(DAY FROM v_next_anchor_date)::INTEGER != v_billing_anchor_day THEN
                v_next_anchor_date := v_next_month + INTERVAL '1 month' - INTERVAL '1 day';
            END IF;
            
            v_period_end := v_next_anchor_date - INTERVAL '1 day';
        END;
    END IF;
    
    RETURN QUERY SELECT v_period_start, v_period_end;
END;
$$;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_billing_period(UUID) TO authenticated;

-- Step 3: Add helpful comment
COMMENT ON FUNCTION get_user_billing_period(UUID) IS 
'Calculates the current billing period for a user based on their subscription billing_anchor_day. 
Falls back to calendar month (1st) if no active subscription. 
Handles edge cases for months with fewer days than the anchor day.';

-- Step 4: Fix test-business user's subscription (no Stripe ID)
UPDATE subscriptions 
SET billing_anchor_day = 1
WHERE user_id = (SELECT id FROM users WHERE email = 'test-business@replyguy.com')
AND stripe_subscription_id IS NULL
AND billing_anchor_day IS NULL;

-- Step 5: Test the function
DO $$
DECLARE
    v_user_id UUID;
    v_period RECORD;
    v_usage RECORD;
BEGIN
    -- Test with antoni.mike+15@gmail.com (has billing_anchor_day = 30)
    SELECT id INTO v_user_id FROM users WHERE email = 'antoni.mike+15@gmail.com' LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_period FROM get_user_billing_period(v_user_id);
        RAISE NOTICE 'antoni.mike+15@gmail.com billing period: % to %', v_period.period_start, v_period.period_end;
        
        SELECT * INTO v_usage FROM get_current_usage(v_user_id);
        RAISE NOTICE 'Current usage - Replies: %, Memes: %, Suggestions: %', 
            v_usage.total_replies, v_usage.total_memes, v_usage.total_suggestions;
    END IF;
    
    -- Test with test-business@replyguy.com
    SELECT id INTO v_user_id FROM users WHERE email = 'test-business@replyguy.com' LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_period FROM get_user_billing_period(v_user_id);
        RAISE NOTICE 'test-business@replyguy.com billing period: % to %', v_period.period_start, v_period.period_end;
        
        SELECT * INTO v_usage FROM get_current_usage(v_user_id);
        RAISE NOTICE 'Current usage - Replies: %, Memes: %, Suggestions: %', 
            v_usage.total_replies, v_usage.total_memes, v_usage.total_suggestions;
    END IF;
END $$;

-- Step 6: Verify the fix worked
SELECT 
    u.email,
    s.billing_anchor_day,
    bp.period_start,
    bp.period_end,
    cu.total_replies,
    cu.total_memes,
    cu.total_suggestions
FROM users u
JOIN subscriptions s ON s.user_id = u.id
CROSS JOIN LATERAL get_user_billing_period(u.id) bp
CROSS JOIN LATERAL get_current_usage(u.id) cu
WHERE u.email IN ('test-business@replyguy.com', 'antoni.mike+15@gmail.com')
AND s.status IN ('active', 'trialing');