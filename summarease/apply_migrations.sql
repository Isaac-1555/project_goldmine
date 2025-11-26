-- Apply Migration 1: Stripe to Polar
-- Only run if columns haven't been renamed yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.customers RENAME COLUMN stripe_customer_id TO payment_customer_id;
    ALTER TABLE public.subscriptions RENAME COLUMN stripe_subscription_id TO payment_subscription_id;
    ALTER TABLE public.subscriptions RENAME COLUMN stripe_customer_id TO payment_customer_id;
    ALTER TABLE public.payment_history RENAME COLUMN stripe_payment_intent_id TO payment_intent_id;
    RAISE NOTICE 'Columns renamed successfully';
  ELSE
    RAISE NOTICE 'Columns already renamed, skipping';
  END IF;
END $$;

-- Apply Migration 2: Lifetime Premium
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_lifetime_premium BOOLEAN DEFAULT FALSE;

-- Update/create functions
CREATE OR REPLACE FUNCTION public.grant_lifetime_premium(user_email TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, user_id UUID) AS $$
DECLARE
  target_user_id UUID;
  existing_subscription_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found with email: ' || user_email, NULL::UUID;
    RETURN;
  END IF;
  
  SELECT id INTO existing_subscription_id FROM public.subscriptions WHERE user_id = target_user_id;
  
  IF existing_subscription_id IS NULL THEN
    INSERT INTO public.subscriptions (user_id, payment_customer_id, payment_subscription_id, status, is_lifetime_premium, trial_start, trial_end, current_period_start, current_period_end)
    VALUES (target_user_id, 'lifetime_' || target_user_id::TEXT, NULL, 'active', TRUE, NOW(), NOW() + INTERVAL '100 years', NOW(), NOW() + INTERVAL '100 years');
  ELSE
    UPDATE public.subscriptions SET is_lifetime_premium = TRUE, status = 'active', trial_end = NOW() + INTERVAL '100 years', current_period_end = NOW() + INTERVAL '100 years', updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Lifetime premium granted successfully', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant lifetime premium to you@example.com
SELECT * FROM public.grant_lifetime_premium('you@example.com');
