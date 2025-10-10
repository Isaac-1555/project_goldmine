# 🎯 New User Flow Implementation Plan

## Overview

Implementing a **no-credit-card trial** with automatic downgrade after 30 days.

---

## 🔄 New User Flow

```
Landing Page
    ↓ [CTA Button]
Pricing Page
    ↓ [Start Free Trial] or [Already have account? Sign In]
    ├─→ Sign In (existing users)
    └─→ Sign Up (new users)
          ↓
Trial Acknowledgment Screen
    ↓ [Got It, Start Using]
Dashboard (Full Premium Access)
    ↓ (27 days pass)
3-Day Warning Modal: "Trial ends in 3 days"
    ↓ (1 day passes)
2-Day Warning Modal: "Trial ends in 2 days"
    ↓ (1 day passes)
1-Day Warning Modal: "Trial ends tomorrow"
    ↓ (1 day passes)
Trial Expires → Auto-Downgrade to Free Tier
    ↓
Dashboard (Limited Features)
    ↓ [Upgrade to Premium]
Stripe Checkout → Payment → Premium Unlocked
```

---

## 📋 Implementation Tasks (20 items)

### Phase 1: Update Routing & Landing Page (Tasks 1-2)

#### Task 1: Update Landing Page CTAs
**Current:**
```tsx
// CTAs go to /signup or /login
onSignUp={() => navigate('/signup')}
```

**Change to:**
```tsx
// All CTAs go to /pricing
onGetStarted={() => navigate('/pricing')}
```

**Why:** Pricing page becomes the entry point where users choose Free vs Premium trial.

---

#### Task 2: Add Sign In Link to Pricing Page
**Add to PricingPage.tsx:**
```tsx
<div className="pricing-header">
  <h1>Choose Your Plan</h1>
  <p>Start with a 30-day free trial, no credit card required</p>
  
  {/* NEW */}
  <div className="existing-user">
    Already have an account?{' '}
    <button onClick={() => navigate('/login')} className="sign-in-link">
      Sign In
    </button>
  </div>
</div>
```

---

### Phase 2: Update Pricing Page (Tasks 3-4)

#### Task 3: Update Free Tier Features
**Current features:**
```tsx
free: [
  '3 summaries per week',
  'Basic note-taking',
  'Document upload',
  'Quiz generation',      // REMOVE
  'Flashcards',          // REMOVE
]
```

**New features:**
```tsx
free: [
  '3 summaries per week',
  'Basic note-taking',
  'Document upload',
  'Record lectures',     // ADD
]
```

**Also update premium features to include:**
```tsx
premium: [
  'Unlimited summaries',
  'Graph view visualization',
  'Infographics generation',
  'Advanced study tools',
  'Quiz generation',     // MOVE from free
  'Flashcards',         // MOVE from free
  'All basic features',
  'Priority support',
]
```

---

#### Task 4: Remove Stripe from Start Free Trial
**Current:**
```tsx
const handleStartTrial = async () => {
  // ... redirects to Stripe Checkout
  await redirectToCheckout();
};
```

**Change to:**
```tsx
const handleStartTrial = () => {
  if (!user) {
    // Redirect to signup with return path
    navigate('/signup?return=/pricing');
  } else {
    // Already logged in, just start trial
    navigate('/dashboard');
  }
};
```

---

### Phase 3: Trial Acknowledgment (Tasks 5-6)

#### Task 5: Create Trial Acknowledgment Component
**New file:** `src/components/Subscription/TrialAcknowledgment.tsx`

```tsx
interface Props {
  onAcknowledge: () => void;
}

export function TrialAcknowledgment({ onAcknowledge }: Props) {
  return (
    <div className="trial-acknowledgment-modal">
      <div className="acknowledgment-content">
        <div className="trial-icon">🎉</div>
        <h2>Welcome to Your 30-Day Free Trial!</h2>
        <div className="trial-details">
          <p>
            This free trial ends after <strong>30 days</strong>.
          </p>
          <p>
            You will have to pay <strong>$4.99 per month</strong> to continue 
            using all the features or be downgraded to the basic features.
          </p>
          <div className="trial-benefits">
            <h3>During your trial, you'll have access to:</h3>
            <ul>
              <li>✓ Unlimited summaries</li>
              <li>✓ Graph view</li>
              <li>✓ Infographics</li>
              <li>✓ Advanced study tools</li>
              <li>✓ All premium features</li>
            </ul>
          </div>
        </div>
        <button onClick={onAcknowledge} className="acknowledge-button">
          Got It, Start Using
        </button>
      </div>
    </div>
  );
}
```

---

#### Task 6: Update Signup Flow
**Modify:** `src/components/Auth/SignUpForm.tsx`

```tsx
const handleSignUp = async (email: string, password: string) => {
  try {
    await signUp(email, password);
    
    // NEW: Show trial acknowledgment instead of immediate redirect
    setShowTrialAcknowledgment(true);
  } catch (error) {
    // error handling
  }
};

// When acknowledged:
const handleAcknowledge = async () => {
  // Create trial subscription record
  await createTrialSubscription(user.id);
  
  // Navigate to dashboard
  navigate('/dashboard');
};
```

---

### Phase 4: Database Trial Logic (Tasks 7-8)

#### Task 7: Create Trial Subscription on Signup
**Option A: Database Trigger (Recommended)**

**New migration:** `supabase/migrations/[timestamp]_auto_trial_on_signup.sql`

```sql
-- Function to create trial subscription
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create trial subscription for new user
  INSERT INTO public.subscriptions (
    user_id,
    stripe_customer_id,
    status,
    trial_start,
    trial_end,
    current_period_end
  ) VALUES (
    NEW.id,
    '', -- No Stripe customer yet
    'trialing',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();
```

**Option B: Application Logic**

**New file:** `src/lib/subscriptionService.ts`

```ts
export async function createTrialSubscription(userId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      stripe_customer_id: '', // Empty until they upgrade
      status: 'trialing',
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
  if (error) throw error;
}
```

---

#### Task 8: Update SubscriptionContext for No-Card Trials
**Modify:** `src/contexts/SubscriptionContext.tsx`

```tsx
// Current logic only checks status
const hasActiveSubscription = subscription?.status === 'active' || 
                              subscription?.status === 'trialing';

// NEW: Also check trial hasn't expired
const isTrialValid = subscription?.trial_end 
  ? new Date(subscription.trial_end) > new Date()
  : false;

const hasActiveSubscription = 
  (subscription?.status === 'active') ||
  (subscription?.status === 'trialing' && isTrialValid);

const canAccessPremiumFeatures = hasActiveSubscription;
```

---

### Phase 5: Trial Expiring Notifications (Tasks 9-10)

#### Task 9: Create Trial Notification Hook
**New file:** `src/hooks/useTrialNotifications.ts`

```tsx
export function useTrialNotifications() {
  const { subscription, isTrialing } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isTrialing || !subscription?.trial_end) return;

    const checkTrialExpiry = () => {
      const now = new Date();
      const trialEnd = new Date(subscription.trial_end);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Show modal at 3, 2, 1 days before expiry
      if (daysRemaining <= 3 && daysRemaining > 0) {
        const lastShown = localStorage.getItem(`trial-warning-${daysRemaining}`);
        const today = new Date().toDateString();
        
        if (lastShown !== today) {
          setDaysLeft(daysRemaining);
          setShowModal(true);
          localStorage.setItem(`trial-warning-${daysRemaining}`, today);
        }
      }
    };

    checkTrialExpiry();
    const interval = setInterval(checkTrialExpiry, 1000 * 60 * 60); // Check hourly

    return () => clearInterval(interval);
  }, [subscription, isTrialing]);

  return { showModal, daysLeft, closeModal: () => setShowModal(false) };
}
```

---

#### Task 10: Create Trial Expiring Modal
**New file:** `src/components/Subscription/TrialExpiringModal.tsx`

```tsx
interface Props {
  daysLeft: number;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialExpiringModal({ daysLeft, onClose, onUpgrade }: Props) {
  const warningText = daysLeft === 1 
    ? "Your trial ends tomorrow"
    : `Your trial ends in ${daysLeft} days`;

  return (
    <div className="modal-overlay">
      <div className="trial-expiring-modal">
        <button onClick={onClose} className="close-button">×</button>
        
        <div className="warning-icon">⏰</div>
        <h2>{warningText}</h2>
        
        <p>
          Upgrade to Premium to keep unlimited access to all features.
          Otherwise, you'll be downgraded to the free plan with limited features.
        </p>
        
        <div className="premium-reminder">
          <strong>Just $4.99/month</strong> to keep:
          <ul>
            <li>Unlimited summaries</li>
            <li>Graph view & Infographics</li>
            <li>Advanced study tools</li>
          </ul>
        </div>
        
        <div className="modal-actions">
          <button onClick={onUpgrade} className="upgrade-button">
            Upgrade to Premium
          </button>
          <button onClick={onClose} className="later-button">
            Remind Me Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Usage in Dashboard:**
```tsx
function Dashboard() {
  const { showModal, daysLeft, closeModal } = useTrialNotifications();
  const navigate = useNavigate();

  return (
    <>
      {/* Dashboard content */}
      
      {showModal && daysLeft && (
        <TrialExpiringModal
          daysLeft={daysLeft}
          onClose={closeModal}
          onUpgrade={() => navigate('/pricing')}
        />
      )}
    </>
  );
}
```

---

### Phase 6: Trial Expiry Auto-Downgrade (Task 11)

#### Task 11: Implement Auto-Downgrade
**Option A: Database Function (Run via cron)**

**New migration:** `supabase/migrations/[timestamp]_expire_trials.sql`

```sql
CREATE OR REPLACE FUNCTION expire_trial_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE 
    status = 'trialing'
    AND trial_end < NOW()
    AND stripe_subscription_id = ''; -- Only auto-downgrade non-paid trials
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Set up Supabase Cron Job:**
```sql
-- In Supabase Dashboard → Database → Cron Jobs
-- Or use pg_cron extension

SELECT cron.schedule(
  'expire-trials',
  '0 0 * * *', -- Daily at midnight
  $$ SELECT expire_trial_subscriptions(); $$
);
```

**Option B: Edge Function (Scheduled)**

**New file:** `supabase/functions/expire-trials/index.ts`

```ts
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find expired trials
  const { data: expiredTrials } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'trialing')
    .eq('stripe_subscription_id', '') // No payment yet
    .lt('trial_end', new Date().toISOString())

  // Update to canceled
  if (expiredTrials && expiredTrials.length > 0) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .in('id', expiredTrials.map(s => s.id))
  }

  return new Response(
    JSON.stringify({ expired: expiredTrials?.length || 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Schedule via external cron service (cron-job.org, etc.):**
```
Daily at midnight:
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials
```

---

### Phase 7: Update Upgrade Flow (Task 12)

#### Task 12: Stripe Checkout for Upgrades
**Modify:** `src/components/Subscription/PricingPage.tsx`

```tsx
const handleStartTrial = async () => {
  const { subscription } = useSubscription();
  
  if (!user) {
    // Not logged in → Go to signup
    navigate('/signup');
    return;
  }
  
  if (subscription?.status === 'trialing') {
    // Already in trial → Go to dashboard
    navigate('/dashboard');
    return;
  }
  
  if (subscription?.status === 'canceled' || !subscription) {
    // Trial expired or never started → Upgrade with Stripe
    setIsLoading(true);
    try {
      await redirectToCheckout(); // NOW use Stripe
    } catch (error) {
      setError('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  }
};
```

---

### Phase 8: Theming (Tasks 13-15)

#### Task 13-15: Theme Pricing, Sign In, Sign Up Pages

**Check Landing Page theme:**
- Colors
- Fonts
- Button styles
- Gradient backgrounds
- Spacing

**Apply to:**
1. `src/components/Subscription/PricingPage.css`
2. `src/components/Auth/LoginForm.tsx` + styles
3. `src/components/Auth/SignUpForm.tsx` + styles

**Key elements to match:**
```css
/* Landing page uses: */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
font-family: 'Inter', system-ui, sans-serif;
button: {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 8px;
  padding: 12px 24px;
}
```

---

### Phase 9: UI Enhancements (Tasks 16-18)

#### Task 16: Add Upgrade Banner for Free Users
**Add to Dashboard.tsx:**

```tsx
function Dashboard() {
  const { subscription, isTrialing, canAccessPremiumFeatures } = useSubscription();
  
  const showUpgradeBanner = 
    subscription?.status === 'canceled' || 
    (!canAccessPremiumFeatures && !isTrialing);

  return (
    <div className="dashboard">
      {showUpgradeBanner && (
        <div className="upgrade-banner">
          <span>⭐ Unlock premium features</span>
          <button onClick={() => navigate('/pricing')}>
            Upgrade to Premium
          </button>
        </div>
      )}
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

---

#### Task 17: Update Premium Lock Messages
**Modify:** `src/components/Subscription/PremiumLock.tsx`

```tsx
export function PremiumLock({ feature, description }: Props) {
  const { isTrialing } = useSubscription();
  
  const message = isTrialing
    ? "Upgrade to keep this feature after your trial ends"
    : "Upgrade to Premium to access this feature";
  
  const buttonText = isTrialing
    ? "Upgrade to Keep Access"
    : "Upgrade to Premium";

  return (
    <div className="premium-lock">
      {/* ... */}
      <p>{message}</p>
      <button>{buttonText}</button>
    </div>
  );
}
```

---

#### Task 18: Add Trial Status Indicator
**Add to Layout/Header:**

```tsx
function Header() {
  const { subscription, isTrialing } = useSubscription();
  const navigate = useNavigate();

  const getTrialDaysLeft = () => {
    if (!subscription?.trial_end) return null;
    const daysLeft = Math.ceil(
      (new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft > 0 ? daysLeft : null;
  };

  const daysLeft = isTrialing ? getTrialDaysLeft() : null;

  return (
    <header>
      {/* ... other header content */}
      
      {daysLeft && (
        <div 
          className="trial-indicator"
          onClick={() => navigate('/pricing')}
        >
          Trial: {daysLeft} days left
        </div>
      )}
      
      {subscription?.status === 'canceled' && (
        <div className="free-plan-indicator">
          Free Plan
        </div>
      )}
    </header>
  );
}
```

---

### Phase 10: Testing (Tasks 19-20)

#### Task 19: Database Trigger Testing
**Test auto-trial creation:**
```sql
-- Manually test trigger
INSERT INTO auth.users (id, email) 
VALUES (gen_random_uuid(), 'test@example.com');

-- Check subscription was created
SELECT * FROM subscriptions WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
```

---

#### Task 20: End-to-End Testing
**Test complete flow:**

1. ✅ Landing page CTAs go to /pricing
2. ✅ Pricing page has "Already have account?" link
3. ✅ Free features list is correct
4. ✅ "Start Free Trial" goes to /signup
5. ✅ After signup, see trial acknowledgment
6. ✅ After acknowledgment, see dashboard with premium access
7. ✅ Trial subscription record created in database
8. ✅ Premium features work during trial
9. ✅ Fast-forward to 27 days → See 3-day warning
10. ✅ Next day → See 2-day warning
11. ✅ Next day → See 1-day warning
12. ✅ Next day → Trial expires, features lock
13. ✅ User reverted to free tier (3 summaries/week)
14. ✅ Upgrade banner shows
15. ✅ Click upgrade → Stripe checkout
16. ✅ Complete payment → Premium unlocks
17. ✅ All pages match landing page theme

---

## 🗂️ File Changes Summary

### New Files (8):
1. `src/components/Subscription/TrialAcknowledgment.tsx`
2. `src/components/Subscription/TrialAcknowledgment.css`
3. `src/components/Subscription/TrialExpiringModal.tsx`
4. `src/components/Subscription/TrialExpiringModal.css`
5. `src/hooks/useTrialNotifications.ts`
6. `src/lib/subscriptionService.ts` (optional)
7. `supabase/migrations/[timestamp]_auto_trial_on_signup.sql`
8. `supabase/migrations/[timestamp]_expire_trials.sql`
9. `supabase/functions/expire-trials/index.ts` (optional)

### Modified Files (10+):
1. `src/components/LandingPage/LandingPage.tsx` - Update CTAs
2. `src/components/Subscription/PricingPage.tsx` - Add sign-in link, update trial button
3. `src/components/Subscription/PricingPage.css` - Theme updates
4. `src/components/Auth/SignUpForm.tsx` - Add trial acknowledgment
5. `src/components/Auth/LoginForm.tsx` + CSS - Theme updates
6. `src/contexts/SubscriptionContext.tsx` - Support no-card trials
7. `src/components/Subscription/PremiumLock.tsx` - Update messages
8. `src/components/Dashboard/Dashboard.tsx` - Add upgrade banner, notifications
9. `src/components/Layout/Header.tsx` - Add trial indicator
10. `src/App.tsx` - Route updates if needed

---

## 🎯 Key Decision Points

### 1. Trial Creation: Trigger vs Application
**Recommendation:** Use **database trigger** for automatic trial creation.
- ✅ More reliable
- ✅ Can't be skipped
- ✅ Consistent

### 2. Trial Expiry: Cron vs Edge Function
**Recommendation:** Use **Supabase pg_cron** if available, otherwise **external cron + Edge Function**.
- ✅ Runs daily automatically
- ✅ No manual intervention

### 3. Notification Storage: LocalStorage vs Database
**Recommendation:** Use **localStorage** for "already shown today" tracking.
- ✅ Simple
- ✅ Per-device (user might see on multiple devices, that's okay)

---

## 📊 Timeline Estimate

- **Phase 1-2** (Routing & Pricing): 2-3 hours
- **Phase 3** (Trial Acknowledgment): 2 hours
- **Phase 4** (Database Logic): 2-3 hours
- **Phase 5** (Notifications): 3-4 hours
- **Phase 6** (Auto-Downgrade): 2 hours
- **Phase 7** (Upgrade Flow): 1 hour
- **Phase 8** (Theming): 3-4 hours
- **Phase 9** (UI Enhancements): 2-3 hours
- **Phase 10** (Testing): 2-3 hours

**Total:** ~20-28 hours of development time

---

## 🚀 Ready to Implement?

All tasks are documented in detail. Review the plan and let me know when you want to start implementing!
