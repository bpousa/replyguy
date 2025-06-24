-- 1. Create the missing update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Check if the trigger exists for automatic user creation
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'users'
    AND event_object_schema = 'auth';

-- 3. Check current users in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    confirmation_sent_at
FROM 
    auth.users
ORDER BY 
    created_at DESC
LIMIT 10;

-- 4. Check current users in public.users
SELECT 
    id,
    email,
    created_at
FROM 
    public.users
ORDER BY 
    created_at DESC
LIMIT 10;

-- 5. Create the handle_new_user function first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, daily_goal, timezone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    10,
    'America/New_York'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Now create the trigger
-- First drop if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then recreate
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Test the function exists
SELECT 
    routine_name,
    routine_type
FROM 
    information_schema.routines
WHERE 
    routine_schema = 'public'
    AND routine_name = 'handle_new_user';

-- 8. Manually create users for any existing auth users that don't have public.users records
INSERT INTO public.users (id, email, daily_goal, timezone)
SELECT 
    au.id,
    au.email,
    10,
    'America/New_York'
FROM 
    auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
WHERE 
    pu.id IS NULL
    AND au.email IS NOT NULL;