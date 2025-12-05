import React from 'react';
import { X, Clock } from 'lucide-react';
import './TrialExpiringModal.css';

interface TrialExpiringModalProps {
  daysLeft: number;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialExpiringModal({ daysLeft, onClose, onUpgrade }: TrialExpiringModalProps) {
  const warningText = daysLeft === 1 
    ? "Your trial ends tomorrow"
    : `Your trial ends in ${daysLeft} days`;

  return (
    <div className="trial-expiring-overlay" onClick={onClose}>
      <div className="trial-expiring-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="close-button" aria-label="Close">
          <X size={24} />
        </button>
        
        <div className="warning-icon">
          <Clock size={48} />
        </div>
        
        <h2>{warningText}</h2>
        
        <p className="warning-message">
          Upgrade to Premium to keep unlimited access to all features.
          Otherwise, you'll be downgraded to the free plan with limited features.
        </p>
        
        <div className="premium-reminder">
          <strong>Just $9.99/month</strong> to keep:
          <ul>
            <li>✓ Unlimited summaries</li>
            <li>✓ Graph view & Infographics</li>
            <li>✓ Quiz generation & Flashcards</li>
            <li>✓ Advanced study tools</li>
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
