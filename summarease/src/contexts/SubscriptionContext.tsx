import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../components/Auth/AuthProvider';
import { supabase } from '../lib/supabase';

export interface SubscriptionData {
  id: string;
  user_id: string;
  payment_subscription_id: string | null; // Polar.sh subscription ID (previously stripe_subscription_id)
  payment_customer_id: string; // Polar.sh customer ID (previously stripe_customer_id)
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused';
  price_id: string | null;
  quantity: number;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  is_lifetime_premium?: boolean; // TRUE for users with permanent premium access
  created_at: string;
  updated_at: string;
}

export interface UsageData {
  summaryCount: number;
  summaryLimit: number;
  canGenerateSummary: boolean;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  usage: UsageData;
  isLoading: boolean;
  isPremium: boolean;
  isTrialing: boolean;
  hasActiveSubscription: boolean;
  canAccessPremiumFeatures: boolean;
  localTrialStatus: 'not_started' | 'active' | 'expired';
  localTrialExpiresAt: string | null;
  refreshSubscription: () => Promise<void>;
  incrementSummaryUsage: () => Promise<void>;
  startLocalTrial: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [localTrialStatus, setLocalTrialStatus] = useState<'not_started' | 'active' | 'expired'>('not_started');
  const [localTrialExpiresAt, setLocalTrialExpiresAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData>({
    summaryCount: 0,
    summaryLimit: 3,
    canGenerateSummary: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Calculate subscription status
  // Lifetime premium users always have access
  const isLifetimePremium = subscription?.is_lifetime_premium === true;
  
  // Check if Polar trial hasn't expired
  const isPolarTrialValid = subscription?.trial_end 
    ? new Date(subscription.trial_end) > new Date() 
    : false;

  // Check if Local trial is active and not expired
  const isLocalTrialActive = localTrialStatus === 'active' && localTrialExpiresAt
    ? new Date(localTrialExpiresAt) > new Date()
    : false;

  const hasActiveSubscription = 
    isLifetimePremium ||
    (subscription?.status === 'active') ||
    (subscription?.status === 'trialing' && isPolarTrialValid) ||
    isLocalTrialActive;
  
  const isTrialing = (!isLifetimePremium && subscription?.status === 'trialing' && isPolarTrialValid) || isLocalTrialActive;
  const isPremium = hasActiveSubscription;
  const canAccessPremiumFeatures = hasActiveSubscription;

  // Fetch subscription and user data
  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLocalTrialStatus('not_started');
      setLocalTrialExpiresAt(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch Polar subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      }

      setSubscription(subData);

      // Fetch Local Trial status from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('local_trial_status, local_trial_expires_at')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user trial status:', userError);
      } else if (userData) {
        setLocalTrialStatus(userData.local_trial_status);
        setLocalTrialExpiresAt(userData.local_trial_expires_at);
      }

    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch usage data
  const fetchUsage = async () => {
    if (!user) {
      setUsage({
        summaryCount: 0,
        summaryLimit: 3,
        canGenerateSummary: true,
      });
      return;
    }

    try {
      // Call the database function to get summary count in rolling 7-day window
      const { data, error } = await supabase
        .rpc('get_summary_count_7days', { user_uuid: user.id });

      if (error) {
        console.error('Error fetching usage:', error);
        return;
      }

      const summaryCount = data || 0;
      const summaryLimit = canAccessPremiumFeatures ? Infinity : 3;
      const canGenerateSummary = canAccessPremiumFeatures || summaryCount < 3;

      setUsage({
        summaryCount,
        summaryLimit,
        canGenerateSummary,
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  // Increment summary usage
  const incrementSummaryUsage = async () => {
    if (!user) return;

    try {
      await supabase.rpc('increment_summary_usage', { user_uuid: user.id });
      
      // Refresh usage data
      await fetchUsage();
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  // Start local trial
  const startLocalTrial = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('start_local_trial');
      if (error) throw error;
      await refreshSubscription();
    } catch (error) {
      console.error('Error starting local trial:', error);
      throw error;
    }
  };

  // Refresh subscription data
  const refreshSubscription = async () => {
    setIsLoading(true);
    await fetchSubscription();
    await fetchUsage();
  };

  // Fetch data on mount and when user changes
  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, [user]);

  // Set up real-time subscription for subscription changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value: SubscriptionContextType = {
    subscription,
    usage,
    isLoading,
    isPremium,
    isTrialing,
    hasActiveSubscription,
    canAccessPremiumFeatures,
    localTrialStatus,
    localTrialExpiresAt,
    startLocalTrial,
    refreshSubscription,
    incrementSummaryUsage,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
