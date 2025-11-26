-- Add lifetime premium column
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_lifetime_premium BOOLEAN DEFAULT FALSE;

-- Create grant function
CREATE OR REPLACE FUNCTION public.grant_lifetime_premium(user_email TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, user_id UUID) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  INSERT INTO public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, 
    is_lifetime_premium, trial_start, trial_end, current_period_start, current_period_end
  ) VALUES (
    target_user_id, 'lifetime_' || target_user_id::TEXT, NULL, 'active', 
    TRUE, NOW(), NOW() + INTERVAL '100 years', NOW(), NOW() + INTERVAL '100 years'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_lifetime_premium = TRUE, 
    status = 'active', 
    trial_end = NOW() + INTERVAL '100 years', 
    current_period_end = NOW() + INTERVAL '100 years';
  
  RETURN QUERY SELECT TRUE, 'Success'::TEXT, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to you@example.com
SELECT * FROM public.grant_lifetime_premium('you@example.com');
