#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function grantLifetimePremium() {
  console.log('🔧 Granting lifetime premium to you@example.com...\n');
  
  // Call the RPC function (we'll create it via SQL first)
  const { data, error } = await supabase.rpc('grant_lifetime_premium', {
    user_email: 'you@example.com'
  });
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Result:', data);
  
  // Verify
  const { data: user, error: verifyError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_lifetime_premium', true);
    
  if (!verifyError) {
    console.log('\n✅ Verification: Lifetime premium users:', user);
  }
}

grantLifetimePremium();
