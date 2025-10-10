# 🔧 Troubleshooting Guide - Edge Function Errors

## Your Current Error

```
Failed to load resource: the server responded with a status of 400
```

Plus Stripe resources being blocked by browser.

---

## 🚨 Issue 1: Stripe Resources Blocked

### Error Messages:
```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
r.stripe.com/b:1
```

### Cause:
**Ad blocker or browser extension** is blocking Stripe's JavaScript

### Solution:

#### Option 1: Disable Ad Blocker (Recommended)
1. **Click on your ad blocker extension** (uBlock Origin, AdBlock Plus, etc.)
2. **Disable it for localhost** or **whitelist your site**
3. **Refresh the page**

#### Option 2: Whitelist Stripe Domains
Add these domains to your ad blocker's whitelist:
```
*.stripe.com
js.stripe.com
r.stripe.com
```

#### Option 3: Test in Incognito/Private Mode
```bash
# Open in incognito mode (extensions disabled by default)
# Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
# Firefox: Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
```

---

## 🚨 Issue 2: Edge Function 400 Error

### Possible Causes:

### A. **Not Logged In**
The Edge Function requires authentication.

**Solution:**
1. Make sure you're logged in to your app
2. Check browser console for "User not authenticated" error

### B. **Stripe Keys Not Set**
The function needs `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`

**Check if secrets are set:**
```bash
supabase secrets list
```

**Should show:**
```
STRIPE_SECRET_KEY    | [some hash]
STRIPE_PRICE_ID      | [some hash]
STRIPE_WEBHOOK_SECRET| [some hash]
```

**If missing, set them:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY
supabase secrets set STRIPE_PRICE_ID=price_YOUR_ID
```

**Then redeploy:**
```bash
supabase functions deploy create-checkout-session
```

### C. **Invalid Stripe Keys**
Keys might be incorrect or expired.

**Verify your keys:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. Go to: https://dashboard.stripe.com/test/products
4. Click your product → Copy **Price ID** (starts with `price_`)

**Update secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_[your_actual_key]
supabase secrets set STRIPE_PRICE_ID=price_[your_actual_id]

# Redeploy
supabase functions deploy create-checkout-session
```

### D. **Database Tables Not Created**
The function tries to insert into `customers` table.

**Check if tables exist:**
```bash
# Connect to your database
supabase db diff

# Or check in Supabase Dashboard:
# Go to: Table Editor → Look for 'customers' and 'subscriptions' tables
```

**If missing, run migration:**
```bash
supabase db push
```

### E. **RLS Policies Preventing Insert**
Row Level Security might block the insert.

**Solution:**
Check your RLS policies in Supabase Dashboard or add a policy that allows service role to insert:

```sql
-- This should already exist from our migration, but verify:
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to insert customers"
  ON public.customers
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

**Open Developer Tools:**
- Chrome/Edge: `F12` or `Cmd+Option+J` (Mac)
- Firefox: `F12` or `Cmd+Option+K` (Mac)

**Look for:**
- Red error messages
- Failed network requests
- JavaScript errors

### Step 2: Check Network Tab

1. Open DevTools → **Network tab**
2. Click "Start Free Trial"
3. Look for the request to `create-checkout-session`
4. Click on it → **Response tab**
5. You should see the actual error message

**Common error messages:**
```json
{"error": "User not authenticated"}
{"error": "Price ID not provided"}
{"error": "Invalid API Key"}
```

### Step 3: Test Function Manually

**Get your auth token first:**

Open browser console and run:
```javascript
// Get your session token
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

**Then test the function:**
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{}'
```

Replace:
- `YOUR_TOKEN_HERE` with the token from console
- `YOUR_ANON_KEY` with your Supabase anon key from `.env`

### Step 4: Check Supabase Logs

Unfortunately, Supabase CLI doesn't have live logs yet. But you can:

1. **Go to**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/logs/edge-functions
2. **Select**: `create-checkout-session`
3. **Look for**: Recent errors

Or use the API:
```bash
# Check recent invocations
curl "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/functions/create-checkout-session/invocations" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"
```

---

## ✅ Quick Fix Checklist

Try these in order:

### 1. **Disable Ad Blocker**
```
☐ Click ad blocker extension
☐ Disable for localhost
☐ Refresh page
☐ Try "Start Free Trial" again
```

### 2. **Verify You're Logged In**
```
☐ Check if you see your email/profile in app
☐ If not, log in
☐ Try again
```

### 3. **Check Stripe Keys**
```bash
# Verify secrets exist
supabase secrets list

# Should see STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
```

### 4. **Redeploy Function**
```bash
supabase functions deploy create-checkout-session
```

### 5. **Check Database Tables**
```bash
# Go to Supabase Dashboard → Table Editor
# Verify 'customers' and 'subscriptions' tables exist
```

### 6. **Test in Incognito Mode**
```
☐ Open incognito/private window
☐ Go to your app
☐ Log in
☐ Try "Start Free Trial"
```

---

## 🐛 Common Errors & Solutions

### Error: "User not authenticated"
**Solution:** You're not logged in. Sign in first.

### Error: "Price ID not provided"
**Solution:**
```bash
supabase secrets set STRIPE_PRICE_ID=price_YOUR_ID
supabase functions deploy create-checkout-session
```

### Error: "Invalid API Key provided"
**Solution:**
```bash
# Get fresh key from Stripe Dashboard
supabase secrets set STRIPE_SECRET_KEY=sk_test_NEW_KEY
supabase functions deploy create-checkout-session
```

### Error: "Resource has been blocked by the client"
**Solution:** Disable ad blocker or test in incognito mode

### Error: "Failed to fetch"
**Solution:** 
- Check internet connection
- Verify Supabase project is online
- Check if function is deployed: `supabase functions list`

---

## 🧪 Test Your Setup

### Test 1: Check if logged in
```javascript
// In browser console:
const { data } = await supabase.auth.getUser()
console.log(data.user) // Should show your user object
```

### Test 2: Check Stripe key is working
```bash
# Test your Stripe key directly
curl https://api.stripe.com/v1/customers \
  -u sk_test_YOUR_KEY: \
  -d "email=test@example.com"

# Should return customer object, not error
```

### Test 3: Check function is deployed
```bash
supabase functions list

# Should show:
# create-checkout-session | ACTIVE
```

### Test 4: Check database tables
```bash
# In Supabase Dashboard SQL Editor:
SELECT * FROM customers LIMIT 1;
SELECT * FROM subscriptions LIMIT 1;

# Should not error (even if empty)
```

---

## 📞 Still Not Working?

### Get More Info:

1. **Browser Console Error:**
   - Copy the full error message
   - Include the stack trace

2. **Network Response:**
   - Open Network tab
   - Click on failed request
   - Copy Response body

3. **Function Logs:**
   - Go to Supabase Dashboard
   - Functions → create-checkout-session → Logs
   - Copy recent errors

### Then check:
- `.env` file has `VITE_STRIPE_PUBLISHABLE_KEY`
- Supabase secrets are set correctly
- Function is deployed
- You're logged in
- Ad blocker is disabled

---

## 🔧 Nuclear Option - Full Reset

If nothing works, try this:

```bash
# 1. Delete and recreate secrets
supabase secrets unset STRIPE_SECRET_KEY
supabase secrets unset STRIPE_PRICE_ID
supabase secrets unset STRIPE_WEBHOOK_SECRET

# 2. Set them again (get fresh keys from Stripe)
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY
supabase secrets set STRIPE_PRICE_ID=price_YOUR_ID
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# 3. Redeploy all functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhooks

# 4. Clear browser cache
# Chrome: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
# Select "Cached images and files"

# 5. Restart dev server
npm run dev

# 6. Try in incognito mode
```

---

## 📊 Expected Behavior

When working correctly, you should see:

1. Click "Start Free Trial"
2. Brief loading spinner
3. Redirect to Stripe Checkout page
4. Stripe Checkout form with:
   - Email pre-filled
   - Credit card input
   - "Subscribe" button
   - "30-day free trial" message

If you see a **blank page** or **immediate error**, that's the Edge Function failing.

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ No red errors in console
- ✅ Stripe Checkout page loads
- ✅ No "ERR_BLOCKED_BY_CLIENT" errors
- ✅ Can enter test card: 4242 4242 4242 4242
- ✅ Redirected back to your app after payment
- ✅ Premium features unlock

---

Need more help? Share:
1. Browser console errors
2. Network tab response
3. Which step in the checklist failed
