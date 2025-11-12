# Stripe Checkout Error Fix - November 12, 2025

## Problem
Users were getting **"Edge Function returned a non-2xx status code"** (400 Bad Request) when trying to start a free trial or upgrade to premium via the pricing page.

### Error Details
```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session 400 (Bad Request)
FunctionsHttpError: Edge Function returned a non-2xx status code
```

## Root Cause
The Edge Function lacked proper error handling and logging, making it impossible to diagnose the exact failure point. Additionally, the frontend was passing `undefined` as the price ID when no explicit value was provided.

## Solution Implemented

### 1. Enhanced Edge Function Error Handling (`create-checkout-session/index.ts`)

**Added comprehensive logging:**
- ✅ Startup logging to track execution flow
- ✅ Configuration validation (Stripe keys, Supabase URLs)
- ✅ User authentication verification
- ✅ Customer lookup/creation logging
- ✅ Price ID validation with detailed context
- ✅ Checkout session creation tracking
- ✅ Detailed error messages with stack traces

**Key improvements:**
```typescript
// Before: Silent failures
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', ...)

// After: Explicit validation
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeSecretKey) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable')
  throw new Error('Stripe configuration error')
}
```

### 2. Frontend Price ID Handling (`src/lib/stripe.ts`)

**Added fallback mechanism:**
```typescript
// Before: Passed undefined when no priceId provided
const response = await supabase.functions.invoke('create-checkout-session', {
  body: { priceId },
});

// After: Uses environment variable as fallback
const finalPriceId = priceId || import.meta.env.VITE_STRIPE_PRICE_ID;
const response = await supabase.functions.invoke('create-checkout-session', {
  body: { priceId: finalPriceId },
});
```

### 3. Database Error Handling

**Added proper error checking for customer lookups:**
```typescript
// Now checks for actual errors vs "not found" (PGRST116)
if (customerFetchError && customerFetchError.code !== 'PGRST116') {
  console.error('❌ Error fetching customer:', customerFetchError)
  throw new Error('Database error while fetching customer')
}
```

### 4. Environment Configuration

**Updated `.env.example`:**
```bash
VITE_STRIPE_PRICE_ID=price_your_stripe_price_id
```

**Added to `.env` (commented):**
```bash
# Stripe Price ID (optional - defaults to Supabase secret if not provided)
# VITE_STRIPE_PRICE_ID=price_your_price_id_here
```

## How to Test

### 1. Check Browser Console
Open DevTools (F12) and look for detailed logs:
```
🔍 Starting checkout session creation...
✅ Stripe initialized
✅ Supabase client initialized
✅ User authenticated: <user-id>
🔍 Checking for existing customer...
✅ Found existing customer: cus_xxxxx
🔍 Parsing request body...
📦 Request body: { priceId: 'price_xxxxx' }
💰 Price ID check: { ... }
🔧 Creating Stripe checkout session...
✅ Checkout session created successfully
```

### 2. Check Edge Function Logs
Go to Supabase Dashboard → Edge Functions → create-checkout-session → Logs

You should now see detailed logs for each step of the process, making it easy to identify where failures occur.

### 3. Expected Behavior
- **With valid configuration**: User is redirected to Stripe Checkout
- **With missing config**: Clear error message indicating what's missing
- **With auth issues**: Clear "User not authenticated" error
- **With database issues**: Clear error indicating database problem

## Deployment

✅ Edge Function deployed:
```bash
supabase functions deploy create-checkout-session --project-ref YOUR_PROJECT_REF
```

✅ Frontend changes:
- Auto-reloaded by Vite dev server
- No manual restart needed

## Configuration Checklist

Ensure these are set in Supabase secrets:
- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key (sk_live_...)
- ✅ `STRIPE_PRICE_ID` - Your product price ID (price_...)
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_...)
- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_ANON_KEY` - Your Supabase anon key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

Verify with:
```bash
supabase secrets list --project-ref YOUR_PROJECT_REF
```

## Next Steps

1. **Test the checkout flow** - Try clicking "Start Free Trial" and observe the detailed logs
2. **Check what specific error appears** - The new logging will show exactly what's failing
3. **Fix the specific issue** - Based on the error message (missing price ID, auth issue, etc.)

## Common Issues to Look For

Based on the new logging, watch for:

❌ **"Missing STRIPE_SECRET_KEY"** → Verify Supabase secret is set  
❌ **"User not authenticated"** → Ensure user is logged in  
❌ **"No price ID available"** → Set STRIPE_PRICE_ID in Supabase or .env  
❌ **"Database error while fetching customer"** → Check RLS policies  
❌ **Stripe API errors** → Verify Stripe keys are valid and not expired

## Files Modified

1. `supabase/functions/create-checkout-session/index.ts` - Enhanced error handling
2. `src/lib/stripe.ts` - Added price ID fallback
3. `.env.example` - Added VITE_STRIPE_PRICE_ID
4. `.env` - Added commented price ID option

## Related Documentation

- `STRIPE_PAYMENT_DEBUG.md` - General Stripe debugging guide
- `QUICK_SUPABASE_SETUP.md` - Initial setup instructions
- Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
