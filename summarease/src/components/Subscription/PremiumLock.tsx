import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import './PremiumLock.css';

interface PremiumLockProps {
  feature: string;
  description?: string;
  children?: React.ReactNode;
}

export function PremiumLock({ feature, description, children }: PremiumLockProps) {
  const navigate = useNavigate();
  const { isTrialing } = useSubscription();
  
  const message = isTrialing
    ? "Upgrade to keep this feature after your trial ends"
    : "Upgrade to Premium to access this feature";
  
  const buttonText = isTrialing
    ? "Upgrade to Keep Access"
    : "Upgrade to Premium";

  return (
    <div className="premium-lock-container">
      <div className="premium-lock-overlay">
        <div className="premium-lock-content">
          <div className="premium-lock-icon">
            <Lock size={48} />
          </div>
          <h2>Premium Feature</h2>
          <p className="premium-lock-feature">{feature}</p>
          <p className="premium-lock-description">{message}</p>
          {description && (
            <p className="premium-lock-description">{description}</p>
          )}
          <button 
            className="premium-lock-button"
            onClick={() => navigate('/pricing')}
          >
            <Sparkles size={20} />
            {buttonText}
          </button>
          {!isTrialing && (
            <p className="premium-lock-trial">Start with 30-day free trial</p>
          )}
        </div>
      </div>
      {children && (
        <div className="premium-lock-preview">
          {children}
        </div>
      )}
    </div>
  );
}
