-- Update X Business plan character limits
UPDATE subscription_plans
SET 
    max_tweet_length = 2000,
    max_response_idea_length = 1000,
    max_reply_length = 2000
WHERE name = 'X Business';

-- Also ensure other plans have correct limits
UPDATE subscription_plans
SET 
    max_tweet_length = 280,
    max_response_idea_length = 200,
    max_reply_length = 280
WHERE name = 'Free';

UPDATE subscription_plans
SET 
    max_tweet_length = 500,
    max_response_idea_length = 300,
    max_reply_length = 280
WHERE name = 'X Basic';

UPDATE subscription_plans
SET 
    max_tweet_length = 1000,
    max_response_idea_length = 500,
    max_reply_length = 560
WHERE name = 'X Pro';