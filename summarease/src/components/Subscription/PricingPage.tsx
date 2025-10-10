import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { redirectToCheckout } from '../../lib/stripe';
import { Check, Sparkles, Zap } from 'lucide-react';
import './PricingPage.css';

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
  const { isPremium, isTrialing, subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartTrial = async () => {
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
      setError(null);

      try {
        await redirectToCheckout();
      } catch (err: any) {
        console.error('Error starting checkout:', err);
        setError(err.message || 'Failed to start checkout. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        <div className="pricing-header">
          <h1>Choose Your Plan</h1>
          <p>Start with a 30-day free trial, no credit card required</p>
          
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
                <span className="price-amount">$4.99</span>
                <span className="price-period">/month</span>
              </div>
              <p className="trial-notice">
                <Zap size={16} />
                First 30 days free
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

            {isPremium ? (
              <div className="subscription-status">
                {isTrialing ? (
                  <>
                    <Check size={20} />
                    <span>Free Trial Active</span>
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    <span>Subscribed</span>
                  </>
                )}
              </div>
            ) : (
              <button 
                className="pricing-button primary"
                onClick={handleStartTrial}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Processing...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </button>
            )}
          </div>
        </div>

        <div className="pricing-faq">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-item">
            <h4>What happens after my trial ends?</h4>
            <p>
              After your 30-day free trial, you'll be asked to add a payment method to continue with Premium features. 
              If you choose not to subscribe, you'll automatically be moved to the Free plan with 3 summaries per week.
            </p>
          </div>
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>
              Yes! You can cancel your subscription at any time from your account settings. 
              You'll retain access to Premium features until the end of your billing period.
            </p>
          </div>
          <div className="faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>
              We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
