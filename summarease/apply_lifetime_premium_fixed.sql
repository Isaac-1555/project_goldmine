-- Fixed: Works with existing Stripe column names
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- Step 1: Add lifetime premium column (safe to run multiple times)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS is_lifetime_premium BOOLEAN DEFAULT FALSE;

-- Step 2: Create the grant function (works with current column names)
CREATE OR REPLACE FUNCTION public.grant_lifetime_premium(user_email TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, user_id UUID) AS $$
DECLARE
  target_user_id UUID;
  existing_subscription_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found with email: ' || user_email, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user has a subscription record
  SELECT id INTO existing_subscription_id FROM public.subscriptions WHERE user_id = target_user_id;
  
  IF existing_subscription_id IS NULL THEN
    -- Create new subscription with lifetime premium (using existing column names)
    INSERT INTO public.subscriptions (
      user_id, 
      stripe_customer_id,
      stripe_subscription_id,
      status, 
      is_lifetime_premium, 
      trial_start, 
      trial_end, 
      current_period_start, 
      current_period_end
    )
    VALUES (
      target_user_id, 
      'lifetime_' || target_user_id::TEXT, 
      NULL, 
      'active', 
      TRUE, 
      NOW(), 
      NOW() + INTERVAL '100 years', 
      NOW(), 
      NOW() + INTERVAL '100 years'
    );
  ELSE
    -- Update existing subscription
    UPDATE public.subscriptions 
    SET 
      is_lifetime_premium = TRUE, 
      status = 'active', 
      trial_end = NOW() + INTERVAL '100 years', 
      current_period_end = NOW() + INTERVAL '100 years', 
      updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Lifetime premium granted successfully to ' || user_email, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant lifetime premium to you@example.com
SELECT * FROM public.grant_lifetime_premium('you@example.com');

-- Step 4: Verify it worked
SELECT 
  u.email,
  s.status,
  s.is_lifetime_premium,
  s.trial_end::date as expires,
  s.created_at
FROM auth.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
WHERE u.email = 'you@example.com';
