# Final Setup: Polar.sh Checkout + Lifetime Premium

✅ **Code Changes Complete** - Your app is ready for Polar.sh!

This document provides the final steps to get everything working.

---

## 🎯 What's Been Done

### ✅ Code Implementation
- **Polar.sh Checkout (Option A)** implemented in `PricingPage.tsx`
- **Lifetime Premium System** - Database functions and frontend support added
- **SubscriptionContext** updated to support lifetime premium users
- **Build tested** - Everything compiles successfully

### ✅ Files Created
1. `supabase/migrations/20251126034400_lifetime_premium_users.sql` - Lifetime premium database support
2. `docs/GRANT_LIFETIME_PREMIUM_GUIDE.md` - Complete guide for granting access
3. This file - Final setup instructions

---

## 📋 Your Next Steps

### Step 1: Apply Database Migrations

You need to apply TWO migrations:

#### Migration 1: Stripe to Polar (Column Renaming)
File: `supabase/migrations/20251125203357_migrate_stripe_to_polar.sql`

#### Migration 2: Lifetime Premium Support
File: `supabase/migrations/20251126034400_lifetime_premium_users.sql`

**How to Apply:**

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_REF
2. Click **SQL Editor**
3. Click **New Query**
4. Copy the ENTIRE contents of `20251125203357_migrate_stripe_to_polar.sql`
5. Paste and click **Run**
6. Repeat for `20251126034400_lifetime_premium_users.sql`

**Option B: Via CLI (If migrations sync works)**
```bash
cd /Users/user/dev/project_goldmine/summarease
supabase db push
```

---

### Step 2: Set Up Polar.sh Account

#### 2.1 Create Account & Organization
1. Go to https://polar.sh/signup
2. Sign up (use GitHub for quick setup)
3. Create an organization
   - Choose a slug (e.g., "summarease")
   - This becomes part of your checkout URL

#### 2.2 Create Subscription Product
1. Go to **Products** → **Create Product**
2. Fill in details:
   - **Name**: "SummarEase Premium" (or your choice)
   - **Type**: **Subscription**
   - **Pricing**: $4.99/month (or your preferred price)
   - **Billing Period**: Monthly
   - **Trial Period**: 30 days
   - **Description**: Add a compelling description
3. Click **Create**
4. **IMPORTANT**: Note down:
   - Your **Organization Slug** (from URL or settings)
   - Your **Product ID** (from product page)

---

### Step 3: Configure Environment Variables

#### 3.1 Update Local `.env` File

Edit `/Users/user/dev/project_goldmine/summarease/.env` and add:

```bash
# Polar.sh Configuration
VITE_POLAR_ORGANIZATION_ID=your-org-slug
VITE_POLAR_PRODUCT_ID=your-product-id
```

**Example:**
```bash
VITE_POLAR_ORGANIZATION_ID=summarease
VITE_POLAR_PRODUCT_ID=prod_ABC123XYZ
```

#### 3.2 Test Locally

```bash
cd /Users/user/dev/project_goldmine/summarease
npm run dev
```

Then:
1. Go to http://localhost:5173/pricing
2. Click "Start Free Trial"
3. Should redirect to Polar.sh checkout page
4. If not, check browser console for errors

---

### Step 4: Grant Lifetime Premium to Specific Users

Once migrations are applied, you can grant lifetime premium access.

#### Quick Method (SQL Editor):
1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace email):

```sql
SELECT * FROM public.grant_lifetime_premium('your@email.com');
```

#### Bulk Grant (Multiple Users):
```sql
SELECT * FROM public.grant_lifetime_premium('founder@example.com');
SELECT * FROM public.grant_lifetime_premium('team@example.com');
SELECT * FROM public.grant_lifetime_premium('investor@example.com');
```

#### Verify It Worked:
```sql
SELECT * FROM public.lifetime_premium_users;
```

**Full guide**: See `docs/GRANT_LIFETIME_PREMIUM_GUIDE.md`

---

## 🧪 Testing Checklist

### Test Signup Flow
- [ ] Create new account
- [ ] User gets 30-day trial automatically
- [ ] Can create summaries (unlimited during trial)

### Test Checkout Flow
- [ ] Go to /pricing page
- [ ] Click "Start Free Trial"
- [ ] Redirects to Polar.sh checkout
- [ ] Checkout page loads correctly

### Test Lifetime Premium
- [ ] Grant lifetime premium to a test user
- [ ] Log in as that user
- [ ] Check subscription status shows "Premium"
- [ ] Verify unlimited summary generation

---

## 🚨 Important Notes

### About the Migrations
- **Migration 1** renames `stripe_*` columns to `payment_*`
- **Migration 2** adds `is_lifetime_premium` column and functions
- **BACKUP YOUR DATABASE** before applying (if production data exists)

### About Polar.sh Checkout (Option A)
- **Pros**: Fastest implementation (works immediately)
- **Cons**: Users temporarily leave your site
- **Upgrade path**: Can switch to embedded checkout later for better UX

### About Lifetime Premium
- Users with `is_lifetime_premium=TRUE` get:
  - ✅ Unlimited summary generation
  - ✅ Never expires (100-year trial period)
  - ✅ Bypasses all payment checks
  - ✅ Shows as "Premium" in UI

---

## 📝 Environment Variables Reference

### Required for Polar.sh Checkout:
```bash
VITE_POLAR_ORGANIZATION_ID=your-org-slug     # From Polar dashboard
VITE_POLAR_PRODUCT_ID=your-product-id        # From product page in Polar
```

### Existing (Should already be set):
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key
VITE_FEEDBACK_EMAIL=your-email@example.com
```

---

## 🔄 What Happens in the Checkout Flow

### Current Flow (Option A - Checkout Links):
1. User clicks "Start Free Trial" on pricing page
2. App reads Polar org ID + product ID from env vars
3. Constructs URL: `https://polar.sh/{org-id}/products/{product-id}`
4. Redirects user to Polar.sh checkout page
5. User completes checkout on Polar (enters payment info)
6. Polar creates subscription with 30-day trial
7. **TODO in future**: Set up webhook to sync subscription back to your database

### Future Flow (Option B - Embedded):
- Checkout happens directly in your app
- Better UX (user never leaves your site)
- Requires installing `@polar-sh/sdk`

---

## 🔮 Next Steps (Future Work)

After getting basic checkout working, you'll want to:

### 1. Set Up Polar.sh Webhooks
So subscription changes sync back to your database.

**Create**: `supabase/functions/polar-webhooks/index.ts`
- Handles `subscription.created`
- Handles `subscription.updated`
- Handles `subscription.canceled`
- Updates your database with payment info

See: `docs/STRIPE_TO_POLAR_MIGRATION_SUMMARY.md` for webhook code example

### 2. Add Subscription Management Page
Let users:
- View subscription status
- Update payment method
- Cancel subscription
- Use Polar's customer portal

### 3. Upgrade to Embedded Checkout (Optional)
Better UX - users stay on your site during checkout.

---

## 🐛 Troubleshooting

### "Payment system not configured" error
**Problem**: Missing Polar.sh environment variables  
**Solution**: Check your `.env` file has `VITE_POLAR_ORGANIZATION_ID` and `VITE_POLAR_PRODUCT_ID`

### Checkout doesn't redirect
**Problem**: Environment variables not loaded  
**Solution**: 
1. Restart dev server (`npm run dev`)
2. Check browser console for errors
3. Verify env vars are set correctly

### Migration fails with "column already exists"
**Problem**: Migration already applied  
**Solution**: Skip to next migration or use Supabase Dashboard SQL Editor

### User granted lifetime premium but still sees "Trial"
**Problem**: Frontend cache or database not updated  
**Solutions**:
1. Log out and back in
2. Hard refresh (Cmd+Shift+R)
3. Verify in database: `SELECT * FROM lifetime_premium_users;`

---

## 📚 Documentation Reference

- **Polar.sh Integration**: `docs/POLAR_INTEGRATION_CHECKLIST.md`
- **Lifetime Premium Guide**: `docs/GRANT_LIFETIME_PREMIUM_GUIDE.md`
- **Migration Summary**: `docs/STRIPE_TO_POLAR_MIGRATION_SUMMARY.md`
- **Polar.sh Overview**: `docs/polar.sh.md`

---

## ✅ Quick Start Summary

**Minimum steps to get working:**

1. Apply migrations via Supabase Dashboard SQL Editor
2. Create Polar.sh account & product
3. Add Polar org ID and product ID to `.env`
4. Run `npm run dev` and test

**Estimated time**: 15-20 minutes

---

## 🎉 You're Almost Done!

Your app is code-complete and ready for Polar.sh. Just need to:
1. ✅ Apply the two database migrations
2. ✅ Set up Polar.sh account
3. ✅ Add environment variables
4. ✅ Test!

Good luck! 🚀

---

**Questions or Issues?**
- Check the troubleshooting section above
- Review the detailed guides in `/docs/`
- Polar.sh support: https://discord.gg/Pnhfz3UThd
