-- 1. Create Enum
CREATE TYPE public.local_trial_status_type AS ENUM ('not_started', 'active', 'expired');

-- 2. Update Users Table
ALTER TABLE public.users
ADD COLUMN local_trial_status public.local_trial_status_type DEFAULT 'not_started' NOT NULL,
ADD COLUMN local_trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN local_trial_expires_at TIMESTAMP WITH TIME ZONE;

-- 3. Update New User Handler (Stop creating subscriptions)
CREATE OR REPLACE FUNCTION public.handle_new_user_with_trial()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the user record in public.users table
  INSERT INTO public.users (id, email, local_trial_status)
  VALUES (NEW.id, NEW.email, 'not_started')
  ON CONFLICT (id) DO NOTHING;

  -- WE DO NOT CREATE A SUBSCRIPTION HERE ANYMORE.
  -- Subscriptions are only for Polar.sh

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger uses this function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_trial();

-- 4. Create start_local_trial RPC
CREATE OR REPLACE FUNCTION public.start_local_trial()
RETURNS void AS $$
DECLARE
  current_user_id uuid;
  current_status public.local_trial_status_type;
  has_polar_sub boolean;
BEGIN
  current_user_id := auth.uid();

  -- Check current local trial status
  SELECT local_trial_status INTO current_status
  FROM public.users
  WHERE id = current_user_id;

  IF current_status IS NULL THEN
      -- Handle case where user exists but column might be null (though we set default and NOT NULL)
      -- Or if user not found
      RAISE EXCEPTION 'User not found';
  END IF;

  IF current_status != 'not_started' THEN
    RAISE EXCEPTION 'Local trial already started or expired';
  END IF;

  -- Check for existing active/trialing Polar subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = current_user_id
    AND status IN ('active', 'trialing')
  ) INTO has_polar_sub;

  IF has_polar_sub THEN
    RAISE EXCEPTION 'User already has an active subscription';
  END IF;

  -- Activate Trial
  UPDATE public.users
  SET
    local_trial_status = 'active',
    local_trial_started_at = NOW(),
    local_trial_expires_at = NOW() + INTERVAL '7 days'
  WHERE id = current_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper to expire local trials (can be run by cron or manually)
CREATE OR REPLACE FUNCTION public.check_and_expire_local_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET local_trial_status = 'expired'
  WHERE local_trial_status = 'active'
  AND local_trial_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
