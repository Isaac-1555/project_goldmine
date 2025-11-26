# Polar.sh Integration Checklist

Use this checklist to complete the migration from Stripe to Polar.sh.

---

## 🔴 CRITICAL: Before You Start

### Database Backup
- [ ] **Export your Supabase database backup**
  - Go to Supabase Dashboard → Database → Backups
  - Download latest backup OR create a new one
  - **REASON**: The migration will rename columns. If something goes wrong, you can restore.

### Production Check
- [ ] **Do you have active paying customers on Stripe?**
  - **YES**: Read the "Migration Strategy" section first
  - **NO**: You can proceed with migration

---

## Phase 1: Apply Database Migration

### Step 1: Review Migration File
- [ ] Read `summarease/supabase/migrations/20251125203357_migrate_stripe_to_polar.sql`
- [ ] Understand what it does (renames `stripe_*` columns to `payment_*`)

### Step 2: Apply Migration to Database
```bash
cd /Users/user/dev/project_goldmine/summarease
supabase db push
```

**Expected output:**
- Migration should apply successfully
- You'll see: `Applying migration 20251125203357_migrate_stripe_to_polar.sql...`

**If you get an error:**
- Check your Supabase connection: `supabase status`
- Make sure you're linked to the right project: `supabase link --project-ref your-project-ref`

### Step 3: Verify Migration
```bash
# Check that columns were renamed
supabase db diff
```

**What to check:**
- [ ] `customers.payment_customer_id` exists (not `stripe_customer_id`)
- [ ] `subscriptions.payment_subscription_id` exists (not `stripe_subscription_id`)
- [ ] `subscriptions.payment_customer_id` exists (not `stripe_customer_id`)
- [ ] Functions `handle_new_user_with_trial()` and `expire_trial_subscriptions()` updated

---

## Phase 2: Set Up Polar.sh Account

### Step 1: Create Account
- [ ] Go to https://polar.sh/signup
- [ ] Sign up with GitHub, Google, or Email
- [ ] Verify your email

### Step 2: Create Organization
- [ ] Click "Create Organization"
- [ ] Choose organization name (e.g., "SummarEase", "YourCompany")
- [ ] Complete organization setup
- [ ] **Save your Organization ID** (found in dashboard URL or settings)

### Step 3: Create Product (Subscription)
- [ ] Go to Products → Create Product
- [ ] Set product name: "SummarEase Premium" (or your preferred name)
- [ ] Set product type: **Subscription**
- [ ] Set pricing: $4.99/month (or your preferred price)
- [ ] Set trial period: **30 days** (to match your current trial)
- [ ] Add product description
- [ ] **Save your Product ID** (found in product settings)

### Step 4: Get API Keys
- [ ] Go to Settings → API Keys
- [ ] Copy your Organization ID
- [ ] Create an API key (if needed for backend)
- [ ] **DO NOT share these publicly**

---

## Phase 3: Configure Environment Variables

### Step 1: Update Local .env File
Edit `/Users/user/dev/project_goldmine/summarease/.env`:

```bash
# Add these lines:
VITE_POLAR_ORGANIZATION_ID=your_actual_organization_id
VITE_POLAR_PRODUCT_ID=your_actual_product_id
```

- [ ] Add VITE_POLAR_ORGANIZATION_ID with your actual ID
- [ ] Add VITE_POLAR_PRODUCT_ID with your actual ID
- [ ] Save the file

### Step 2: Add Supabase Secrets (for webhooks later)
Go to Supabase Dashboard → Project Settings → Edge Functions → Manage Secrets

- [ ] Remove old secrets:
  - Delete `STRIPE_SECRET_KEY` (if it exists)
  - Delete `STRIPE_WEBHOOK_SECRET` (if it exists)

- [ ] Add new secrets (we'll set these up in Phase 4):
  - `POLAR_WEBHOOK_SECRET` = (get this from Polar dashboard after webhook setup)
  - `POLAR_API_KEY` = (if using API integration)

---

## Phase 4: Choose & Implement Checkout Method

You have three options. **Recommendation: Start with Option A for speed.**

### Option A: Checkout Links (5-10 minutes) ⚡ FASTEST

#### What you're doing:
Getting a direct checkout URL from Polar and redirecting users to it.

#### Steps:
1. [ ] Go to Polar Dashboard → Products → Your Product
2. [ ] Click "Get Checkout Link" or find the checkout URL
3. [ ] Copy the URL (looks like: `https://polar.sh/your-org/checkout/product-id`)

4. [ ] Update `summarease/src/components/Subscription/PricingPage.tsx`:
   - Find line ~70 where it says `// TODO: Replace with actual Polar.sh checkout URL`
   - Replace with:
   ```typescript
   window.location.href = 'https://polar.sh/YOUR-ORG/checkout/YOUR-PRODUCT-ID';
   ```

5. [ ] Test it:
   - Run `npm run dev`
   - Go to pricing page
   - Click "Start Free Trial"
   - Should redirect to Polar checkout

6. [ ] Proceed to Phase 5 (Webhooks)

---

### Option B: Embedded Checkout (1-2 hours) 🎨 BEST UX

#### What you're doing:
Adding Polar's checkout component directly in your app.

#### Steps:
1. [ ] Install Polar SDK:
   ```bash
   cd /Users/user/dev/project_goldmine/summarease
   npm install @polar-sh/sdk
   ```

2. [ ] Read Polar's embedded checkout docs:
   - https://docs.polar.sh/features/checkout/embed

3. [ ] Update `PricingPage.tsx` to use Polar's embedded component
   - Import Polar SDK
   - Add checkout component
   - Style to match your app

4. [ ] Test locally

5. [ ] Proceed to Phase 5 (Webhooks)

---

### Option C: API Integration (2-4 hours) 🔧 MOST FLEXIBLE

#### What you're doing:
Creating checkout sessions programmatically via Polar API.

#### Steps:
1. [ ] Read Polar API docs: https://docs.polar.sh/api-reference
2. [ ] Create Edge Function to call Polar API
3. [ ] Build custom checkout UI
4. [ ] Test locally
5. [ ] Proceed to Phase 5 (Webhooks)

---

## Phase 5: Set Up Webhooks (REQUIRED)

Webhooks allow Polar to notify your app when subscriptions are created, updated, or canceled.

### Step 1: Create Webhook Handler Edge Function

1. [ ] Create directory:
   ```bash
   mkdir -p /Users/user/dev/project_goldmine/summarease/supabase/functions/polar-webhooks
   ```

2. [ ] Create file `polar-webhooks/index.ts` with the webhook code from `STRIPE_TO_POLAR_MIGRATION_SUMMARY.md`
   - Copy the code from lines 229-284 in that file

3. [ ] Update the webhook code with actual Polar event structure
   - Read Polar webhook docs: https://docs.polar.sh/integrate/webhooks
   - Match event types to Polar's actual events

### Step 2: Deploy Webhook Handler

```bash
cd /Users/user/dev/project_goldmine/summarease
supabase functions deploy polar-webhooks
```

- [ ] Deployment successful
- [ ] Note the webhook URL (looks like: `https://YOUR-PROJECT.supabase.co/functions/v1/polar-webhooks`)

### Step 3: Configure Webhook in Polar

1. [ ] Go to Polar Dashboard → Settings → Webhooks
2. [ ] Click "Add Endpoint"
3. [ ] Enter webhook URL: `https://YOUR-PROJECT.supabase.co/functions/v1/polar-webhooks`
4. [ ] Select events to receive:
   - [ ] `subscription.created`
   - [ ] `subscription.updated`
   - [ ] `subscription.canceled`
   - [ ] `order.created` (optional)
   - [ ] Any others you need
5. [ ] Save webhook
6. [ ] Copy the webhook secret

### Step 4: Add Webhook Secret to Supabase

1. [ ] Go to Supabase Dashboard → Project Settings → Edge Functions
2. [ ] Click "Manage Secrets"
3. [ ] Add secret:
   - Name: `POLAR_WEBHOOK_SECRET`
   - Value: (paste the secret from Polar)
4. [ ] Save

---

## Phase 6: Testing

### Test Signup Flow
- [ ] Sign up as new user
- [ ] Check database: `subscriptions` table has record with status='trialing'
- [ ] Verify trial end date is 30 days from now

### Test Checkout Flow
- [ ] Click "Start Free Trial" button
- [ ] Redirects to checkout (Option A) OR shows embedded checkout (Option B)
- [ ] Complete test checkout (use Polar's test mode)
- [ ] Check if webhook received in Supabase logs
- [ ] Check if `subscriptions` table updated with `payment_subscription_id`

### Test Subscription Status
- [ ] After checkout, user should see "Subscribed" status
- [ ] Check `usage` - should show unlimited summaries
- [ ] Create a summary to verify access works

### Test Webhook Events
- [ ] Use Polar's webhook testing tool to send test events
- [ ] Check Supabase Edge Function logs
- [ ] Verify database updates correctly

---

## Phase 7: Go Live Checklist

### Code Quality
- [ ] No console errors in browser
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass (if you have tests)

### User Experience
- [ ] Pricing page loads correctly
- [ ] Checkout flow is smooth
- [ ] Success/error messages are clear
- [ ] Subscription status shows correctly in UI

### Backend
- [ ] Webhooks receiving events successfully
- [ ] Database updates correctly on subscription changes
- [ ] Edge Function logs show no errors

### Documentation
- [ ] Update any user-facing docs about payment
- [ ] Update privacy policy (if needed)
- [ ] Update terms of service (if needed)

### Polar Configuration
- [ ] Test mode works correctly
- [ ] Ready to switch to production mode
- [ ] Webhook endpoint is production URL

---

## Phase 8: Switch to Production

### In Polar Dashboard
- [ ] Switch from Test Mode to Live Mode
- [ ] Update product pricing if needed
- [ ] Update webhook URL if using different domain for production
- [ ] Test live checkout with real payment (you can cancel immediately)

### In Your App
- [ ] Deploy to production
- [ ] Verify environment variables are set in production
- [ ] Test live checkout flow
- [ ] Monitor webhook events

---

## Troubleshooting

### Build Errors
**Problem**: TypeScript errors about Stripe types
- **Solution**: Run `npm install` again to remove cached types

### Checkout Not Working
**Problem**: Clicking checkout button does nothing
- **Check**: Browser console for errors
- **Check**: Correct Product ID in environment variables
- **Check**: Polar product is published (not draft)

### Webhooks Not Receiving
**Problem**: Webhooks not updating database
- **Check**: Supabase Edge Function logs for errors
- **Check**: Webhook secret is set correctly in Supabase
- **Check**: Webhook URL is correct in Polar dashboard
- **Check**: Events are selected in Polar webhook configuration

### Database Migration Failed
**Problem**: Migration didn't apply
- **Restore from backup**
- **Check**: Run `supabase status` to verify connection
- **Try**: `supabase db reset` (WARNING: destroys data) then `supabase db push`

---

## Need Help?

### Documentation
- **This project**: `/docs/STRIPE_TO_POLAR_MIGRATION_SUMMARY.md`
- **Polar docs**: https://docs.polar.sh
- **Supabase docs**: https://supabase.com/docs

### Support
- **Polar Discord**: https://discord.gg/Pnhfz3UThd
- **Supabase Discord**: https://discord.supabase.com

---

## Progress Tracking

Keep track of your progress:

### Core Setup
- [ ] Database migration applied
- [ ] Polar account created
- [ ] Product created in Polar
- [ ] Environment variables configured

### Integration
- [ ] Checkout method implemented
- [ ] Webhooks deployed
- [ ] Webhooks configured in Polar

### Testing
- [ ] Signup flow tested
- [ ] Checkout flow tested
- [ ] Webhooks tested
- [ ] Subscription status working

### Production
- [ ] Deployed to production
- [ ] Live mode enabled
- [ ] Monitoring webhooks
- [ ] Users can subscribe successfully

---

**Estimated Total Time**: 
- Option A (Checkout Links): 2-3 hours
- Option B (Embedded Checkout): 4-6 hours
- Option C (API Integration): 8-12 hours

**Current Status**: ✅ Stripe removed, database ready, awaiting Polar integration

Good luck! You've got this. 🚀
