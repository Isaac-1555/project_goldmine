import React from 'react';
import { ArrowRight } from 'lucide-react';
import './TrialAcknowledgment.css';

interface TrialAcknowledgmentProps {
  onAcknowledge: () => void;
}

export function TrialAcknowledgment({ onAcknowledge }: TrialAcknowledgmentProps) {
  return (
    <div className="trial-acknowledgment-overlay">
      <div className="trial-acknowledgment-modal">
        <div className="acknowledgment-content">
          <div className="trial-icon">🎉</div>
          <h2>Welcome to Your 30-Day Free Trial!</h2>
          <div className="trial-details">
            <p>
              This free trial ends after <strong>30 days</strong>.
            </p>
            <p>
              You will have to pay <strong>$9.99 per month</strong> to continue 
              using all the features or be downgraded to the basic features.
            </p>
            <div className="trial-benefits">
              <h3>During your trial, you'll have access to:</h3>
              <ul>
                <li>✓ Unlimited summaries</li>
                <li>✓ Graph view visualization</li>
                <li>✓ Infographics generation</li>
                <li>✓ Advanced study tools</li>
                <li>✓ Quiz generation & Flashcards</li>
                <li>✓ All premium features</li>
              </ul>
            </div>
          </div>
          <button onClick={onAcknowledge} className="acknowledge-button">
            Got It, Start Using
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
