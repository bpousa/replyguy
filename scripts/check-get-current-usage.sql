-- Check what get_current_usage returns
SELECT * FROM get_current_usage(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);

-- Check the function definition
SELECT 
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_current_usage'
AND n.nspname = 'public';