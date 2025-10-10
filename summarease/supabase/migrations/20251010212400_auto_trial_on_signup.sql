-- Create function to automatically create trial subscription for new users
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create trial subscription for new user
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
    '', -- No Stripe customer yet
    '', -- No Stripe subscription yet
    'trialing',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW() + INTERVAL '30 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON public.subscriptions TO authenticated;
