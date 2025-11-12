-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily trial expiration at midnight UTC
SELECT cron.schedule(
  'expire-trials-daily',
  '0 0 * * *', -- Daily at midnight UTC
  $$ SELECT public.expire_trial_subscriptions(); $$
);

-- You can also manually run the function anytime with:
-- SELECT public.expire_trial_subscriptions();
