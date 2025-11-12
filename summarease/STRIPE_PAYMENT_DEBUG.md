# 🔍 Stripe Payment Integration Debug Guide

## Current Status

✅ **What's Working:**
- Stripe dependencies installed (`@stripe/stripe-js`, `stripe`)
- All Edge Functions deployed and active
- Stripe secrets configured in Supabase
- Webhook endpoint configured in Stripe Dashboard
- Database schema complete
- Auto-trial creation on signup

🚨 **Known Issue:**
Users with expired trials cannot upgrade to paid subscription. Clicking "Upgrade to Premium" redirects back to app instead of Stripe Checkout.

---

## Debug Steps

### Step 1: Check Browser Console Logs

With the enhanced logging we just added, you'll now see detailed debug output:

1. Open your app at `http://localhost:5173/pricing`
2. Open Browser DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Clear console
5. Click "Upgrade to Premium" button

**Expected Console Output:**
```
🎯 handleStartTrial called { userExists: true, subscriptionStatus: 'canceled', isPremium: false, isTrialing: false }
💳 Starting Stripe checkout flow... { status: 'canceled', hasSubscription: true }
🚀 Starting checkout redirect flow...
🔑 Stripe Key Check: { keyExists: true, keyLength: 118, keyPrefix: 'pk_live_51SGkgZ...' }
✅ Loading Stripe.js...
✅ Stripe loaded successfully
💳 Creating checkout session... { priceId: undefined }
✅ User authenticated, calling Edge Function...
📥 Edge Function response: { hasError: false, hasData: true, data: {...}, error: null }
✅ Checkout session created: { sessionId: 'cs_...', url: 'https://checkout.stripe.com/...' }
🔀 Redirect decision: { hasUrl: true, hasSessionId: true }
🌐 Redirecting to Stripe Checkout URL: https://checkout.stripe.com/...
```

**If you see errors instead:**

❌ **"Missing Stripe publishable key"**
- Fix: Verify `VITE_STRIPE_PUBLISHABLE_KEY` in `.env` file
- Current key: `REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY`

❌ **"User not authenticated"**
- Fix: Make sure you're logged in before clicking upgrade
- Go to `/login` first

❌ **"Edge Function error: ..."**
- Go to Step 2 (check Edge Function logs)

❌ **"No URL or sessionId received"**
- Edge Function returned empty response
- Go to Step 2

---

### Step 2: Check Edge Function Logs

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
2. Navigate to: **Edge Functions** → **create-checkout-session** → **Logs**
3. Click "Refresh" to see latest logs
4. Click "Upgrade to Premium" in your app again
5. Watch for new log entries

**Look for these errors:**

❌ **"Missing signature or webhook secret"**
- This is normal for checkout session (only webhooks need signatures)

❌ **"User not authenticated"**
- Authorization header might be missing
- Check if `supabase.auth.getSession()` is returning valid session

❌ **"Price ID not provided"**
- Missing `STRIPE_PRICE_ID` in Supabase secrets
- Run: `supabase secrets list | grep STRIPE_PRICE_ID`
- Should show a hash (secret is set)

❌ **Stripe API errors (4xx, 5xx)**
- Invalid `STRIPE_SECRET_KEY`
- Go to Stripe Dashboard → Developers → API Keys
- Copy secret key (starts with `sk_live_...`)
- Update: `supabase secrets set STRIPE_SECRET_KEY="sk_live_..."`

---

### Step 3: Verify Subscription Status in Database

Your trial might be in an unexpected state. Let's check:

```bash
# Option 1: Via Supabase Dashboard
# Go to: Database → Table Editor → subscriptions
# Find your user's row and check the 'status' column

# Option 2: Via SQL Editor
# Go to: SQL Editor → New Query
# Run this query (replace with your email):
```

```sql
SELECT 
  u.email,
  s.status,
  s.trial_start,
  s.trial_end,
  s.stripe_subscription_id,
  s.stripe_customer_id
FROM auth.users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'your-email@example.com';
```

**Expected Results:**

| Field | Expected Value | Meaning |
|-------|---------------|---------|
| `status` | `'canceled'` | Trial has expired |
| `trial_start` | Date 30+ days ago | When trial started |
| `trial_end` | Date in the past | When trial ended |
| `stripe_subscription_id` | Empty or NULL | No paid subscription yet |
| `stripe_customer_id` | Empty or valid ID | May or may not exist |

**If status is NOT 'canceled':**
- Status might be 'trialing' (trial still active)
- Status might be 'active' (already subscribed)
- Check if `trial_end` date is accurate

---

### Step 4: Test Edge Function Directly

Let's test if the Edge Function works independently:

```bash
# Get your auth token first
# Go to browser console on localhost:5173 and run:
```

```javascript
const session = await (await fetch('http://localhost:5173')).text();
console.log('Auth token:', session);
```

Then test the Edge Function:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"priceId": null}'
```

**Expected Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**If you get an error:**
- Check error message in response
- Verify auth token is valid
- Check Edge Function logs in Supabase

---

### Step 5: Common Issues & Fixes

#### Issue: "Stripe key is truncated"
**Status:** ✅ **RESOLVED** - Key is actually complete (118 chars)

#### Issue: "Trial hasn't expired yet"
**Symptom:** `subscription.status === 'trialing'` and `trial_end` is in the future

**Fix:** Wait for trial to expire, or manually expire it:
```sql
UPDATE subscriptions 
SET 
  status = 'canceled',
  trial_end = NOW() - INTERVAL '1 day'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

#### Issue: "Webhook not firing after payment"
**Check:** Stripe Dashboard → Developers → Webhooks → Your webhook
- Status should be "Enabled"
- Recent events should show successful deliveries
- If events are failing, check webhook logs for errors

**Fix:** Regenerate webhook secret and update Supabase:
```bash
# In Stripe Dashboard, click "Roll secret"
# Copy new secret (starts with whsec_...)
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

#### Issue: "Price not found"
**Check:** Verify `STRIPE_PRICE_ID` exists and is correct
```bash
# List Stripe secrets
supabase secrets list | grep STRIPE_PRICE_ID

# If missing, set it (get from Stripe Dashboard → Products → Your Product → Pricing)
supabase secrets set STRIPE_PRICE_ID="price_..."
```

#### Issue: "CORS error"
**Symptom:** Browser console shows: `Access-Control-Allow-Origin` error

**Fix:** Edge Function should already have CORS headers. Verify in:
`supabase/functions/create-checkout-session/index.ts` line 5-8

#### Issue: "Function times out"
**Symptom:** No response after 60+ seconds

**Possible causes:**
- Stripe API is down (check https://status.stripe.com)
- Invalid Stripe secret key
- Network connectivity issues with Supabase

---

## Expected Payment Flow

Here's the complete flow when working correctly:

```mermaid
graph TD
    A[User clicks Upgrade to Premium] --> B{User logged in?}
    B -->|No| C[Redirect to /signup]
    B -->|Yes| D{Check subscription status}
    D -->|trialing + valid| E[Redirect to /dashboard]
    D -->|canceled or null| F[Call redirectToCheckout]
    F --> G[Load Stripe.js]
    G --> H[Call create-checkout-session Edge Function]
    H --> I[Edge Function calls Stripe API]
    I --> J[Get checkout session URL]
    J --> K[Browser redirects to Stripe Checkout]
    K --> L[User enters payment on Stripe]
    L --> M[Stripe redirects to /subscription/success]
    M --> N[Webhook fires: checkout.session.completed]
    N --> O[Update subscriptions table: status=active]
    O --> P[User returns to dashboard with premium access]
```

**Current Issue:** Flow breaks somewhere between F and K. Your debug logs will show exactly where.

---

## Next Steps

1. **Run Step 1** (Browser console logs) - This will tell us exactly where it fails
2. **Run Step 2** (Edge Function logs) - If Step 1 shows Edge Function errors
3. **Run Step 3** (Database check) - Verify your subscription state
4. **Report findings** - Share the console output and we'll identify the fix

---

## Quick Commands Reference

```bash
# Check dev server status
ps aux | grep vite

# Restart dev server
cd /Users/user/dev/project_goldmine/summarease
npm run dev

# Check Supabase secrets
supabase secrets list

# Check Edge Functions
supabase functions list

# View Edge Function logs (CLI)
supabase functions logs create-checkout-session --tail

# Test with Stripe CLI (if installed)
stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhooks
```

---

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
- **Stripe API Logs**: Dashboard → Developers → Events
- **Stripe Webhook Logs**: Dashboard → Developers → Webhooks → Your webhook → Logs

---

**Last Updated:** 2025-11-12  
**Status:** Ready for testing with enhanced debug logging
