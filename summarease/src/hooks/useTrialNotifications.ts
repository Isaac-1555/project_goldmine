import { useState, useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

export function useTrialNotifications() {
  const { subscription, isTrialing } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isTrialing || !subscription?.trial_end) return;

    const checkTrialExpiry = () => {
      const trialEndValue = subscription?.trial_end
      if (!trialEndValue) return

      const now = new Date()
      const trialEnd = new Date(trialEndValue)
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Show modal at 3, 2, 1 days before expiry
      if (daysRemaining <= 3 && daysRemaining > 0) {
        const lastShown = localStorage.getItem(`trial-warning-${daysRemaining}`);
        const today = new Date().toDateString();
        
        // Only show once per day
        if (lastShown !== today) {
          setDaysLeft(daysRemaining);
          setShowModal(true);
          localStorage.setItem(`trial-warning-${daysRemaining}`, today);
        }
      }
    };

    // Check immediately
    checkTrialExpiry();
    
    // Check every hour
    const interval = setInterval(checkTrialExpiry, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, [subscription, isTrialing]);

  const closeModal = () => {
    setShowModal(false);
  };

  return { 
    showModal, 
    daysLeft, 
    closeModal 
  };
}
