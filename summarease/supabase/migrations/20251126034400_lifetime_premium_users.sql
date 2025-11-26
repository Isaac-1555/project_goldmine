-- Migration: Add Lifetime Premium Users Support
-- This allows specific users to have permanent premium access without subscriptions

-- Add column to track lifetime premium status
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS is_lifetime_premium BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.subscriptions.is_lifetime_premium IS 'TRUE if user has permanent premium access (founders, team members, etc.)';

-- Update the has_active_subscription function to include lifetime premium users
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_status TEXT;
  trial_end_date TIMESTAMP WITH TIME ZONE;
  is_lifetime BOOLEAN;
BEGIN
  SELECT status, trial_end, is_lifetime_premium 
  INTO subscription_status, trial_end_date, is_lifetime
  FROM public.subscriptions
  WHERE user_id = user_uuid;
  
  -- Lifetime premium users always have access
  IF is_lifetime = TRUE THEN
    RETURN TRUE;
  END IF;
  
  -- Check if subscription is active or in trial
  IF subscription_status IN ('active', 'trialing') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if still in trial period
  IF trial_end_date IS NOT NULL AND trial_end_date > NOW() THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to grant lifetime premium access
CREATE OR REPLACE FUNCTION public.grant_lifetime_premium(user_email TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id UUID
) AS $$
DECLARE
  target_user_id UUID;
  existing_subscription_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found with email: ' || user_email, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user has a subscription record
  SELECT id INTO existing_subscription_id
  FROM public.subscriptions
  WHERE user_id = target_user_id;
  
  IF existing_subscription_id IS NULL THEN
    -- Create new subscription record with lifetime premium
    INSERT INTO public.subscriptions (
      user_id,
      payment_customer_id,
      payment_subscription_id,
      status,
      is_lifetime_premium,
      trial_start,
      trial_end,
      current_period_start,
      current_period_end
    ) VALUES (
      target_user_id,
      'lifetime_' || target_user_id::TEXT,
      NULL,
      'active',
      TRUE,
      NOW(),
      NOW() + INTERVAL '100 years', -- Effectively never expires
      NOW(),
      NOW() + INTERVAL '100 years'
    );
  ELSE
    -- Update existing subscription to lifetime premium
    UPDATE public.subscriptions
    SET 
      is_lifetime_premium = TRUE,
      status = 'active',
      trial_end = NOW() + INTERVAL '100 years',
      current_period_end = NOW() + INTERVAL '100 years',
      updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Lifetime premium granted successfully', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to revoke lifetime premium (if needed)
CREATE OR REPLACE FUNCTION public.revoke_lifetime_premium(user_email TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id UUID
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found with email: ' || user_email, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update subscription to remove lifetime premium
  UPDATE public.subscriptions
  SET 
    is_lifetime_premium = FALSE,
    status = 'canceled',
    trial_end = NOW(), -- Expire trial immediately
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'No subscription found for user', target_user_id;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Lifetime premium revoked successfully', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view to easily see lifetime premium users
CREATE OR REPLACE VIEW public.lifetime_premium_users AS
SELECT 
  u.email,
  u.id as user_id,
  s.created_at as premium_granted_at,
  s.updated_at as last_updated
FROM public.subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.is_lifetime_premium = TRUE
ORDER BY s.created_at DESC;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.grant_lifetime_premium TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_lifetime_premium TO service_role;
GRANT SELECT ON public.lifetime_premium_users TO service_role;

COMMENT ON FUNCTION public.grant_lifetime_premium IS 'Grant lifetime premium access to a user by email';
COMMENT ON FUNCTION public.revoke_lifetime_premium IS 'Revoke lifetime premium access from a user by email';
COMMENT ON VIEW public.lifetime_premium_users IS 'View of all users with lifetime premium access';
