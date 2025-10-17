import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mic, BookOpen, ArrowRight, Sparkles, Play, Upload, CheckCircle, GitBranch, Brain } from 'lucide-react'
import { SatBrainMark } from '../brand/SatBrainMark'
import { FAQSection } from './FAQSection'
import { BuiltWithSection } from './BuiltWithSection'
import { ObsidianComparisonSection } from './ObsidianComparisonSection'
import { analytics } from '../Analytics/Analytics'
import './LandingPage.css'
import './LandingPage.modern.css'

// Allow custom element without TS complaints
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': any
    }
  }
}

interface LandingPageProps {
  onGetStarted: () => void
  onLogin: () => void
  // Optional Spline scene URL (e.g., https://prod.spline.design/xxxxx/scene.splinecode)
  splineUrl?: string
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, splineUrl }) => {
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

  // Load Spline viewer script if a scene URL is provided
  useEffect(() => {
    if (!splineUrl) return
    const scriptId = 'spline-viewer-script'
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.type = 'module'
      s.src = 'https://unpkg.com/@splinetool/viewer@latest/build/spline-viewer.js'
      s.id = scriptId
      document.head.appendChild(s)
    }
  }, [splineUrl])

  // Comprehensive SEO setup without touching index.html or adding deps
  useEffect(() => {
    const title = 'Sat-Brain: Obsidian Alternative with AI for Students | Smart Note-Taking'
    const description = 'The easiest Obsidian alternative for students. Get automatic linking, AI summaries, flashcards, and audio transcription—no plugins needed. Perfect for active recall and microlearning. Free 30-day trial, then $4.99/mo.'
    const keywords = [
      'Obsidian alternative',
      'Obsidian alternative for students',
      'AI note-taking app',
      'smart note-taking',
      'active recall study app',
      'Zettelkasten with AI',
      'note-taking with flashcards',
      'AI text summarizer',
      'note taking app',
      'lecture transcription',
      'meeting notes',
      'PDF summarizer',
      'document summarizer',
      'flashcards generator',
      'quiz generator',
      'knowledge graph',
      'AI note taker',
      'audio to text',
      'summarize pdf',
      'summarize document',
      'study tool',
      'microlearning app',
      'bidirectional links',
      'automatic note linking'
    ].join(', ')
    const siteUrl = window.location.origin
    const currentUrl = window.location.href
    const siteName = 'Sat‑Brain'
    const twitterHandle = '@satbrain' // Update with your actual Twitter handle
    // TODO: Add actual OG image URL when available
    const ogImage = `${siteUrl}/og-image.png` // You'll need to create this image
    const ogImageAlt = 'Sat‑Brain - AI-powered note-taking and study tool'

    document.title = title

    const upsertMeta = (attr: 'name' | 'property', key: string, value: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }

    // Standard meta tags
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', keywords)
    upsertMeta('name', 'author', siteName)
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    upsertMeta('name', 'googlebot', 'index, follow')
    
    // OpenGraph meta tags
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', currentUrl)
    upsertMeta('property', 'og:site_name', siteName)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:image:alt', ogImageAlt)
    upsertMeta('property', 'og:image:width', '1200')
    upsertMeta('property', 'og:image:height', '630')
    upsertMeta('property', 'og:locale', 'en_US')
    
    // Twitter Card meta tags
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:site', twitterHandle)
    upsertMeta('name', 'twitter:creator', twitterHandle)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
    upsertMeta('name', 'twitter:image:alt', ogImageAlt)
    
    // Additional SEO meta tags
    upsertMeta('name', 'theme-color', '#8b5cf6')
    upsertMeta('name', 'apple-mobile-web-app-capable', 'yes')
    upsertMeta('name', 'apple-mobile-web-app-status-bar-style', 'black-translucent')
    upsertMeta('name', 'apple-mobile-web-app-title', siteName)
    upsertMeta('name', 'application-name', siteName)
    upsertMeta('name', 'msapplication-TileColor', '#8b5cf6')

    // Canonical link
    const canonicalId = 'landing-canonical-link'
    let canonical = document.head.querySelector(`link#${canonicalId}[rel="canonical"]`) as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.id = canonicalId
      document.head.appendChild(canonical)
    }
    canonical.href = `${siteUrl}/`
  }, [])

  // Align the Quick Start card top to the hero title top for consistent visual rhythm
  useEffect(() => {
    const alignCard = () => {
      const root = document.querySelector('.landing-remix') as HTMLElement | null
      const title = document.querySelector('.landing-remix .hero-title') as HTMLElement | null
      const visual = document.querySelector('.landing-remix .hero-visual') as HTMLElement | null
      const card = document.querySelector('.landing-remix .qs-card') as HTMLElement | null
      if (!root || !title || !visual || !card) return
      const titleTop = title.getBoundingClientRect().top
      const visualTop = visual.getBoundingClientRect().top
      const offset = Math.max(0, Math.round(titleTop - visualTop))
      card.style.setProperty('--qs-top', `${offset}px`)
    }
    alignCard()
    window.addEventListener('resize', alignCard)
    return () => window.removeEventListener('resize', alignCard)
  }, [])

  // Schema.org structured data for SoftwareApplication
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sat-Brain',
    applicationCategory: 'Note-taking',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '4.99',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
      description: 'Free 30-day trial, then $4.99/month'
    },
    description: 'The easiest Obsidian alternative for students. Get automatic linking, AI summaries, flashcards, and audio transcription—no plugins needed. Perfect for active recall and microlearning.',
    featureList: [
      'AI-powered summarization',
      'Audio transcription',
      'Auto-generated flashcards',
      'Quiz generation',
      'Knowledge graph',
      'Automatic note linking',
      'PDF and document processing'
    ],
    alternativeTo: 'Obsidian'
  }

  return (
    <>
      {/* Schema.org SoftwareApplication structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <div className={`landing-page landing-remix ${splineUrl ? 'spline-on' : ''}`}>
        {/* Background glows inspired by mock */}
        <div className="remix-glows" aria-hidden="true">
          <div className="g1" />
          <div className="g2" />
        </div>

        {/* Navigation */}
        <nav className="landing-nav" aria-label="Main navigation">
          <div className="nav-container">
            <div className="nav-logo">
              <SatBrainMark className="logo-icon" theme="mono" variant="f" detail="low" aria-hidden="true" />
              <span>Sat‑Brain</span>
            </div>
            <div className="nav-links">
              <button onClick={scrollToFeatures} className="nav-link" aria-label="Navigate to features section">Features</button>
              <button onClick={scrollToPricing} className="nav-link" aria-label="Navigate to pricing section">Pricing</button>
              <button onClick={handleLogin} className="nav-button nav-login" aria-label="Log in to your account">Log In</button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          {/* Hero Section */}
          <section className="hero-section" aria-labelledby="hero-title">
        {splineUrl && (
          <div className="spline-wrap" aria-hidden="true">
            <div className="spline-inner">
              <spline-viewer url={splineUrl} style={{ width: '100%', height: '100%' }}></spline-viewer>
            </div>
          </div>
        )}
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-chip" role="status" aria-label="Product update announcement">
                <Sparkles size={14} aria-hidden="true" />
                <span>Better than Obsidian: AI-powered + zero setup required</span>
              </div>
              <h1 id="hero-title" className="hero-title">
                The Smart Obsidian Alternative for Students
              </h1>
              <p className="hero-subtitle">
                Skip the learning curve—get AI note-taking with automatic linking, flashcards, and audio transcription out of the box. Everything Obsidian offers, plus the AI features students actually need.
              </p>
              <div className="hero-cta-row">
                <button onClick={() => handleGetStarted('Hero Section')} className="hero-cta" aria-label="Try the easy Obsidian alternative free">
                  Try the Easy Obsidian Alternative Free
                  <ArrowRight className="cta-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
          <div className="hero-visual">
            <div className="hero-portal" aria-hidden="true">
              <div className="portal-glow" />
              <div className="portal-core" />
            </div>
            <div className="qs-card" role="region" aria-label="Get started in seconds">
              <div className="qs-header">
                <div className="qs-chip">Get started</div>
              </div>
              <div className="qs-grid">
                <div className="qs-col">
                  <div className="qs-label">Inputs</div>
                  <ul className="qs-list">
                    <li className="qs-item">
                      <Upload size={16} />
                      <span>Upload PDF or DOCX</span>
                    </li>
                    <li className="qs-item">
                      <Mic size={16} />
                      <span>Record audio</span>
                    </li>
                    <li className="qs-item">
                      <BookOpen size={16} />
                      <span>Paste any text</span>
                    </li>
                  </ul>
                </div>
                <div className="qs-col">
                  <div className="qs-label">Outputs</div>
                  <ul className="qs-list">
                    <li className="qs-item">
                      <Sparkles size={16} />
                      <span>Summary & key points</span>
                    </li>
                    <li className="qs-item">
                      <Brain size={16} />
                      <span>Flashcards & quiz</span>
                    </li>
                    <li className="qs-item">
                      <CheckCircle size={16} />
                      <span>Action items</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          </div>
          </section>

          {/* Features Section */}
          <section id="features" className="features-section" aria-labelledby="features-title">
          <div className="features-container">
            <h2 id="features-title" className="features-title">Why Students Choose Sat‑Brain Over Obsidian</h2>
            <div className="features-rows">
              <div className="features-grid features-mock row-top">
                <article className="feature-card">
                  <div className="feature-icon" aria-hidden="true"><Upload /></div>
                  <h3 className="feature-title">Auto-extract and summarize any content</h3>
                  <p className="feature-description">Upload PDFs, audio, or images—AI instantly extracts text and generates summaries. No manual note-taking required (unlike Obsidian).</p>
                </article>
                <article className="feature-card">
                  <div className="feature-icon" aria-hidden="true"><Mic /></div>
                  <h3 className="feature-title">Record + transcribe lectures automatically</h3>
                  <p className="feature-description">Built-in audio recording with live transcription. Obsidian requires third-party plugins; Sat-Brain has it built-in.</p>
                </article>
                <article className="feature-card">
                  <div className="feature-icon" aria-hidden="true"><BookOpen /></div>
                  <h3 className="feature-title">Notes that organize themselves</h3>
                  <p className="feature-description">Auto-tagging and smart folders mean less manual organization. Spend time learning, not configuring plugins.</p>
                </article>
              </div>
              <div className="features-grid features-mock row-bottom">
                <article className="feature-card">
                  <div className="feature-icon" aria-hidden="true"><Brain size={24} /></div>
                  <h3 className="feature-title">AI flashcards for active recall</h3>
                  <p className="feature-description">Generate flashcards and quizzes from any note—automatically. Perfect for microlearning and spaced repetition.</p>
                </article>
                <article className="feature-card">
                  <div className="feature-icon" aria-hidden="true"><GitBranch /></div>
                  <h3 className="feature-title">Knowledge graph (like Obsidian, but smarter)</h3>
                  <p className="feature-description">Automatic bidirectional links and AI-suggested connections. Get Obsidian's graph view without the manual [[linking]].</p>
                </article>
              </div>
            </div>
          </div>
          </section>

          {/* Obsidian Comparison Section */}
          <ObsidianComparisonSection />

          {/* Built With Section */}
          <BuiltWithSection />

          {/* Pricing - Second Hero Section */}
          <section id="pricing" className="pricing-hero-section" aria-labelledby="pricing-title">
            <div className="pricing-hero-container">
              <div className="pricing-hero-content">
                <div className="pricing-badge">
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Student-friendly pricing (Obsidian's plugins cost more)</span>
                </div>
                <h2 id="pricing-title" className="pricing-hero-title">
                  Obsidian + AI features for less than one coffee per month
                  <br />
                  Just <span className="price-highlight">$4.99</span>/month
                </h2>
                <p className="pricing-hero-subtitle">
                  No credit card required. Cancel anytime. Keep all your notes and summaries forever.
                </p>

                {/* What's Included */}
                <div className="whats-included">
                  <h3 className="included-title">Everything included:</h3>
                  <div className="included-grid">
                    <div className="included-item">
                      <CheckCircle size={20} aria-hidden="true" />
                      <span>Unlimited file uploads</span>
                    </div>
                    <div className="included-item">
                      <CheckCircle size={20} aria-hidden="true" />
                      <span>AI summaries & flashcards</span>
                    </div>
                    <div className="included-item">
                      <CheckCircle size={20} aria-hidden="true" />
                      <span>Audio transcription</span>
                    </div>
                    <div className="included-item">
                      <CheckCircle size={20} aria-hidden="true" />
                      <span>Knowledge graph</span>
                    </div>
                    <div className="included-item">
                      <CheckCircle size={20} aria-hidden="true" />
                      <span>Quiz generation</span>
                    </div>
                    <div className="included-item">
                      <CheckCircle size={20} aria-hidden="true" />
                      <span>Real-time sync</span>
                    </div>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="pricing-cta-section">
                  <button onClick={() => handleGetStarted('Pricing Section')} className="pricing-hero-cta" aria-label="See why students switched from Obsidian">
                    <span className="cta-text">See Why Students Switched from Obsidian</span>
                    <ArrowRight className="cta-icon" aria-hidden="true" />
                  </button>
                  <div className="pricing-reassurance">
                    <span className="reassurance-text">✓ No credit card required</span>
                    <span className="reassurance-divider">•</span>
                    <span className="reassurance-text">✓ Cancel anytime</span>
                  </div>
                </div>
              </div>

              {/* Pricing Visual - Value Comparison */}
              <div className="pricing-hero-visual">
                <div className="value-card">
                  <div className="value-card-header">
                    <span className="value-label">What you get</span>
                  </div>
                  <div className="value-comparison">
                    <div className="value-item">
                      <span className="value-service">Obsidian Sync</span>
                      <span className="value-price">$10/mo</span>
                    </div>
                    <div className="value-item">
                      <span className="value-service">Obsidian Publish</span>
                      <span className="value-price">$20/mo</span>
                    </div>
                    <div className="value-item">
                      <span className="value-service">AI plugins</span>
                      <span className="value-price">$10-20/mo</span>
                    </div>
                    <div className="value-divider"></div>
                    <div className="value-total">
                      <span className="value-total-label">Obsidian total:</span>
                      <span className="value-total-price">$40-50/mo</span>
                    </div>
                  </div>
                  <div className="value-card-footer">
                    <div className="your-price">
                      <span className="your-price-label">Sat-Brain:</span>
                      <span className="your-price-amount">$4.99/mo</span>
                    </div>
                    <div className="savings-badge">
                      Save $35-45/month
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works (better fit for a single-plan product) */}
          <section className="how-section" aria-labelledby="how-title">
          <div className="how-container">
            <h2 id="how-title" className="how-title">How Sat‑Brain works</h2>
            <p className="how-sub">Three quick steps to capture and connect your ideas.</p>
            <div className="how-grid">
              <article className="how-card">
                <Mic className="how-icon" aria-hidden="true" />
                <div>
                  <h3>Record or import</h3>
                  <p>Bring in audio, PDFs, or notes to start.</p>
                </div>
              </article>
              <article className="how-card">
                <Sparkles className="how-icon" size={28} aria-hidden="true" />
                <div>
                  <h3>AI summarizes</h3>
                  <p>Get clean notes, key points, and tasks automatically.</p>
                </div>
              </article>
              <article className="how-card">
                <BookOpen className="how-icon" aria-hidden="true" />
                <div>
                  <h3>Connect & recall</h3>
                  <p>Link ideas with the graph and find them in seconds.</p>
                </div>
              </article>
            </div>
            <div className="how-actions">
              <button onClick={() => handleGetStarted('How It Works Section')} className="cta-button" aria-label="Start free trial - no credit card needed">
                Start Free Trial — No Credit Card
                <ArrowRight className="cta-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
          </section>

          {/* FAQ Section */}
          <FAQSection />
        </main>

        {/* Footer */}
        <footer className="lp-footer">
          <div className="inner">
            <div>© {new Date().getFullYear()} Sat‑Brain. All rights reserved.</div>
            <nav className="links" style={{display:'flex',gap:'14px'}} aria-label="Footer navigation">
              <Link to="/privacy" aria-label="View privacy policy">Privacy</Link>
              <Link to="/terms" aria-label="View terms of service">Terms</Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  )
}
