# 🚀 Go Live Checklist - Switch from Test to Production

## Overview

When switching from Stripe **Test Mode** to **Live Mode**, you need to update all Stripe-related keys and configurations. Here's the complete list:

---

## 📋 Complete Checklist

### 1️⃣ Stripe Dashboard - Switch to Live Mode

**Before you start**, go to Stripe Dashboard and **toggle from Test Mode to Live Mode** (top right corner).

⚠️ **IMPORTANT**: Live mode and Test mode have **completely separate** data, keys, webhooks, and configurations!

---

## 2️⃣ Get Live Stripe Keys

### A. API Keys

1. **Go to**: Stripe Dashboard → **Developers** → **API keys** (in Live mode)
2. **Copy these keys**:

```
Publishable key:  pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
Secret key:       sk_live_xxxxxxxxxxxxxxxxxxxxxxxx  (click "Reveal")
```

### B. Price ID

1. **Go to**: Stripe Dashboard → **Products** (in Live mode)
2. Find your **$4.99 Premium Subscription** product
3. Click on the price
4. **Copy the Price ID**: `price_xxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **Note**: The Price ID from test mode **won't work** in live mode!

### C. Webhook Secret

1. **Go to**: Stripe Dashboard → **Developers** → **Webhooks** (in Live mode)
2. Click **Add endpoint**
3. **Endpoint URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhooks`
4. Select these events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`
5. Click **Add endpoint**
6. **Copy the Signing secret**: `whsec_xxxxxxxxxxxxxxxxxxxxxxxx`

---

## 3️⃣ Update Local Environment Variables

### File: `.env`

**Location**: `/Users/user/dev/project_goldmine/summarease/.env`

**Change this line:**

```bash
# OLD (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SGkghIGHUnnB2wzQAikvATe2E2VAMPC7Bv2fMoKJBHi2qMyKCP0JiUNhDn8dExfvGGOPHx3QxazC9oof5BvWrGi004sZTv0mM

# NEW (Live Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
```

**Command to update:**
```bash
# Open .env file
nano .env

# Or use VS Code
code .env

# Update the VITE_STRIPE_PUBLISHABLE_KEY value
# Save and close
```

⚠️ **IMPORTANT**: This is the **frontend** key - it's exposed to users, so it's safe. The `pk_live_` prefix makes it a publishable key.

---

## 4️⃣ Update Supabase Secrets

### Update all Stripe-related secrets:

```bash
# 1. Update Secret Key (CRITICAL - this is your private key!)
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE

# 2. Update Price ID (from your live product)
supabase secrets set STRIPE_PRICE_ID=price_YOUR_LIVE_PRICE_ID_HERE

# 3. Update Webhook Secret (from your live webhook endpoint)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE
```

### Verify secrets were updated:
```bash
supabase secrets list
```

You should see updated digests for:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

---

## 5️⃣ Redeploy Edge Functions

After updating secrets, **redeploy** your Edge Functions so they pick up the new values:

```bash
# Redeploy all Stripe-related functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhooks
```

**Why?** Edge Functions cache environment variables on deployment.

---

## 6️⃣ Configure Live Customer Portal

Stripe's Customer Portal is **separate** for test and live modes.

1. **Go to**: Stripe Dashboard → **Settings** → **Billing** → **Customer portal** (in Live mode)
2. Click **Activate** or **Configure**
3. Enable the same settings as test mode:
   - ✅ **Invoice history**
   - ✅ **Update payment method**
   - ✅ **Cancel subscriptions** (Cancel at period end)
4. **Branding** (recommended):
   - Add your app name
   - Upload logo
   - Set brand color
   - Add support email
5. **Save changes**

See `STRIPE_CUSTOMER_PORTAL_GUIDE.md` for detailed instructions.

---

## 7️⃣ Update Production Environment Variables

If you're deploying to a hosting platform (Vercel, Netlify, etc.), update environment variables there too:

### For Vercel:
```bash
# Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

# Add/Update:
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
```

### For Netlify:
```bash
# Go to: Netlify Dashboard → Your Site → Site settings → Environment variables

# Add/Update:
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
```

### For other platforms:
Update wherever you store frontend environment variables with the **live publishable key**.

---

## 8️⃣ Test Live Mode Thoroughly

⚠️ **CRITICAL**: Test everything in live mode **before** launching to real users!

### A. Use Real Test Cards (Live Mode Testing)

Stripe provides special test cards that work in **live mode** for testing:

**Use these cards in live mode** (they won't charge):
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits

OR use: 4000 0000 0000 0077 (for 3D Secure testing)
```

⚠️ **Note**: These cards **only work in live mode** after your account is fully activated.

### B. Alternative: Test with Real Card (Small Amount)

If test cards don't work yet:
1. Use a real card with a small charge ($4.99)
2. Test the full flow
3. Cancel subscription immediately in Customer Portal
4. Refund yourself via Stripe Dashboard

### C. Testing Checklist

- [ ] Navigate to `/pricing` page
- [ ] Click "Start Free Trial"
- [ ] Complete Stripe Checkout (use test card or real card)
- [ ] Verify redirect back to your app
- [ ] Check database for subscription record
- [ ] Verify premium features are unlocked
- [ ] Test uploading unlimited files
- [ ] Test accessing Graph View
- [ ] Test accessing Infographics
- [ ] Test accessing Study Tools
- [ ] Test Customer Portal (Settings → Manage Subscription)
- [ ] Test canceling subscription
- [ ] Verify webhook deliveries in Stripe Dashboard

---

## 9️⃣ Verify Webhook Deliveries

After live testing:

1. **Go to**: Stripe Dashboard → **Developers** → **Webhooks** (in Live mode)
2. Click on your webhook endpoint
3. Check **"Recent deliveries"**
4. Verify events are being delivered successfully (200 status)

**If failing:**
- Check Supabase function logs: `supabase functions logs stripe-webhooks`
- Verify webhook secret is correct
- Ensure Edge Function is deployed with latest secrets

---

## 🔟 Update Stripe Account Settings (Optional but Recommended)

### A. Enable Email Receipts
1. **Go to**: Stripe Dashboard → **Settings** → **Emails**
2. Enable:
   - ✅ Successful payments
   - ✅ Failed payments
   - ✅ Refund notifications

### B. Add Business Information
1. **Go to**: Stripe Dashboard → **Settings** → **Public details**
2. Add:
   - Business name
   - Support email
   - Support phone
   - Website URL

### C. Set Up Payment Methods
1. **Go to**: Stripe Dashboard → **Settings** → **Payment methods**
2. Enable:
   - ✅ Card payments (Visa, Mastercard, Amex)
   - Optional: Apple Pay, Google Pay

---

## 1️⃣1️⃣ Monitor Your First Real Transactions

### A. Set Up Alerts
```bash
# Get notified of important events
Go to: Stripe Dashboard → Developers → Webhooks → Add endpoint

# Use a service like Zapier or email notifications
```

### B. Check Your Dashboard Daily
- Monitor successful subscriptions
- Watch for failed payments
- Check for disputes/chargebacks
- Review cancellations

---

## 📊 Summary - What Changes?

| Item | Test Mode | Live Mode | Where to Update |
|------|-----------|-----------|-----------------|
| **Publishable Key** | `pk_test_...` | `pk_live_...` | `.env` file + hosting platform |
| **Secret Key** | `sk_test_...` | `sk_live_...` | Supabase secrets |
| **Price ID** | `price_...` (test) | `price_...` (live) | Supabase secrets |
| **Webhook Secret** | `whsec_...` (test) | `whsec_...` (live) | Supabase secrets |
| **Webhook Endpoint** | Same URL | Same URL | Stripe Dashboard (new endpoint) |
| **Customer Portal** | Test config | Live config | Stripe Dashboard |
| **Edge Functions** | No change | Redeploy after secrets | `supabase functions deploy` |

---

## ⚠️ Important Warnings

### 🚨 DO NOT:
- ❌ Mix test and live keys
- ❌ Commit live keys to version control
- ❌ Use test mode keys in production
- ❌ Skip testing after switching
- ❌ Forget to redeploy Edge Functions

### ✅ DO:
- ✅ Keep test and live keys separate
- ✅ Use environment variables for all keys
- ✅ Test thoroughly before real launch
- ✅ Monitor first transactions closely
- ✅ Set up Stripe alerts
- ✅ Keep webhook secrets secure

---

## 🔐 Security Best Practices

### 1. Protect Your Secret Key
```bash
# NEVER commit to git
echo ".env" >> .gitignore

# NEVER expose in frontend code
# Secret key should ONLY be in:
# - Supabase secrets (server-side)
# - Your hosting platform's environment variables (if needed)
```

### 2. Use Environment Variables
```bash
# Good ✅
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Bad ❌
const stripeKey = "pk_live_xxx" // hardcoded
```

### 3. Verify Webhook Signatures
Our Edge Function already does this - don't remove it!

---

## 📝 Quick Command Reference

```bash
# 1. Update local .env
nano .env
# Change VITE_STRIPE_PUBLISHABLE_KEY to pk_live_...

# 2. Update Supabase secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_PRICE_ID=price_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# 3. Verify secrets
supabase secrets list

# 4. Redeploy functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhooks

# 5. Check function logs (after testing)
supabase functions logs stripe-webhooks --tail

# 6. Test your app
npm run dev
# Visit: http://localhost:5173/pricing
```

---

## 🎯 Final Checklist Before Launch

- [ ] All keys switched to live mode
- [ ] Secrets updated in Supabase
- [ ] Edge Functions redeployed
- [ ] Live webhook endpoint created and tested
- [ ] Customer Portal configured for live mode
- [ ] Tested full subscription flow
- [ ] Tested cancellation flow
- [ ] Verified webhook deliveries
- [ ] Tested all premium features unlock
- [ ] Set up Stripe email notifications
- [ ] Added business information to Stripe
- [ ] Monitored first test transaction
- [ ] Reviewed Stripe compliance requirements
- [ ] Terms of Service and Privacy Policy in place
- [ ] Support email configured

---

## 🆘 Rollback Plan

If something goes wrong, you can quickly switch back to test mode:

```bash
# 1. Switch Stripe Dashboard back to Test mode
# 2. Revert .env to test keys
# 3. Revert Supabase secrets:
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_PRICE_ID=price_test_xxx  
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# 4. Redeploy functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhooks
```

---

## 📞 Need Help?

- **Stripe Support**: https://support.stripe.com
- **Stripe Documentation**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

---

## 🎉 You're Ready!

Once you complete this checklist, your app will be processing **real payments** with Stripe! 

**Remember**: 
- Start with test mode until everything works
- Test thoroughly in live mode before real customers
- Monitor closely for the first few days
- Keep your secret keys secure

Good luck with your launch! 🚀💰
