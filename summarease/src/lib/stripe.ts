import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Missing Stripe publishable key');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export async function createCheckoutSession(priceId?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('You must be logged in to subscribe');
    }

    const response = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId },
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Failed to create checkout session');
  }
}

export async function createPortalSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('You must be logged in to manage your subscription');
    }

    const response = await supabase.functions.invoke('create-portal-session');

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    throw new Error(error.message || 'Failed to create portal session');
  }
}

export async function redirectToCheckout(priceId?: string) {
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const { sessionId, url } = await createCheckoutSession(priceId);

  if (url) {
    window.location.href = url;
  } else if (sessionId) {
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }
  }
}

export async function redirectToPortal() {
  const { url } = await createPortalSession();
  
  if (url) {
    window.location.href = url;
  }
}
