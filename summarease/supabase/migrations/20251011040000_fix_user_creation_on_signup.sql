-- Fix user creation on signup by combining user and trial subscription creation
-- This migration fixes the issue where new users were not being added to public.users table

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to both create user record AND trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user_with_trial()
RETURNS TRIGGER AS $$
BEGIN
  -- First, create the user record in public.users table
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Then, create trial subscription for new user
  INSERT INTO public.subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'pending_' || NEW.id::TEXT, -- Temporary unique customer ID
    NULL, -- No Stripe subscription yet
    'trialing',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger to run on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_trial();

-- Backfill any existing auth.users that don't have records in public.users
-- This will fix any users that were created while the bug existed
INSERT INTO public.users (id, email, created_at)
SELECT 
  au.id, 
  au.email, 
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Also backfill trial subscriptions for users who don't have one
INSERT INTO public.subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  trial_start,
  trial_end,
  current_period_start,
  current_period_end
)
SELECT 
  au.id,
  'pending_' || au.id::TEXT, -- Temporary unique customer ID
  NULL, -- No Stripe subscription yet
  'trialing',
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM auth.users au
LEFT JOIN public.subscriptions s ON au.id = s.user_id
WHERE s.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
