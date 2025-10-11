# Analytics Setup Guide

This guide will help you integrate Google Analytics into your Sat-Brain landing page.

## Quick Start

### 1. Get Your Google Analytics Tracking ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property (or use existing one)
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Add Analytics to Your Environment Variables

Add to your `.env` file:

```bash
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 3. Integrate Analytics Component

In your main `App.tsx` or root component, add:

```tsx
import { Analytics } from './components/Analytics/Analytics'

function App() {
  return (
    <>
      {/* Add Analytics component */}
      <Analytics 
        trackingId={import.meta.env.VITE_GA_TRACKING_ID}
        enabled={true}
      />
      
      {/* Rest of your app */}
      <Router>
        {/* ... */}
      </Router>
    </>
  )
}
```

### 4. Add Event Tracking to Landing Page CTAs

Update your `LandingPage.tsx` to track button clicks:

```tsx
import { analytics } from '../Analytics/Analytics'

// In your component:
<button 
  onClick={() => {
    analytics.trackCTAClick('Hero Section')
    onGetStarted()
  }} 
  className="hero-cta"
>
  Start Free Month
</button>

<button 
  onClick={() => {
    analytics.trackLogin()
    onLogin()
  }} 
  className="nav-login"
>
  Log In
</button>
```

## Available Tracking Functions

The `analytics` object provides these pre-built tracking functions:

### CTA Clicks
```tsx
analytics.trackCTAClick('Hero Section')
analytics.trackCTAClick('Pricing Section')
analytics.trackCTAClick('How It Works Section')
```

### Navigation
```tsx
analytics.trackNavigation('Features')
analytics.trackNavigation('Pricing')
```

### Authentication
```tsx
analytics.trackLogin()
```

### FAQ Interactions
```tsx
analytics.trackFAQClick('How does Sat-Brain work?')
```

### Scroll Depth
Automatically tracked at 25%, 50%, 75%, and 100% scroll depth.

### Custom Events
```tsx
import { trackEvent } from '../Analytics/Analytics'

trackEvent('action_name', 'category', 'label', value)
```

## Example: Complete Landing Page Integration

```tsx
// LandingPage.tsx
import { analytics } from '../Analytics/Analytics'

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onGetStarted, 
  onLogin 
}) => {
  const scrollToFeatures = () => {
    analytics.trackNavigation('Features')
    const featuresSection = document.getElementById('features')
    featuresSection?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToPricing = () => {
    analytics.trackNavigation('Pricing')
    const pricingSection = document.getElementById('pricing')
    pricingSection?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleGetStarted = (location: string) => {
    analytics.trackCTAClick(location)
    onGetStarted()
  }

  const handleLogin = () => {
    analytics.trackLogin()
    onLogin()
  }

  return (
    <div className="landing-page">
      <nav>
        <button onClick={scrollToFeatures}>Features</button>
        <button onClick={scrollToPricing}>Pricing</button>
        <button onClick={handleLogin}>Log In</button>
      </nav>

      <section className="hero">
        <button onClick={() => handleGetStarted('Hero Section')}>
          Start Free Month
        </button>
      </section>

      <section className="pricing">
        <button onClick={() => handleGetStarted('Pricing Section')}>
          Start Free Month
        </button>
      </section>

      <FAQSection />
    </div>
  )
}
```

## FAQ Section Analytics Integration

Update `FAQSection.tsx` to track FAQ clicks:

```tsx
import { analytics } from '../Analytics/Analytics'

const toggleFAQ = (index: number) => {
  if (openIndex !== index) {
    analytics.trackFAQClick(faqs[index].question)
  }
  setOpenIndex(openIndex === index ? null : index)
}
```

## Testing Analytics

### Development Mode
By default, analytics are disabled in development. To test:

1. Comment out lines 98-101 in `Analytics.tsx`:
```tsx
// if (import.meta.env.DEV) {
//   console.log('[Analytics] Skipping in development mode')
//   return
// }
```

2. Check browser console for tracking events
3. Use [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) Chrome extension

### Production Mode
1. Deploy your app
2. Visit Google Analytics dashboard
3. Go to **Realtime** view
4. Interact with your site and see events in real-time

## Important Notes

- **Privacy**: Make sure to add a privacy policy explaining analytics usage
- **Cookie Consent**: Consider adding a cookie consent banner (required in EU/GDPR regions)
- **Development**: Analytics are disabled by default in dev mode to avoid polluting data
- **Environment Variables**: Never commit your tracking ID to git - use environment variables

## Next Steps

1. ✅ Add tracking ID to environment variables
2. ✅ Add Analytics component to App.tsx
3. ✅ Add event tracking to all CTA buttons
4. ✅ Test in production
5. ⏳ Set up conversion goals in Google Analytics dashboard
6. ⏳ Create custom dashboards for key metrics
7. ⏳ Set up alerts for traffic anomalies

## Metrics to Track

Once set up, monitor these key metrics:

- **Conversion Rate**: % of visitors who click "Start Free Month"
- **CTA Performance**: Which CTA location converts best
- **Scroll Depth**: How far users scroll before leaving
- **FAQ Engagement**: Which questions are clicked most
- **Navigation Patterns**: How users move through the page
- **Time on Page**: Average engagement time
- **Bounce Rate**: % of visitors who leave immediately

## Alternative Analytics Options

If you prefer not to use Google Analytics:

- **Plausible Analytics**: Privacy-friendly, GDPR compliant
- **Fathom Analytics**: Simple, privacy-focused
- **Umami**: Open-source, self-hosted
- **PostHog**: Product analytics with session replay

To use an alternative, modify the `Analytics.tsx` component to use their SDK instead of Google Analytics.
