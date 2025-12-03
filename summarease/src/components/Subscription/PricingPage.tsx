import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { Check, Sparkles, Zap } from 'lucide-react';
import './PricingPage.css';

// TODO: Replace with Polar.sh checkout implementation
// See docs/polar.sh.md for integration options

const FEATURES = {
  free: [
    '3 summaries per week',
    'Basic note-taking',
    'Document upload',
    'Record lectures',
  ],
  premium: [
    'Unlimited summaries',
    'Graph view visualization',
    'Infographics generation',
    'Advanced study tools',
    'Quiz generation',
    'Flashcards',
    'All basic features',
    'Priority support',
  ],
};

export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isTrialing, subscription, localTrialStatus, startLocalTrial } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocalTrial = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }
    
    setIsLoading(true);
    try {
      await startLocalTrial();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to start local trial:', err);
      setError(err.message || 'Failed to start trial');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePolarCheckout = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get direct Polar.sh checkout link from environment variables
      const checkoutLink = import.meta.env.VITE_POLAR_CHECKOUT_LINK;

      if (!checkoutLink) {
        console.error('❌ Missing Polar.sh checkout link');
        setError('Payment system not configured. Please contact support.');
        setIsLoading(false);
        return;
      }

      // Attach user identity to checkout via query params so Polar can send it back in webhooks
      const url = new URL(checkoutLink);

      if (user.email) {
        // Pre-fill email in Polar checkout, improves UX
        url.searchParams.set('customer_email', user.email);
      }

      // This will end up as subscription.metadata.reference_id on the Polar side
      url.searchParams.set('reference_id', user.id);

      // Redirect directly to Polar.sh checkout
      window.location.href = url.toString();
    } catch (err: any) {
      console.error('❌ Checkout error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Determine button visibility
  // Check if user has an active Polar subscription (trialing or active)
  const hasPolarSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  
  // Show Local Trial button if:
  // 1. User is not logged in OR
  // 2. Logged in, Local Trial not started, and no active Polar subscription
  const showLocalTrialBtn = !user || (localTrialStatus === 'not_started' && !hasPolarSubscription);
  
  // Show Polar Button if:
  // User does NOT have an active Polar subscription
  const showPolarBtn = !hasPolarSubscription;

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        <div className="pricing-header">
          <h1>Choose Your Plan</h1>
          <p>Start with a <strong>7-day free Premium trial</strong>, no credit card required.<br/>Add a card any time for <strong>30 extra days free</strong>.</p>
          
          {!user && (
            <div className="existing-user">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="sign-in-link">
                Sign In
              </button>
            </div>
          )}
        </div>


        {error && (
          <div className="pricing-error">
            {error}
          </div>
        )}

        <div className="pricing-cards">
          {/* Free Plan */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h2>Free</h2>
              <div className="pricing-price">
                <span className="price-amount">$0</span>
                <span className="price-period">/month</span>
              </div>
            </div>

            <ul className="pricing-features">
              {FEATURES.free.map((feature) => (
                <li key={feature}>
                  <Check size={20} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              className="pricing-button secondary"
              onClick={() => navigate('/dashboard')}
              disabled={isLoading}
            >
              {user ? 'Go to Dashboard' : 'Sign Up Free'}
            </button>
          </div>

          {/* Premium Plan */}
          <div className="pricing-card premium">
            <div className="pricing-badge">
              <Sparkles size={16} />
              <span>Most Popular</span>
            </div>
            
            <div className="pricing-card-header">
              <h2>Premium</h2>
              <div className="pricing-price">
                <span className="price-amount">$9.99</span>
                <span className="price-period">/month</span>
              </div>
              <p className="trial-notice">
                <Zap size={16} />
                First 7 days free (no card) + 30 days free (with card)
              </p>
            </div>

            <ul className="pricing-features">
              {FEATURES.premium.map((feature) => (
                <li key={feature}>
                  <Check size={20} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pricing-actions">
              {hasPolarSubscription ? (
                 <div className="subscription-status">
                    <Check size={20} />
                    <span>{subscription?.status === 'trialing' ? 'Polar Trial Active' : 'Subscribed'}</span>
                 </div>
              ) : (
                <>
                  {showLocalTrialBtn && (
                    <button 
                      className="pricing-button primary"
                      onClick={handleLocalTrial}
                      disabled={isLoading}
                      style={{ marginBottom: '10px' }}
                    >
                      Start Free Trial (7 Days)
                    </button>
                  )}
                  
                  {showPolarBtn && (
                    <button 
                      className={`pricing-button ${showLocalTrialBtn ? 'secondary' : 'primary'}`}
                      onClick={handlePolarCheckout}
                      disabled={isLoading}
                    >
                      Add card and get 30 days free
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pricing-faq">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-item">
             <h4>How do the trials work?</h4>
             <p>
               You can start a <strong>7-day local trial</strong> immediately without a credit card. 
               At any point (during or after those 7 days), you can add a payment method to start a <strong>30-day free trial</strong> powered by Polar. 
               These are separate: adding a card starts a fresh 30-day clock.
             </p>
          </div>
          <div className="faq-item">
            <h4>What happens after my trial ends?</h4>
            <p>
              After your 7-day local trial ends, you revert to the Free plan unless you add a card. 
              After your 30-day card-backed trial ends, you will be charged monthly unless you cancel.
            </p>
          </div>
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>
              Yes! You can cancel your subscription at any time from your account settings. 
              You'll retain access to Premium features until the end of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
