-- Fix missing features for plans
-- Ensure enable_perplexity_guidance and enable_memes are properly set

-- X Business should have all features enabled
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = true,
    enable_memes = true
WHERE name = 'X Business';

-- X Pro should have these features
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = true,
    enable_memes = true
WHERE name = 'X Pro';

-- X Basic should have memes but not perplexity guidance
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = false,
    enable_memes = true
WHERE name = 'X Basic';

-- Free plan should have neither
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = false,
    enable_memes = false
WHERE name = 'Free';