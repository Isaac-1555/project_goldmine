// Quick script to verify Stripe configuration
// Run with: node verify-stripe.js

console.log('\n🔍 Checking Stripe Configuration...\n');

// Frontend keys (from .env)
const publishableKey = 'REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY';
const priceId = 'price_1SGmpNEVr8ysurPHZh8lFPVg';

console.log('✅ Frontend Configuration:');
console.log(`   Publishable Key: ${publishableKey.substring(0, 20)}...`);
console.log(`   Key Type: ${publishableKey.startsWith('pk_live') ? 'LIVE MODE' : 'TEST MODE'}`);
console.log(`   Price ID: ${priceId}`);
console.log(`   Price Type: ${priceId.startsWith('price_') ? 'VALID' : 'INVALID'}`);

console.log('\n⚠️  IMPORTANT:');
console.log('   Your Stripe is in LIVE MODE');
console.log('   Any successful payments will charge real money');
console.log('\n💡 To test safely:');
console.log('   1. Go to Stripe Dashboard → Developers → API Keys');
console.log('   2. Toggle "Test mode" ON (top right)');
console.log('   3. Copy TEST publishable key (pk_test_...)');
console.log('   4. Copy TEST secret key (sk_test_...)');
console.log('   5. Get TEST price ID from Products');
console.log('   6. Update .env and Supabase secrets with TEST keys\n');

console.log('📋 Common Errors:');
console.log('   • 400 Error → Usually price_id doesn\'t exist or mode mismatch');
console.log('   • 401 Error → Invalid secret key');
console.log('   • 403 Error → API key permissions issue\n');

console.log('🔧 Next Steps:');
console.log('   1. Check Supabase Edge Function logs:');
console.log('      https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/create-checkout-session/logs');
console.log('   2. Look for the exact Stripe API error message');
console.log('   3. Verify the price ID exists in your Stripe dashboard\n');
