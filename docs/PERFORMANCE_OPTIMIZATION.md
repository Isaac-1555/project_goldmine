# Performance Optimization Guide

This guide covers performance optimizations for achieving excellent Core Web Vitals scores and fast page loads.

## Quick Start

### 1. Initialize Performance Utilities

Add to your main `App.tsx`:

```tsx
import { useEffect } from 'react'
import { initPerformanceOptimizations } from './utils/performance'

function App() {
  useEffect(() => {
    initPerformanceOptimizations()
  }, [])
  
  return (
    // Your app
  )
}
```

### 2. Add Lazy Loading CSS

Add to your main CSS file:

```css
/* Lazy loading images */
img.lazy-load {
  opacity: 0;
  transition: opacity 0.3s;
}

img.lazy-loaded {
  opacity: 1;
}
```

## Core Web Vitals Targets

### Largest Contentful Paint (LCP)
- **Good**: < 2.5 seconds
- **Needs Improvement**: 2.5 - 4.0 seconds
- **Poor**: > 4.0 seconds

**How to improve:**
- Optimize images (use WebP format, proper sizing)
- Preload critical resources
- Minimize CSS blocking
- Use CDN for static assets

### First Input Delay (FID)
- **Good**: < 100 milliseconds
- **Needs Improvement**: 100 - 300 milliseconds
- **Poor**: > 300 milliseconds

**How to improve:**
- Minimize JavaScript execution time
- Break up long tasks
- Use web workers for heavy computation
- Defer non-critical JavaScript

### Cumulative Layout Shift (CLS)
- **Good**: < 0.1
- **Needs Improvement**: 0.1 - 0.25
- **Poor**: > 0.25

**How to improve:**
- Always include size attributes on images and videos
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use CSS aspect-ratio or min-height

## Image Optimization

### 1. Use Modern Formats

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.avif" type="image/avif">
  <img src="image.jpg" alt="Description" width="800" height="600">
</picture>
```

### 2. Lazy Load Images

```html
<!-- For images below the fold -->
<img 
  data-src="/images/large-image.jpg" 
  src="/images/placeholder.jpg" 
  class="lazy-load" 
  alt="Description"
  width="800"
  height="600"
>
```

### 3. Responsive Images

```html
<img 
  srcset="
    image-320w.jpg 320w,
    image-640w.jpg 640w,
    image-1280w.jpg 1280w
  "
  sizes="(max-width: 320px) 280px,
         (max-width: 640px) 600px,
         1200px"
  src="image-640w.jpg"
  alt="Description"
>
```

### 4. Image Compression Tools

- **Online**: TinyPNG, Squoosh, ImageOptim
- **CLI**: `imagemin`, `sharp`, `svgo` (for SVGs)
- **Build tools**: Add to Vite config

## CSS Optimization

### 1. Critical CSS Inline

Extract and inline critical CSS for above-the-fold content:

```html
<head>
  <style>
    /* Critical CSS here */
    .hero-section { /* ... */ }
  </style>
  
  <!-- Defer non-critical CSS -->
  <link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles/main.css"></noscript>
</head>
```

### 2. Remove Unused CSS

Use PurgeCSS or similar tools:

```bash
npm install @fullhuman/postcss-purgecss --save-dev
```

### 3. Minimize CSS Files

Ensure production builds minify CSS (Vite does this automatically).

## JavaScript Optimization

### 1. Code Splitting

Split large bundles into smaller chunks:

```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./Dashboard'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  )
}
```

### 2. Defer Non-Critical Scripts

```html
<script src="/analytics.js" defer></script>
<script src="/chat-widget.js" async></script>
```

### 3. Tree Shaking

Ensure you're importing only what you need:

```tsx
// ❌ Bad - imports entire library
import _ from 'lodash'

// ✅ Good - imports only what's needed
import debounce from 'lodash/debounce'
```

## Font Optimization

### 1. Preload Critical Fonts

```html
<link 
  rel="preload" 
  href="/fonts/inter-var.woff2" 
  as="font" 
  type="font/woff2" 
  crossorigin
>
```

### 2. Use font-display

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* or 'optional' for even better performance */
  font-weight: 100 900;
}
```

### 3. Subset Fonts

Only include characters you need:

```bash
# Using pyftsubset (part of fonttools)
pyftsubset font.ttf \
  --output-file=font-subset.woff2 \
  --flavor=woff2 \
  --unicodes=U+0000-00FF
```

## Network Optimization

### 1. Enable HTTP/2

Most modern hosting platforms support this automatically.

### 2. Use CDN

Serve static assets from a CDN:
- Cloudflare
- Vercel Edge Network
- AWS CloudFront
- Netlify

### 3. Enable Compression

Ensure your server sends compressed responses:
```
Content-Encoding: gzip
Content-Encoding: br (Brotli - even better)
```

### 4. Cache Static Assets

Set proper cache headers:

```nginx
# Example nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

## Vite Build Optimizations

Update your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  server: {
    hmr: {
      overlay: false, // Disable error overlay for cleaner dev experience
    },
  },
})
```

## Monitoring Performance

### 1. Use Lighthouse

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://yourdomain.com --view
```

### 2. Use Chrome DevTools

1. Open DevTools (F12)
2. Go to **Performance** tab
3. Click **Record** and interact with your site
4. Analyze the flame chart for bottlenecks

### 3. Use WebPageTest

Visit [webpagetest.org](https://www.webpagetest.org) and test from multiple locations.

### 4. Real User Monitoring (RUM)

Implement the performance utilities to track real user metrics:

```tsx
import { measureWebVitals } from './utils/performance'

useEffect(() => {
  measureWebVitals()
}, [])
```

## Performance Checklist

### Images
- [ ] Images are in WebP or AVIF format
- [ ] Images include width/height attributes
- [ ] Below-the-fold images use lazy loading
- [ ] Images are properly compressed
- [ ] Responsive images for different screen sizes

### CSS
- [ ] Critical CSS is inlined
- [ ] Non-critical CSS is deferred
- [ ] Unused CSS is removed
- [ ] CSS is minified in production

### JavaScript
- [ ] Code splitting implemented
- [ ] Third-party scripts are deferred/async
- [ ] Tree shaking configured
- [ ] Source maps disabled in production
- [ ] Console logs removed in production

### Fonts
- [ ] Critical fonts are preloaded
- [ ] font-display: swap or optional
- [ ] Fonts are subsetted if possible
- [ ] Using variable fonts where applicable

### Network
- [ ] HTTP/2 enabled
- [ ] Assets served from CDN
- [ ] Gzip/Brotli compression enabled
- [ ] Proper cache headers set

### Core Web Vitals
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

### Build
- [ ] Production build is optimized
- [ ] Bundle size analyzed
- [ ] Code splitting working correctly
- [ ] Source maps available for debugging

## Advanced Optimizations

### 1. Implement Service Worker for Caching

```typescript
// sw.ts
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/styles/main.css',
        '/scripts/main.js',
      ])
    })
  )
})
```

### 2. Prefetch Next Page Resources

```tsx
import { prefetchResource } from './utils/performance'

// When user hovers over "Start Free Month" button
<button
  onMouseEnter={() => {
    prefetchResource('/dashboard')
  }}
  onClick={onGetStarted}
>
  Start Free Month
</button>
```

### 3. Adaptive Loading Based on Connection

```tsx
import { getConnectionSpeed } from './utils/performance'

function App() {
  const connectionSpeed = getConnectionSpeed()
  
  return (
    <>
      {connectionSpeed === 'fast' && <HighQualityImage />}
      {connectionSpeed === 'medium' && <MediumQualityImage />}
      {connectionSpeed === 'slow' && <LowQualityImage />}
    </>
  )
}
```

### 4. Respect User Preferences

```tsx
import { prefersReducedMotion } from './utils/performance'

function AnimatedComponent() {
  const reduceMotion = prefersReducedMotion()
  
  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.5 }}
    >
      Content
    </motion.div>
  )
}
```

## Testing Checklist

Before deploying:

1. Run Lighthouse audit (aim for 90+ scores)
2. Test on slow 3G connection
3. Test on mobile devices
4. Check all images load correctly
5. Verify no layout shifts on page load
6. Test with JavaScript disabled (progressive enhancement)
7. Verify fonts load quickly with proper fallbacks

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Bundle Analyzer](https://www.npmjs.com/package/rollup-plugin-visualizer)

## Next Steps

1. Implement lazy loading for images
2. Set up performance monitoring
3. Optimize images and convert to WebP
4. Implement code splitting for large components
5. Set up continuous performance monitoring in CI/CD
