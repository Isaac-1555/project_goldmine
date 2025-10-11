import { useEffect } from 'react'

interface AnalyticsProps {
  trackingId?: string // Google Analytics Measurement ID (e.g., 'G-XXXXXXXXXX')
  enabled?: boolean
}

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('config', (window as any).GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Predefined event tracking functions for common actions
export const analytics = {
  // CTA button clicks
  trackCTAClick: (location: string) => {
    trackEvent('click', 'CTA', `Start Free Month - ${location}`)
  },
  
  // Navigation clicks
  trackNavigation: (destination: string) => {
    trackEvent('click', 'Navigation', destination)
  },
  
  // Login attempts
  trackLogin: () => {
    trackEvent('click', 'Authentication', 'Login Button')
  },
  
  // Scroll depth (trigger at 25%, 50%, 75%, 100%)
  trackScrollDepth: (percentage: number) => {
    trackEvent('scroll', 'Engagement', `Scrolled ${percentage}%`, percentage)
  },
  
  // FAQ interactions
  trackFAQClick: (question: string) => {
    trackEvent('click', 'FAQ', question)
  },
  
  // Video/demo plays (if you add video content)
  trackVideoPlay: (videoName: string) => {
    trackEvent('play', 'Video', videoName)
  },
  
  // Form submissions
  trackFormSubmission: (formName: string) => {
    trackEvent('submit', 'Form', formName)
  },
  
  // Outbound link clicks
  trackOutboundLink: (url: string) => {
    trackEvent('click', 'Outbound Link', url)
  },
}

/**
 * Analytics Component
 * 
 * Usage:
 * 1. Get your Google Analytics Measurement ID from analytics.google.com
 * 2. Add <Analytics trackingId="G-XXXXXXXXXX" /> to your root component
 * 3. Use analytics.trackXXX() functions throughout your app
 * 
 * Example:
 * <button onClick={() => { 
 *   analytics.trackCTAClick('Hero Section')
 *   onGetStarted() 
 * }}>
 *   Start Free Month
 * </button>
 */
export const Analytics: React.FC<AnalyticsProps> = ({ 
  trackingId, 
  enabled = true 
}) => {
  useEffect(() => {
    if (!enabled || !trackingId) {
      console.log('[Analytics] Tracking disabled or no tracking ID provided')
      return
    }

    // Don't track in development (optional - comment out to test in dev)
    if (import.meta.env.DEV) {
      console.log('[Analytics] Skipping in development mode')
      return
    }

    // Load Google Analytics script
    const script1 = document.createElement('script')
    script1.async = true
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
    document.head.appendChild(script1)

    const script2 = document.createElement('script')
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}', {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
      });
    `
    document.head.appendChild(script2)

    // Store tracking ID globally for event tracking
    ;(window as any).GA_TRACKING_ID = trackingId
    ;(window as any).gtag = function() {
      ;(window as any).dataLayer.push(arguments)
    }

    console.log('[Analytics] Google Analytics initialized with ID:', trackingId)

    // Optional: Track scroll depth
    let scrollDepthTracked = { 25: false, 50: false, 75: false, 100: false }
    const handleScroll = () => {
      const scrollPercentage = 
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100

      Object.keys(scrollDepthTracked).forEach((depth) => {
        const depthNum = parseInt(depth)
        if (scrollPercentage >= depthNum && !scrollDepthTracked[depthNum as keyof typeof scrollDepthTracked]) {
          scrollDepthTracked[depthNum as keyof typeof scrollDepthTracked] = true
          analytics.trackScrollDepth(depthNum)
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [trackingId, enabled])

  return null // This component doesn't render anything
}

export default Analytics
