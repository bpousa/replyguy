-- Create the missing get_user_billing_period function
-- This function calculates the current billing period for a user based on their subscription

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
    -- If current day >= billing anchor day, we're in the current month's period
    -- If current day < billing anchor day, we're still in the previous month's period
    IF EXTRACT(DAY FROM v_current_date)::INTEGER >= v_billing_anchor_day THEN
        -- Current month's period
        v_period_start := DATE_TRUNC('month', v_current_date) + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    ELSE
        -- Previous month's period
        v_period_start := DATE_TRUNC('month', v_current_date - INTERVAL '1 month') + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    END IF;
    
    -- Handle edge case for billing anchor days > 28
    -- If the billing anchor day doesn't exist in a month (e.g., 31st in February), 
    -- use the last day of that month
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

-- Add comment explaining the function
COMMENT ON FUNCTION get_user_billing_period(UUID) IS 
'Calculates the current billing period for a user based on their subscription billing_anchor_day. 
Falls back to calendar month (1st) if no active subscription. 
Handles edge cases for months with fewer days than the anchor day.';

-- Test the function with some examples
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Log some test cases
    RAISE NOTICE 'Testing get_user_billing_period function...';
    
    -- Note: These are just to verify the function compiles correctly
    -- Actual testing would need real user IDs
    RAISE NOTICE 'Function created successfully';
END $$;