import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (request) => {
  const signature = request.headers.get('Polar-Signature')
  const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET')

  // Verify webhook signature
  // TODO: Add signature verification logic once Polar SDK is available or signature spec is confirmed

  try {
    const body = await request.json()
    // Handle both structure types (some webhooks wrap in 'event', some send event directly)
    const event = body.event || body

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscription = event.data

        // We pass ?reference_id=<supabase_user_id> on the checkout link.
        // Polar copies this to subscription.metadata.reference_id.
        const referenceId = subscription.metadata?.reference_id as string | undefined

        if (!referenceId) {
          console.error('Missing reference_id in subscription metadata; cannot link to user')
          break
        }
        
        // Handle date conversion (Polar sends ISO strings usually, but snippet assumed timestamp)
        // We will safely parse it.
        const startDate = subscription.current_period_start 
            ? (typeof subscription.current_period_start === 'number' 
                ? new Date(subscription.current_period_start * 1000) 
                : new Date(subscription.current_period_start))
            : new Date();
            
        const endDate = subscription.current_period_end
            ? (typeof subscription.current_period_end === 'number' 
                ? new Date(subscription.current_period_end * 1000) 
                : new Date(subscription.current_period_end))
            : null;

        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: referenceId, // Supabase auth user ID
            payment_subscription_id: subscription.id,
            payment_customer_id: subscription.customer_id,
            status: subscription.status,
            price_id: subscription.price_id,
            current_period_start: startDate.toISOString(),
            current_period_end: endDate ? endDate.toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .select()
        break
      }

      case 'subscription.canceled':
      case 'subscription.revoked':
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('payment_subscription_id', event.data.id)
        break

      // Add more event handlers as needed
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
