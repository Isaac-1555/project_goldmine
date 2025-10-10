import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await request.text()
    
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    // Initialize Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Upsert subscription data
        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            price_id: subscription.items.data[0]?.price.id,
            quantity: subscription.items.data[0]?.quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start
              ? new Date(subscription.trial_start * 1000).toISOString()
              : null,
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
          })
          .eq('user_id', userId)

        console.log(`Subscription ${subscription.status} for user ${userId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Update subscription status to canceled
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)

        console.log(`Subscription canceled for user ${userId}`)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (!invoice.subscription) {
          break
        }

        // Get subscription to find user_id
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Record payment
        if (invoice.payment_intent) {
          await supabaseAdmin
            .from('payment_history')
            .insert({
              user_id: userId,
              stripe_payment_intent_id: invoice.payment_intent as string,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
            })
        }

        console.log(`Invoice paid for user ${userId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (!invoice.subscription) {
          break
        }

        // Get subscription to find user_id
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Update subscription status
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscription.id)

        // Record failed payment
        if (invoice.payment_intent) {
          await supabaseAdmin
            .from('payment_history')
            .insert({
              user_id: userId,
              stripe_payment_intent_id: invoice.payment_intent as string,
              amount: invoice.amount_due,
              currency: invoice.currency,
              status: 'failed',
            })
        }

        console.log(`Invoice payment failed for user ${userId}`)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          const userId = subscription.metadata.supabase_user_id

          if (!userId) {
            console.error('No supabase_user_id in subscription metadata')
            break
          }

          // Ensure customer record exists
          await supabaseAdmin
            .from('customers')
            .upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string,
            })
            .eq('user_id', userId)

          console.log(`Checkout completed for user ${userId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
