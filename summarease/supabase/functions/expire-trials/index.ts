import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // Verify this is called from a trusted source (optional but recommended)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔍 Checking for expired trials...')

    // Find all expired trials that don't have a Stripe subscription yet
    const { data: expiredTrials, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, trial_end, status')
      .eq('status', 'trialing')
      .lt('trial_end', new Date().toISOString())
      .or('stripe_subscription_id.is.null,stripe_subscription_id.eq.')

    if (fetchError) {
      console.error('❌ Error fetching expired trials:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired trials', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${expiredTrials?.length || 0} expired trial(s)`)

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No expired trials found',
          expired_count: 0,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update all expired trials to canceled status
    const { data: updatedTrials, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredTrials.map(t => t.id))
      .select()

    if (updateError) {
      console.error('❌ Error updating expired trials:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update expired trials', details: updateError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Successfully expired ${updatedTrials?.length || 0} trial(s)`)

    // Log details of expired trials
    expiredTrials.forEach((trial) => {
      console.log(`  - User ${trial.user_id}: trial ended ${trial.trial_end}`)
    })

    return new Response(
      JSON.stringify({ 
        message: 'Successfully expired trials',
        expired_count: updatedTrials?.length || 0,
        expired_trials: updatedTrials,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
