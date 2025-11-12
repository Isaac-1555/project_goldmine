import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    console.log('🔑 Stripe Key Check:', {
      keyExists: !!publishableKey,
      keyLength: publishableKey?.length,
      keyPrefix: publishableKey?.substring(0, 15) + '...',
    });
    if (!publishableKey) {
      console.error('❌ Missing Stripe publishable key');
      return null;
    }
    console.log('✅ Loading Stripe.js...');
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export async function createCheckoutSession(priceId?: string) {
  try {
    // Use provided priceId or fallback to environment variable
    const finalPriceId = priceId || import.meta.env.VITE_STRIPE_PRICE_ID;
    
    console.log('💳 Creating checkout session...', { 
      providedPriceId: priceId,
      envPriceId: import.meta.env.VITE_STRIPE_PRICE_ID ? 'set' : 'not set',
      finalPriceId 
    });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ User not authenticated');
      throw new Error('You must be logged in to subscribe');
    }

    console.log('✅ User authenticated, calling Edge Function...');
    const response = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId: finalPriceId },
    });

    console.log('📥 Edge Function response:', {
      hasError: !!response.error,
      hasData: !!response.data,
      data: response.data,
      error: response.error,
    });

    if (response.error) {
      console.error('❌ Edge Function error:', response.error);
      throw response.error;
    }

    console.log('✅ Checkout session created:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
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
  console.log('🚀 Starting checkout redirect flow...');
  const stripe = await getStripe();
  
  if (!stripe) {
    console.error('❌ Stripe failed to load');
    throw new Error('Stripe failed to load');
  }

  console.log('✅ Stripe loaded successfully');
  const { sessionId, url } = await createCheckoutSession(priceId);

  console.log('🔀 Redirect decision:', { hasUrl: !!url, hasSessionId: !!sessionId });

  if (url) {
    console.log('🌐 Redirecting to Stripe Checkout URL:', url);
    window.location.href = url;
  } else if (sessionId) {
    console.log('🔑 Redirecting via sessionId:', sessionId);
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      console.error('❌ Redirect error:', error);
      throw error;
    }
  } else {
    console.error('❌ No URL or sessionId received from Edge Function');
    throw new Error('Invalid checkout session response');
  }
}

export async function redirectToPortal() {
  const { url } = await createPortalSession();
  
  if (url) {
    window.location.href = url;
  }
}
