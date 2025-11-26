-- Migration: Stripe to Polar.sh Transition
-- This migration renames all Stripe-specific columns to be payment-provider agnostic
-- and prepares the database for Polar.sh integration

-- ============================================================
-- STEP 1: Rename columns in customers table
-- ============================================================

-- Rename stripe_customer_id to payment_customer_id (more generic)
ALTER TABLE public.customers 
  RENAME COLUMN stripe_customer_id TO payment_customer_id;

-- Update the unique index
DROP INDEX IF EXISTS idx_customers_stripe_customer_id;
CREATE INDEX idx_customers_payment_customer_id ON public.customers(payment_customer_id);

COMMENT ON COLUMN public.customers.payment_customer_id IS 'Customer ID from payment provider (Polar.sh)';

-- ============================================================
-- STEP 2: Rename columns in subscriptions table
-- ============================================================

-- Rename stripe_subscription_id to payment_subscription_id
ALTER TABLE public.subscriptions 
  RENAME COLUMN stripe_subscription_id TO payment_subscription_id;

-- Rename stripe_customer_id to payment_customer_id
ALTER TABLE public.subscriptions 
  RENAME COLUMN stripe_customer_id TO payment_customer_id;

-- Update indexes
DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription_id;
CREATE INDEX idx_subscriptions_payment_subscription_id ON public.subscriptions(payment_subscription_id);

COMMENT ON COLUMN public.subscriptions.payment_subscription_id IS 'Subscription ID from payment provider (Polar.sh)';
COMMENT ON COLUMN public.subscriptions.payment_customer_id IS 'Customer ID from payment provider (Polar.sh)';

-- ============================================================
-- STEP 3: Rename columns in payment_history table
-- ============================================================

-- Rename stripe_payment_intent_id to payment_intent_id
ALTER TABLE public.payment_history 
  RENAME COLUMN stripe_payment_intent_id TO payment_intent_id;

COMMENT ON COLUMN public.payment_history.payment_intent_id IS 'Payment/Order ID from payment provider (Polar.sh)';

-- ============================================================
-- STEP 4: Update the create_trial_subscription function
-- ============================================================

-- This function is called when new users sign up
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
    payment_customer_id,
    payment_subscription_id,
    status,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'pending_' || NEW.id::TEXT, -- Temporary customer ID until they subscribe
    NULL, -- No payment subscription yet (trial only)
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

-- ============================================================
-- STEP 5: Update the expire_trial_subscriptions function
-- ============================================================

-- This function expires trials that don't have a paid subscription
CREATE OR REPLACE FUNCTION public.expire_trial_subscriptions()
RETURNS void AS $$
BEGIN
  -- Update trialing subscriptions that have expired and don't have a payment subscription
  UPDATE public.subscriptions
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE 
    status = 'trialing'
    AND trial_end < NOW()
    AND (payment_subscription_id = '' OR payment_subscription_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 6: Data cleanup for existing records
-- ============================================================

-- Update any empty string stripe IDs to NULL for cleaner data
UPDATE public.customers 
SET payment_customer_id = NULL 
WHERE payment_customer_id = '';

UPDATE public.subscriptions 
SET payment_subscription_id = NULL 
WHERE payment_subscription_id = '';

UPDATE public.subscriptions 
SET payment_customer_id = 'pending_trial_' || user_id::TEXT
WHERE payment_customer_id = '';

-- ============================================================
-- STEP 7: Add helpful comments to tables
-- ============================================================

COMMENT ON TABLE public.customers IS 'Customer records linked to payment provider (Polar.sh)';
COMMENT ON TABLE public.subscriptions IS 'User subscriptions managed through payment provider (Polar.sh)';
COMMENT ON TABLE public.payment_history IS 'Historical record of all payments processed through payment provider';

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. All existing Stripe data is preserved, just column names changed
-- 2. Functions updated to use new column names
-- 3. Indexes recreated for optimal performance
-- 4. Ready for Polar.sh webhook integration
-- 5. The 'status' enum values are compatible with Polar.sh:
--    - 'active', 'trialing', 'canceled' map directly
--    - May need to add 'past_due' if Polar uses different terms
-- 6. After running this migration, update Supabase Edge Function
--    to handle Polar.sh webhooks instead of Stripe webhooks
