# Quick Integration Examples

## How to Lock Premium Features

### 1. Graph View (Full Lock)

```tsx
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PremiumLock } from '../Subscription/PremiumLock';

export function GraphView() {
  const { canAccessPremiumFeatures } = useSubscription();

  if (!canAccessPremiumFeatures) {
    return (
      <PremiumLock 
        feature="Graph View"
        description="Visualize your notes and documents as an interactive knowledge graph"
      />
    );
  }

  return (
    <div>
      {/* Your actual graph view component */}
    </div>
  );
}
```

### 2. Infographics (Full Lock)

```tsx
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PremiumLock } from '../Subscription/PremiumLock';

export function InfographicsTab() {
  const { canAccessPremiumFeatures } = useSubscription();

  if (!canAccessPremiumFeatures) {
    return (
      <PremiumLock 
        feature="Infographics"
        description="Generate beautiful infographics from your study materials"
      />
    );
  }

  return (
    <div>
      {/* Your actual infographics component */}
    </div>
  );
}
```

### 3. Study Tools (Full Lock)

```tsx
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PremiumLock } from '../Subscription/PremiumLock';

export function StudyTools() {
  const { canAccessPremiumFeatures } = useSubscription();

  if (!canAccessPremiumFeatures) {
    return (
      <PremiumLock 
        feature="Advanced Study Tools"
        description="Access spaced repetition, custom quizzes, and more"
      />
    );
  }

  return (
    <div>
      {/* Your actual study tools */}
    </div>
  );
}
```

### 4. Summary Generation (Usage Limit)

Find where you generate summaries and add this logic:

```tsx
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

export function YourSummaryComponent() {
  const navigate = useNavigate();
  const { usage, incrementSummaryUsage, canAccessPremiumFeatures } = useSubscription();

  const handleGenerateSummary = async () => {
    // Check if user can generate summary
    if (!usage.canGenerateSummary) {
      // Show upgrade prompt
      if (window.confirm(
        `You've reached your limit of ${usage.summaryLimit} summaries per week. ` +
        `Upgrade to Premium for unlimited summaries!`
      )) {
        navigate('/pricing');
      }
      return;
    }

    try {
      // YOUR EXISTING SUMMARY GENERATION CODE HERE
      await generateSummary();
      
      // Track usage (only for free users)
      if (!canAccessPremiumFeatures) {
        await incrementSummaryUsage();
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  return (
    <div>
      {/* Show remaining summaries for free users */}
      {!canAccessPremiumFeatures && (
        <div className="usage-indicator">
          <p>
            Summaries remaining this week: {usage.summaryLimit - usage.summaryCount}
          </p>
          {usage.summaryCount >= 2 && (
            <button onClick={() => navigate('/pricing')}>
              Get Unlimited Summaries
            </button>
          )}
        </div>
      )}
      
      <button onClick={handleGenerateSummary}>
        Generate Summary
      </button>
    </div>
  );
}
```

## App.tsx Integration

Update your `src/App.tsx` to include the SubscriptionProvider and pricing route:

```tsx
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { PricingPage } from './components/Subscription';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>  {/* ADD THIS */}
            <AppContent />
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={...} />
      <Route path="/login" element={...} />
      <Route path="/signup" element={...} />
      <Route path="/dashboard" element={...} />
      
      {/* ADD THIS ROUTE */}
      <Route path="/pricing" element={<PricingPage />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

## Subscription Settings Section

Add this to your settings page:

```tsx
import { useSubscription } from '../../contexts/SubscriptionContext';
import { redirectToPortal } from '../../lib/stripe';
import { useNavigate } from 'react-router-dom';

export function SubscriptionSettings() {
  const navigate = useNavigate();
  const { 
    subscription, 
    isPremium, 
    isTrialing,
    usage,
    isLoading 
  } = useSubscription();

  if (isLoading) {
    return <div>Loading subscription...</div>;
  }

  return (
    <div className="subscription-settings">
      <h2>Subscription</h2>
      
      {isPremium ? (
        <div className="subscription-active">
          <div className="status-badge">
            {isTrialing ? '🎉 Free Trial Active' : '✅ Premium Active'}
          </div>
          
          {subscription?.trial_end && isTrialing && (
            <p>
              Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}
            </p>
          )}
          
          {!isTrialing && subscription?.current_period_end && (
            <p>
              Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          
          <button onClick={redirectToPortal}>
            Manage Subscription
          </button>
        </div>
      ) : (
        <div className="subscription-free">
          <p>Current Plan: <strong>Free</strong></p>
          <p>Summaries used this week: {usage.summaryCount} / {usage.summaryLimit}</p>
          
          <button onClick={() => navigate('/pricing')}>
            Upgrade to Premium
          </button>
          
          <div className="premium-benefits">
            <h4>Premium Benefits:</h4>
            <ul>
              <li>Unlimited summaries</li>
              <li>Graph view</li>
              <li>Infographics</li>
              <li>Advanced study tools</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Navigation Links

Add a "Pricing" or "Upgrade" link to your navigation:

```tsx
import { useSubscription } from '../contexts/SubscriptionContext';

function Navigation() {
  const { isPremium } = useSubscription();

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      {!isPremium && (
        <Link to="/pricing" className="upgrade-link">
          ⭐ Upgrade
        </Link>
      )}
      <Link to="/settings">Settings</Link>
    </nav>
  );
}
```

## Success Page (Optional)

Create a success page for after checkout:

```tsx
// src/components/Subscription/SuccessPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';

export function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription data
    refreshSubscription();
    
    // Redirect to dashboard after 3 seconds
    const timeout = setTimeout(() => {
      navigate('/dashboard');
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="success-page">
      <h1>🎉 Welcome to Premium!</h1>
      <p>Your free trial has started. Enjoy all premium features!</p>
      <p>Redirecting to dashboard...</p>
    </div>
  );
}

// Add this route to App.tsx:
<Route path="/subscription/success" element={<SubscriptionSuccess />} />
```

## Where to Find Files

- **Database Schema**: `/supabase/migrations/20251010172600_create_subscription_tables.sql`
- **Edge Functions**: `/supabase/functions/` (create-checkout-session, create-portal-session, stripe-webhooks)
- **React Context**: `src/contexts/SubscriptionContext.tsx`
- **Stripe Utils**: `src/lib/stripe.ts`
- **UI Components**: `src/components/Subscription/` (PricingPage, PremiumLock)
- **Setup Guide**: `STRIPE_SETUP_GUIDE.md`

## Need Help?

1. Check `STRIPE_SETUP_GUIDE.md` for complete setup instructions
2. View Stripe Dashboard for webhook delivery and payment logs
3. Check Supabase function logs: `supabase functions logs <function-name>`
4. Verify environment variables are set correctly
