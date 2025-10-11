# 🎯 Complete Subscription User Flow

## Overview

Your app has a **freemium model** with a 30-day free trial that converts to a $4.99/month subscription.

---

## 🆓 Free Tier Users (No Subscription)

### What They Can Do:
- ✅ Upload documents (3 per week)
- ✅ View summaries
- ✅ Basic note-taking
- ✅ Quiz generation
- ✅ Basic flashcards

### What's Locked:
- 🔒 **Graph View** - Shows premium lock overlay
- 🔒 **Infographics** - Shows premium lock overlay
- 🔒 **Advanced Study Tools** - Shows premium lock overlay
- 🔒 **Upload limit** - Can only upload 3 documents per week

### Usage Tracking:
When they upload a document:
```
1. App checks: usage.canGenerateSummary
2. If under limit (< 3): Upload proceeds + counter increments
3. If at limit (≥ 3): Shows upgrade prompt
```

**What they see:**
```
📊 Summaries this week: 2 / 3
[⭐ Get Unlimited] button (shows when count ≥ 2)
```

---

## 💳 User Flow: Free → Premium

### Step 1: User Discovers Premium Features

**Trigger points:**
1. **Hits upload limit** (3 summaries)
   ```
   "You've reached your limit of 3 summaries per week. 
    Upgrade to Premium for unlimited summaries!"
   ```

2. **Clicks on locked feature** (Graph View, Infographics, Study Tools)
   ```
   Shows premium lock screen with:
   - 🔒 Lock icon
   - Feature name
   - Description
   - [Upgrade to Premium] button
   - "Start with 30-day free trial" text
   ```

3. **Clicks "Upgrade" in navigation** (if you add one)

4. **Manually visits `/pricing`**

### Step 2: Pricing Page (`/pricing`)

**What they see:**
```
┌──────────────────────────────────────────────┐
│         Choose Your Plan                     │
│   Start with 30-day free trial, no card     │
│                                              │
│  ┌──────────┐         ┌──────────────────┐ │
│  │   FREE   │         │    PREMIUM       │ │
│  │   $0     │         │  ⭐ Most Popular │ │
│  │ /month   │         │    $4.99/month   │ │
│  │          │         │  ⚡ First 30 days│ │
│  │ ✓ 3      │         │     free         │ │
│  │ summaries│         │                  │ │
│  │ per week │         │  ✓ Unlimited     │ │
│  │ ✓ Basic  │         │  ✓ Graph view    │ │
│  │ features │         │  ✓ Infographics  │ │
│  │          │         │  ✓ Study tools   │ │
│  │ [Go to   │         │                  │ │
│  │Dashboard]│         │  [Start Free     │ │
│  │          │         │   Trial] ←───────┤ │
│  └──────────┘         └──────────────────┘ │
└──────────────────────────────────────────────┘
```

### Step 3: Click "Start Free Trial"

**What happens:**
```javascript
1. User clicks button
2. PricingPage.tsx → handleStartTrial()
3. Checks: Is user logged in?
   - ❌ Not logged in → Navigate to /login
   - ✅ Logged in → Continue
4. Calls: redirectToCheckout() from stripe.ts
```

### Step 4: Backend Creates Checkout Session

**Frontend → Edge Function:**
```javascript
// stripe.ts calls:
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session

Headers:
- Authorization: Bearer [user's JWT token]
- Content-Type: application/json

Body: {}
```

**Edge Function (`create-checkout-session`):**
```typescript
1. Verify user is authenticated
2. Check if Stripe customer exists:
   - YES → Use existing customer ID
   - NO  → Create new Stripe customer + save to DB
3. Get STRIPE_PRICE_ID from environment
4. Create Stripe Checkout Session:
   {
     customer: [customer_id],
     line_items: [{ price: price_id, quantity: 1 }],
     mode: 'subscription',
     subscription_data: {
       trial_period_days: 30  // 🎉 FREE TRIAL
     },
     success_url: yourapp.com/subscription/success
     cancel_url: yourapp.com/pricing
   }
5. Return: { sessionId, url }
```

### Step 5: Redirect to Stripe Checkout

**User is redirected to:**
```
https://checkout.stripe.com/c/pay/cs_test_...
```

**What they see (Stripe-hosted page):**
```
┌─────────────────────────────────────┐
│  [Your Logo]  Premium Subscription  │
├─────────────────────────────────────┤
│                                     │
│  Email: user@example.com ✓          │
│                                     │
│  Card information                   │
│  ┌─────────────────────────────┐   │
│  │ 4242 4242 4242 4242         │   │
│  └─────────────────────────────┘   │
│  ┌──────────┐  ┌────────┐          │
│  │ MM / YY  │  │  CVC   │          │
│  └──────────┘  └────────┘          │
│                                     │
│  ⚡ Your trial starts today         │
│  💳 First charge on Nov 10, 2025   │
│  💰 $4.99/month after trial         │
│                                     │
│  [ Subscribe ]                      │
│                                     │
│  Powered by Stripe 🔒               │
└─────────────────────────────────────┘
```

**Important:**
- ✅ User can enter card details (required for trial)
- ✅ They are **NOT charged** today
- ✅ Stripe will charge $4.99 after 30 days
- ✅ User can cancel anytime during trial (no charge)

### Step 6: User Completes Checkout

**If successful:**
```
1. Stripe processes card validation
2. Creates subscription with status: "trialing"
3. Redirects back to: yourapp.com/subscription/success
```

**If canceled:**
```
1. Stripe shows cancellation
2. Redirects back to: yourapp.com/pricing
```

### Step 7: Webhook Updates Database

**While user is being redirected, Stripe sends webhook:**
```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhooks

Event: checkout.session.completed
```

**Edge Function (`stripe-webhooks`):**
```typescript
1. Verify webhook signature (security)
2. Extract subscription data
3. Upsert to database:
   - customers table: Create/update Stripe customer ID
   - subscriptions table: Create subscription record
     {
       user_id: [user_id],
       stripe_subscription_id: sub_xxx,
       status: 'trialing',
       trial_start: [now],
       trial_end: [now + 30 days],
       current_period_end: [trial_end],
       ...
     }
4. Return 200 OK
```

### Step 8: User Returns to App

**On `/subscription/success`:**
```typescript
1. Route automatically redirects to /dashboard
2. SubscriptionContext refreshes
3. Fetches new subscription from database
4. Sets: isPremium = true, isTrialing = true
```

### Step 9: Premium Features Unlock! 🎉

**What changes immediately:**
```
✅ No more upload limit indicator
✅ Graph View - accessible
✅ Infographics - accessible  
✅ Advanced Study Tools - accessible
✅ Can upload unlimited documents
```

**SubscriptionContext provides:**
```javascript
{
  subscription: {
    status: 'trialing',
    trial_end: '2025-11-10T...',
    ...
  },
  isPremium: true,
  isTrialing: true,
  canAccessPremiumFeatures: true,
  usage: {
    summaryCount: X,
    summaryLimit: Infinity,
    canGenerateSummary: true
  }
}
```

---

## 🔄 Ongoing: During Trial Period

### Daily:
- User has full access to all features
- No charges occur
- Usage tracking continues (but unlimited)

### Real-time Subscription Sync:
```typescript
// SubscriptionContext listens for changes
supabase
  .channel('subscription-changes')
  .on('postgres_changes', { table: 'subscriptions' })
  .subscribe()

// Automatically updates if subscription changes in DB
```

### Trial Ending:
**29 days in:**
- Stripe emails user: "Trial ending soon"
- *(You can add in-app notification too)*

**Day 30:**
- Stripe charges $4.99
- Webhook event: `invoice.paid`
- Database updates: status = 'active'
- User retains full access

**If payment fails:**
- Webhook event: `invoice.payment_failed`
- Database updates: status = 'past_due'
- App can show: "Payment failed, update card"

---

## ⚙️ Managing Subscription

### Step 1: User Wants to Manage/Cancel

**In your app (Settings page):**
```typescript
// When user clicks "Manage Subscription"
import { redirectToPortal } from './lib/stripe'

<button onClick={redirectToPortal}>
  Manage Subscription
</button>
```

### Step 2: Redirected to Stripe Customer Portal

**Edge Function (`create-portal-session`):**
```typescript
1. Get user's Stripe customer ID from database
2. Create Customer Portal session:
   {
     customer: customer_id,
     return_url: yourapp.com/settings
   }
3. Return portal URL
```

**User sees Stripe-hosted portal:**
```
┌─────────────────────────────────────┐
│  Customer Portal                     │
├─────────────────────────────────────┤
│  Subscription                        │
│  ● Premium - $4.99/month             │
│  Next billing: Dec 10, 2025          │
│  [Cancel subscription]               │
│                                      │
│  Payment methods                     │
│  ● •••• 4242  [Update]               │
│                                      │
│  Invoices                           │
│  📄 Nov 10 - $4.99  [Download]      │
│                                      │
│  [← Back to app]                    │
└─────────────────────────────────────┘
```

**What users can do:**
- ✅ Update payment method
- ✅ Cancel subscription
- ✅ View invoice history
- ✅ Download receipts

### Step 3: User Cancels

**In Customer Portal:**
```
1. User clicks "Cancel subscription"
2. Stripe asks: "Cancel now or at period end?"
3. User chooses "Cancel at period end" (recommended)
4. Stripe updates subscription
```

**Webhook triggers:**
```
Event: customer.subscription.updated

Data: {
  cancel_at_period_end: true,
  current_period_end: '2025-12-10'
}
```

**Database updates:**
```typescript
subscriptions table:
  cancel_at_period_end = true
  // User keeps access until Dec 10
```

**User experience:**
```
✅ Access continues until period end
✅ No refund (they paid for the month)
✅ Premium features work until Dec 10
⚠️ After Dec 10: Status changes to 'canceled'
```

### Step 4: After Cancellation

**On period end date:**
```
1. Stripe webhook: customer.subscription.deleted
2. Database updates: status = 'canceled'
3. SubscriptionContext refreshes
4. isPremium = false
5. User reverts to free tier:
   - 3 summaries/week limit
   - Premium features locked again
```

---

## 💾 Data Flow Summary

```
┌──────────────┐
│   Browser    │
│   (Your App) │
└──────┬───────┘
       │ 1. Click "Start Trial"
       ↓
┌──────────────────────┐
│  Supabase Edge Func  │
│ create-checkout-     │
│ session              │
└──────┬───────────────┘
       │ 2. Create session
       ↓
┌──────────────┐
│    Stripe    │ ← 3. User enters card
│   Checkout   │    (on Stripe's site)
└──────┬───────┘
       │ 4. Webhook
       ↓
┌──────────────────────┐
│  Supabase Edge Func  │
│  stripe-webhooks     │
└──────┬───────────────┘
       │ 5. Save to DB
       ↓
┌──────────────────────┐
│  Supabase Database   │
│  - customers         │
│  - subscriptions     │
│  - usage_tracking    │
└──────┬───────────────┘
       │ 6. Real-time sync
       ↓
┌──────────────┐
│ Subscription │
│   Context    │ → App updates!
└──────────────┘
```

---

## 🎬 Complete Timeline Example

### Day 0: New User Signs Up
```
✓ Creates account
✓ Free tier: 3 summaries/week
✓ Premium features locked
```

### Day 1: Hits Limit
```
✓ Uploads 3 documents
✗ Tries 4th → "Upgrade to Premium"
✓ Clicks upgrade → Pricing page
```

### Day 1: Subscribes
```
✓ Clicks "Start Free Trial"
✓ Enters card at Stripe Checkout
✓ Trial starts (no charge)
✓ Returns to app
✓ All features unlocked
```

### Days 2-29: Trial Period
```
✓ Unlimited access
✓ All premium features
✓ No charges
```

### Day 30: Trial Ends
```
✓ Stripe charges $4.99
✓ Status: trialing → active
✓ Access continues
✓ Email receipt sent
```

### Day 35: Wants to Cancel
```
✓ Goes to Settings
✓ Clicks "Manage Subscription"
✓ Portal → "Cancel at period end"
✓ Access continues until next billing
```

### Day 60: Subscription Ends
```
✓ Status: active → canceled
✓ Reverts to free tier
✓ 3 summaries/week limit restored
✓ Premium features locked
```

---

## 🔐 Security Features

1. **Webhook Signature Verification**
   - Ensures requests are from Stripe
   - Prevents fake webhook attacks

2. **User Authentication**
   - All Edge Functions require valid JWT
   - Can't create sessions for other users

3. **Row Level Security (RLS)**
   - Users can only see their own subscription
   - Enforced at database level

4. **HTTPS Only (Production)**
   - All data encrypted in transit
   - Stripe requires HTTPS for live mode

---

## 📊 What Users See at Each Stage

| Stage | Upload Limit | Graph View | Infographics | Study Tools | Badge |
|-------|-------------|------------|--------------|-------------|-------|
| **Free** | 3/week | 🔒 Locked | 🔒 Locked | 🔒 Locked | - |
| **Trial** | ♾️ Unlimited | ✅ Access | ✅ Access | ✅ Access | 🎉 Trial |
| **Active** | ♾️ Unlimited | ✅ Access | ✅ Access | ✅ Access | ✅ Premium |
| **Canceled** | 3/week | 🔒 Locked | 🔒 Locked | 🔒 Locked | - |

---

## 🎯 Key Takeaways

1. **Trial is 30 days, no charge upfront**
2. **Card required** (Stripe validates, doesn't charge)
3. **Auto-converts** to paid after trial
4. **Users can cancel** anytime
5. **Webhooks sync everything** automatically
6. **Real-time updates** via SubscriptionContext
7. **Graceful downgrade** when subscription ends

---

## 🚀 For Production

When you go live:
- Same flow works automatically
- Just use live Stripe keys
- Real charges happen
- Real customer portal
- Real email receipts

**Everything is already built and working!** 🎉
