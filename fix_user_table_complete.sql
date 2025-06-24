-- 1. First check what columns exist in the users table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 10 CHECK (daily_goal >= 1 AND daily_goal <= 100);

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the handle_new_user function
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for automatic user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Check existing auth users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 8. Check existing public users
SELECT id, email, daily_goal, timezone, created_at
FROM public.users
ORDER BY created_at DESC;

-- 9. Create user records for any existing auth users (with proper column handling)
INSERT INTO public.users (id, email)
SELECT 
    au.id,
    au.email
FROM 
    auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
WHERE 
    pu.id IS NULL
    AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 10. Update any users that have null values for new columns
UPDATE public.users
SET 
    daily_goal = COALESCE(daily_goal, 10),
    timezone = COALESCE(timezone, 'America/New_York')
WHERE 
    daily_goal IS NULL 
    OR timezone IS NULL;