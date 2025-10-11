/**
 * Performance Optimization Utilities
 * 
 * Utilities for improving Core Web Vitals and overall page performance
 */

/**
 * Lazy load images using Intersection Observer
 * 
 * Usage in HTML:
 * <img 
 *   data-src="actual-image.jpg" 
 *   src="placeholder.jpg" 
 *   class="lazy-load" 
 *   alt="Description"
 * />
 */
export const initLazyLoading = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.getAttribute('data-src')
          
          if (src) {
            img.src = src
            img.classList.remove('lazy-load')
            img.classList.add('lazy-loaded')
            observer.unobserve(img)
          }
        }
      })
    }, {
      rootMargin: '50px 0px', // Start loading 50px before image enters viewport
      threshold: 0.01
    })

    // Observe all images with lazy-load class
    document.querySelectorAll('img.lazy-load').forEach(img => {
      imageObserver.observe(img)
    })

    return imageObserver
  } else {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll<HTMLImageElement>('img.lazy-load').forEach(img => {
      const src = img.getAttribute('data-src')
      if (src) img.src = src
    })
  }
}

/**
 * Preload critical resources
 * 
 * Usage:
 * preloadResource('/fonts/inter-var.woff2', 'font', 'font/woff2')
 */
export const preloadResource = (
  href: string, 
  as: 'script' | 'style' | 'image' | 'font' | 'fetch', 
  type?: string
) => {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = href
  
  if (type) {
    link.type = type
  }
  
  if (as === 'font') {
    link.crossOrigin = 'anonymous'
  }
  
  document.head.appendChild(link)
}

/**
 * Defer non-critical CSS
 * 
 * Usage:
 * deferCSS('/styles/non-critical.css')
 */
export const deferCSS = (href: string) => {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.media = 'print' // Load as print stylesheet
  
  link.onload = () => {
    link.media = 'all' // Switch to all media after load
  }
  
  document.head.appendChild(link)
}

/**
 * Prefetch resources for future navigation
 * 
 * Usage:
 * prefetchResource('/app-dashboard.js')
 */
export const prefetchResource = (href: string) => {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

/**
 * Optimize third-party scripts by loading them asynchronously
 * 
 * Usage:
 * loadScriptAsync('https://example.com/widget.js')
 */
export const loadScriptAsync = (
  src: string, 
  onLoad?: () => void, 
  onError?: () => void
): HTMLScriptElement => {
  const script = document.createElement('script')
  script.src = src
  script.async = true
  
  if (onLoad) script.onload = onLoad
  if (onError) script.onerror = onError
  
  document.body.appendChild(script)
  return script
}

/**
 * Debounce function to limit expensive operations
 * 
 * Usage:
 * const debouncedResize = debounce(() => {
 *   console.log('Window resized')
 * }, 250)
 * window.addEventListener('resize', debouncedResize)
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function to limit execution frequency
 * 
 * Usage:
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event')
 * }, 100)
 * window.addEventListener('scroll', throttledScroll)
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Check if user prefers reduced motion (accessibility)
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get connection speed/type for adaptive loading
 */
export const getConnectionSpeed = (): 'slow' | 'medium' | 'fast' => {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection
  
  if (!connection) return 'medium'
  
  const effectiveType = connection.effectiveType
  
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow'
  } else if (effectiveType === '3g') {
    return 'medium'
  } else {
    return 'fast'
  }
}

/**
 * Measure and log Core Web Vitals
 * 
 * Requires web-vitals package:
 * npm install web-vitals
 */
export const measureWebVitals = () => {
  if (typeof window === 'undefined') return
  
  // Report to console in development
  const reportMetric = (metric: any) => {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric)
    
    // TODO: Send to analytics
    // analytics.trackEvent('web_vital', 'Performance', metric.name, metric.value)
  }

  // Measure largest contentful paint (LCP)
  // Good: < 2.5s, Needs improvement: 2.5s - 4s, Poor: > 4s
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        reportMetric({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          entries: entries
        })
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (e) {
      console.warn('[Web Vitals] LCP measurement not supported')
    }
  }

  // Measure first input delay (FID)
  // Good: < 100ms, Needs improvement: 100ms - 300ms, Poor: > 300ms
  if ('PerformanceObserver' in window) {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          reportMetric({
            name: 'FID',
            value: (entry as any).processingStart - entry.startTime,
            entry: entry
          })
        })
      })
      fidObserver.observe({ type: 'first-input', buffered: true })
    } catch (e) {
      console.warn('[Web Vitals] FID measurement not supported')
    }
  }

  // Measure cumulative layout shift (CLS)
  // Good: < 0.1, Needs improvement: 0.1 - 0.25, Poor: > 0.25
  if ('PerformanceObserver' in window) {
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            reportMetric({
              name: 'CLS',
              value: clsValue,
              entry: entry
            })
          }
        })
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch (e) {
      console.warn('[Web Vitals] CLS measurement not supported')
    }
  }
}

/**
 * Initialize all performance optimizations
 * 
 * Call this in your main App component:
 * useEffect(() => {
 *   initPerformanceOptimizations()
 * }, [])
 */
export const initPerformanceOptimizations = () => {
  // Initialize lazy loading for images
  initLazyLoading()
  
  // Measure Core Web Vitals in development
  if (import.meta.env.DEV) {
    measureWebVitals()
  }
  
  // Prefetch app routes for faster navigation (if using React Router)
  // prefetchResource('/dashboard')
  // prefetchResource('/app.js')
  
  console.log('[Performance] Optimizations initialized')
  console.log('[Performance] Connection speed:', getConnectionSpeed())
  console.log('[Performance] Prefers reduced motion:', prefersReducedMotion())
}

export default {
  initLazyLoading,
  preloadResource,
  deferCSS,
  prefetchResource,
  loadScriptAsync,
  debounce,
  throttle,
  prefersReducedMotion,
  getConnectionSpeed,
  measureWebVitals,
  initPerformanceOptimizations
}
