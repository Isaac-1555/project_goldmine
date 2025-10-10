# Stripe Subscription Setup Guide

## ✅ What's Been Completed

### 1. Dependencies Installed
- `@stripe/stripe-js` - Stripe frontend SDK
- `stripe` - Stripe backend SDK for Edge Functions

### 2. Database Schema Created
Created the following tables in Supabase:
- **customers** - Maps users to Stripe customer IDs
- **subscriptions** - Stores subscription data (status, trial info, billing periods)
- **usage_tracking** - Tracks summary generation usage with rolling 7-day windows
- **payment_history** - Records payment transactions

Includes helpful database functions:
- `has_active_subscription(user_uuid)` - Check if user has active subscription
- `get_summary_count_7days(user_uuid)` - Get user's summary count in rolling window
- `increment_summary_usage(user_uuid)` - Track summary generation

### 3. Supabase Edge Functions Created
Three Edge Functions in `/supabase/functions/`:
- **create-checkout-session** - Creates Stripe Checkout for subscriptions with 30-day trial
- **create-portal-session** - Creates Stripe Customer Portal for subscription management
- **stripe-webhooks** - Handles Stripe webhook events to sync subscription status

### 4. React Context Created
- **SubscriptionContext** (`src/contexts/SubscriptionContext.tsx`) - Manages subscription state globally
  - Provides: `isPremium`, `isTrialing`, `canAccessPremiumFeatures`, `usage` data
  - Real-time sync with subscription changes
  - Usage tracking functions

### 5. Stripe Utilities
- **stripe.ts** (`src/lib/stripe.ts`) - Helper functions for Stripe operations
  - `redirectToCheckout()` - Redirect to Stripe Checkout
  - `redirectToPortal()` - Redirect to Customer Portal

### 6. Pricing Page UI
- **PricingPage** component with beautiful gradient design
- Shows Free vs Premium plans
- "Start Free Trial" button (no credit card required)
- FAQ section
- Responsive design

---

## 🔧 What You Need To Do

### Step 1: Set Up Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up or log in to your Stripe account
3. Switch to **Test Mode** (toggle in top right)

### Step 2: Create a Subscription Product

1. In Stripe Dashboard, go to **Products** → **Add product**
2. Fill in:
   - **Name**: "Premium Subscription" (or your app name)
   - **Description**: "Access to all premium features"
3. Under Pricing:
   - **Pricing model**: Standard pricing
   - **Price**: $4.99
   - **Billing period**: Monthly
   - **Currency**: USD
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`) - you'll need this!

### Step 3: Get Your Stripe API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (click "Reveal test key", starts with `sk_test_...`)
3. **Copy both keys** - you'll add them to your environment variables

### Step 4: Configure Environment Variables

#### Local Development (.env)
Add these to your `/Users/user/dev/project_goldmine/summarease/.env` file:

\`\`\`bash
# Add to your existing .env file
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
\`\`\`

#### Supabase Edge Functions
Set these secrets for your Edge Functions:

\`\`\`bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Set Stripe price ID
supabase secrets set STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# These should already be set, but verify:
supabase secrets list
\`\`\`

### Step 5: Deploy Edge Functions

Deploy the three Edge Functions to Supabase:

\`\`\`bash
# Deploy all functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhooks
\`\`\`

### Step 6: Set Up Stripe Webhooks

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   \`\`\`
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhooks
   \`\`\`
   (Get your project ref from Supabase dashboard URL)

4. Select these events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `checkout.session.completed`

5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)
7. Add it to Supabase secrets:
   \`\`\`bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
   \`\`\`

### Step 7: Configure Stripe Customer Portal

1. In Stripe Dashboard, go to **Settings** (gear icon in top right) → **Billing** → **Customer portal**
   - Or use direct link: https://dashboard.stripe.com/settings/billing/portal

2. You'll see the Customer portal configuration page. Click **Get started** or **Edit settings** if already activated

3. **Configure Features** - Under "Functionality", enable:
   - ✅ **Invoice history** - Allow customers to view invoices
   - ✅ **Update payment method** - Let customers add/change payment methods
   - ✅ **Cancel subscriptions** - Allow subscription cancellation
     - Choose: "Cancel immediately" or "Cancel at period end" (recommended)

4. **Configure Products** - Under "Products", you can:
   - Add your subscription product
   - Set up switching between plans (optional for now)

5. **Branding** (Optional but recommended):
   - Add your app name
   - Upload your logo
   - Set brand colors

6. **Business information**:
   - Add support email
   - Add terms of service URL (optional)
   - Add privacy policy URL (optional)

7. Click **Save changes**

8. The Customer Portal is now active! Test it by clicking **Preview** in the top right

### Step 8: Integrate into Your App

#### A. Wrap App with SubscriptionProvider

Update your `src/App.tsx`:

\`\`\`tsx
import { SubscriptionProvider } from './contexts/SubscriptionContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>  {/* Add this */}
            <AppContent />
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
\`\`\`

#### B. Add Pricing Route

Add the pricing page route to your app:

\`\`\`tsx
import { PricingPage } from './components/Subscription/PricingPage';

// In your Routes:
<Route path="/pricing" element={<PricingPage />} />
\`\`\`

#### C. Add Access Control to Premium Features

Wherever you have premium features (Graph view, Infographics, Study tools), add checks:

\`\`\`tsx
import { useSubscription } from '../contexts/SubscriptionContext';

function GraphView() {
  const { canAccessPremiumFeatures } = useSubscription();
  
  if (!canAccessPremiumFeatures) {
    return (
      <div className="premium-lock">
        <h3>Premium Feature</h3>
        <p>Upgrade to access Graph View</p>
        <button onClick={() => navigate('/pricing')}>
          View Plans
        </button>
      </div>
    );
  }
  
  return <div>Your Graph View Component</div>;
}
\`\`\`

#### D. Add Usage Limit to Summary Generation

In your summary generation code:

\`\`\`tsx
import { useSubscription } from '../contexts/SubscriptionContext';

function SummaryGenerator() {
  const { usage, incrementSummaryUsage, canAccessPremiumFeatures } = useSubscription();
  
  const handleGenerateSummary = async () => {
    // Check if user can generate summary
    if (!usage.canGenerateSummary) {
      alert(`You've reached your limit of ${usage.summaryLimit} summaries per week. Upgrade to Premium for unlimited summaries!`);
      navigate('/pricing');
      return;
    }
    
    // Generate summary
    await generateSummary();
    
    // Increment usage counter (only for free users)
    if (!canAccessPremiumFeatures) {
      await incrementSummaryUsage();
    }
  };
  
  return (
    <div>
      {!canAccessPremiumFeatures && (
        <p>Summaries remaining this week: {usage.summaryLimit - usage.summaryCount}</p>
      )}
      <button onClick={handleGenerateSummary}>Generate Summary</button>
    </div>
  );
}
\`\`\`

#### E. Add Subscription Management to Settings

Create a subscription settings page or add to existing settings:

\`\`\`tsx
import { useSubscription } from '../../contexts/SubscriptionContext';
import { redirectToPortal } from '../../lib/stripe';

function SubscriptionSettings() {
  const { subscription, isPremium, isTrialing } = useSubscription();
  
  return (
    <div>
      <h2>Subscription</h2>
      {isPremium ? (
        <>
          <p>Status: {isTrialing ? 'Free Trial' : 'Active'}</p>
          {subscription?.trial_end && (
            <p>Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}</p>
          )}
          <button onClick={redirectToPortal}>
            Manage Subscription
          </button>
        </>
      ) : (
        <>
          <p>Plan: Free</p>
          <button onClick={() => navigate('/pricing')}>
            Upgrade to Premium
          </button>
        </>
      )}
    </div>
  );
}
\`\`\`

---

## 🧪 Testing Your Integration

### 1. Test Stripe Checkout

1. Start your app: `npm run dev`
2. Navigate to `/pricing`
3. Click "Start Free Trial"
4. Use Stripe test card: **4242 4242 4242 4242**
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code
5. Complete checkout
6. Verify subscription is created in your database

### 2. Test Webhooks Locally

For local testing, use Stripe CLI:

\`\`\`bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhooks
\`\`\`

### 3. Test Customer Portal

1. As a subscribed user, try accessing the portal
2. Verify you can update payment method
3. Test canceling subscription
4. Check database updates

---

## 📋 Checklist Before Going Live

- [ ] Switch Stripe to Live Mode
- [ ] Update environment variables with live keys
- [ ] Set up live webhook endpoint
- [ ] Test live checkout with real card
- [ ] Configure production Customer Portal
- [ ] Set up billing email notifications
- [ ] Add terms of service and privacy policy links
- [ ] Test trial expiration flow
- [ ] Test payment failure handling

---

## 🐛 Troubleshooting

### Webhooks not working?
- Verify webhook secret is set correctly
- Check Supabase function logs: `supabase functions logs stripe-webhooks`
- Test webhook delivery in Stripe Dashboard

### Checkout redirect not working?
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check browser console for errors
- Ensure Edge Function is deployed

### Subscription not showing in app?
- Check database for subscription record
- Verify RLS policies allow user to read their data
- Check SubscriptionContext is properly wrapped

---

## 📚 Additional Resources

- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

## 🎯 Next Steps After Setup

1. Implement subscription status badges in your UI
2. Add email notifications for trial ending
3. Create usage analytics dashboard
4. Add promo code support
5. Implement referral program (optional)

Need help? Check the Stripe Dashboard logs and Supabase function logs for detailed error messages.
