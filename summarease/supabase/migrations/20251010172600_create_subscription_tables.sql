-- Create customers table to store Stripe customer IDs
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused')),
  price_id TEXT,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create usage tracking table for summary generation limits
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('summary_generation')),
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment history table (optional but useful for analytics)
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON public.customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
CREATE POLICY "Users can view their own customer data"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking table
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for payment_history table
CREATE POLICY "Users can view their own payment history"
  ON public.payment_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if user has active subscription or trial
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_status TEXT;
  trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT status, trial_end INTO subscription_status, trial_end_date
  FROM public.subscriptions
  WHERE user_id = user_uuid;
  
  -- Check if subscription is active or in trial
  IF subscription_status IN ('active', 'trialing') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if still in trial period (for users who signed up for free trial)
  IF trial_end_date IS NOT NULL AND trial_end_date > NOW() THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's summary count in rolling 7-day window
CREATE OR REPLACE FUNCTION public.get_summary_count_7days(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(count), 0) INTO total_count
  FROM public.usage_tracking
  WHERE user_id = user_uuid
    AND resource_type = 'summary_generation'
    AND period_end > NOW() - INTERVAL '7 days';
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment summary usage
CREATE OR REPLACE FUNCTION public.increment_summary_usage(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_period_start TIMESTAMP WITH TIME ZONE;
  current_period_end TIMESTAMP WITH TIME ZONE;
  existing_record UUID;
BEGIN
  -- Calculate rolling 7-day period
  current_period_start := NOW();
  current_period_end := NOW() + INTERVAL '7 days';
  
  -- Check if there's a record for current period
  SELECT id INTO existing_record
  FROM public.usage_tracking
  WHERE user_id = user_uuid
    AND resource_type = 'summary_generation'
    AND period_end > NOW()
  ORDER BY period_end DESC
  LIMIT 1;
  
  IF existing_record IS NOT NULL THEN
    -- Update existing record
    UPDATE public.usage_tracking
    SET count = count + 1,
        updated_at = NOW()
    WHERE id = existing_record;
  ELSE
    -- Create new record
    INSERT INTO public.usage_tracking (user_id, resource_type, count, period_start, period_end)
    VALUES (user_uuid, 'summary_generation', 1, current_period_start, current_period_end);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
