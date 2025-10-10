-- Create function to expire trial subscriptions
CREATE OR REPLACE FUNCTION public.expire_trial_subscriptions()
RETURNS void AS $$
BEGIN
  -- Update trialing subscriptions that have expired and don't have a Stripe subscription
  UPDATE public.subscriptions
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE 
    status = 'trialing'
    AND trial_end < NOW()
    AND (stripe_subscription_id = '' OR stripe_subscription_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule this function to run daily via pg_cron (if available)
-- Note: pg_cron needs to be enabled in your Supabase project first
-- You can also call this from an Edge Function or external cron service

-- Example using pg_cron (uncomment if pg_cron is enabled):
-- SELECT cron.schedule(
--   'expire-trials-daily',
--   '0 0 * * *', -- Daily at midnight
--   $$ SELECT public.expire_trial_subscriptions(); $$
-- );

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.expire_trial_subscriptions() TO postgres, service_role;
