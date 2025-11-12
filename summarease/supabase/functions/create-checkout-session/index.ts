import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Starting checkout session creation...')
    
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ Missing STRIPE_SECRET_KEY environment variable')
      throw new Error('Stripe configuration error')
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })
    console.log('✅ Stripe initialized')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase configuration')
      throw new Error('Supabase configuration error')
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    console.log('✅ Supabase client initialized')

    // Get the user from the auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      throw new Error('User not authenticated')
    }
    
    console.log('✅ User authenticated:', user.id)

    // Get or create Stripe customer
    console.log('🔍 Checking for existing customer...')
    let customerId: string

    // Check if customer already exists in our database
    const { data: existingCustomer, error: customerFetchError } = await supabaseClient
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (customerFetchError && customerFetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching customer:', customerFetchError)
      throw new Error('Database error while fetching customer')
    }

    if (existingCustomer?.stripe_customer_id) {
      console.log('✅ Found existing customer:', existingCustomer.stripe_customer_id)
      customerId = existingCustomer.stripe_customer_id
    } else {
      console.log('🆕 Creating new Stripe customer...')
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
      console.log('✅ Created Stripe customer:', customerId)

      // Store customer ID in our database
      const { error: insertError } = await supabaseClient.from('customers').insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      })
      
      if (insertError) {
        console.error('❌ Error storing customer in database:', insertError)
        // Continue anyway as customer is created in Stripe
      } else {
        console.log('✅ Stored customer in database')
      }
    }

    // Get price ID from request or use environment variable
    console.log('🔍 Parsing request body...')
    const body = await req.json()
    console.log('📦 Request body:', body)
    
    const { priceId } = body
    const stripePriceId = priceId || Deno.env.get('STRIPE_PRICE_ID')
    
    console.log('💰 Price ID check:', {
      providedPriceId: priceId,
      envPriceId: Deno.env.get('STRIPE_PRICE_ID') ? 'set' : 'not set',
      finalPriceId: stripePriceId
    })

    if (!stripePriceId) {
      console.error('❌ No price ID available')
      throw new Error('Price ID not provided and no default configured')
    }

    // Create checkout session with trial
    console.log('🔧 Creating Stripe checkout session...', {
      customerId,
      priceId: stripePriceId,
      userId: user.id
    })
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      subscription_data: {
        trial_period_days: 30, // 1 month free trial
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
    })
    
    console.log('✅ Checkout session created successfully:', {
      sessionId: session.id,
      url: session.url
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Error creating checkout session:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    })
    
    // Return more detailed error for debugging
    const errorMessage = error.message || 'Unknown error occurred'
    const errorDetails = error.type ? { type: error.type, code: error.code } : {}
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
