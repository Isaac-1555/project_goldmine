import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mic, BookOpen, ArrowRight, Sparkles, Play, Upload, CheckCircle, GitBranch, Brain, Menu, X } from 'lucide-react'
import { SatBrainMark } from '../brand/SatBrainMark'
import { FAQSection } from './FAQSection'
import { BuiltWithSection } from './BuiltWithSection'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

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
    const title = 'Sat-Brain: Study Better with Spaced Repetition, Active Recall, and Visual Mapping'
    const description = 'Most college students study the hard wayre-reading notes and cramming before exams. Sat-Brain helps you map your semester, use spaced repetition and active recall, and actually remember what you learn. A smarter study system for Obsidian/Notion users and everyone else.'
    const keywords = [
      'study app for college students',
      'spaced repetition app',
      'active recall study app',
      'visual knowledge map',
      'knowledge graph for students',
      'flashcards generator',
      'quiz generator',
      'AI note-taking app',
      'lecture transcription',
      'PDF summarizer',
      'document summarizer',
      'study tool',
      'microlearning app',
      'Obsidian alternative',
      'Obsidian alternative for studying',
      'Notion alternative for studying'
    ].join(', ')
    const siteUrl = window.location.origin
    const currentUrl = window.location.href
    const siteName = 'SatBrain'
    const twitterHandle = '@satbrain' // Update with your actual Twitter handle
    // TODO: Add actual OG image URL when available
    const ogImage = `${siteUrl}/og-image.png` // You'll need to create this image
    const ogImageAlt = 'SatBrain - research-backed study app with spaced repetition and visual mapping'

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
      price: '9.99',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
      description: 'Free 30-day trial, then $9.99/month'
    },
    description:
      'Sat-Brain is a research-backed study app for college students that combines spaced repetition, active recall quizzes, and a visual knowledge map so you actually remember what you learn.',
    featureList: [
      'Visual knowledge map that connects concepts across classes',
      'Spaced repetition and active recall with quizzes and flashcards',
      'AI-powered summarization of lectures, PDFs, and documents',
      'Audio transcription',
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
            <div className="nav-links desktop-nav">
              <button onClick={scrollToFeatures} className="nav-link" aria-label="Navigate to features section">Features</button>
              <button onClick={scrollToPricing} className="nav-link" aria-label="Navigate to pricing section">Pricing</button>
              <button onClick={handleLogin} className="nav-button nav-login" aria-label="Log in to your account">Log In</button>
            </div>

            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="mobile-menu">
              <button onClick={() => { scrollToFeatures(); setIsMobileMenuOpen(false) }} className="nav-link mobile-link">Features</button>
              <button onClick={() => { scrollToPricing(); setIsMobileMenuOpen(false) }} className="nav-link mobile-link">Pricing</button>
              <button onClick={() => { handleLogin(); setIsMobileMenuOpen(false) }} className="nav-button nav-login mobile-btn">Log In</button>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main>
          {/* Hero Section */}
          <section className="hero-section" aria-labelledby="hero-title">
        {splineUrl && (
          <div className="spline-wrap" aria-hidden="true">
            <div className="spline-inner">
              {/* @ts-ignore: custom web component provided by Spline */}
              <spline-viewer url={splineUrl} style={{ width: '100%', height: '100%' }}></spline-viewer>
            </div>
          </div>
        )}
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-chip" role="status" aria-label="Study science announcement">
                <Sparkles size={14} aria-hidden="true" />
                <span>Visual Map, Quizzes and Flashcards</span>
              </div>
              <h1 id="hero-title" className="hero-title">
                From scattered notes to
                <br />
                Connected Knowledge
              </h1>
              <p className="hero-subtitle">
                Sat-Brain maps your notes across every class, quizzes you with spaced repetition, and helps you see how concepts connect, so you remember what matters when it matters.
              </p>
              <div className="hero-cta-row">
                <button
                  onClick={() => handleGetStarted('Hero - Map your semester')}
                  className="hero-cta"
                  aria-label="Map your semester with a visual knowledge map"
                >
                  Map your semester
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

          {/* Problem Section: why current studying fails */}
          <section id="study-problem" className="features-section" aria-labelledby="study-problem-title">
            <div className="features-container">
              <h2 id="study-problem-title" className="features-title">Identifying the GAPS in your study approach</h2>
              <div className="features-grid">
                <article className="feature-card">
                  <h3 className="feature-title">Incomplete Notes</h3>
                  <p className="feature-description">
                    Incomplete or illegible notes arise from distractions or difficulty focusing in class.
                  </p>
                </article>
                <article className="feature-card">
                  <h3 className="feature-title">Blind to the Big Picture</h3>
                  <p className="feature-description">
                    Different classes, different notebooks, zero connections. You know the concepts relate, but you can't see how.
                  </p>
                </article>
                <article className="feature-card">
                  <h3 className="feature-title">Re-reading, yet Forgetting</h3>
                  <p className="feature-description">
                    You spend hours re-reading notes, but it never sticks. Come exam time, you're cramming anyway.
                  </p>
                </article>
              </div>
            </div>
          </section>

          {/* Value pillars: what Sat-Brain does differently */}
          <section id="features" className="features-section" aria-labelledby="features-title">
              <div className="features-container">
              <h2 id="features-title" className="features-title">A smarter study system that matches how your brain learns</h2>
              <div className="how-actions features-cta">
                <button
                  onClick={() => handleGetStarted('Features - Map your semester')}
                  className="cta-button"
                  aria-label="Map your semester with Sat-Brain"
                >
                  Study smarter today
                  <ArrowRight className="cta-icon" aria-hidden="true" />
                </button>
              </div>
              <div className="features-rows">
                <div className="features-grid features-mock row-top">
                  <article className="feature-card">
                    <div className="feature-icon" aria-hidden="true">
                      <GitBranch />
                    </div>
                    <h3 className="feature-title">Map your semester with a visual knowledge graph</h3>
                    <p className="feature-description">
                      See how everything you're learning connects. Sat-Brain turns scattered notes into a knowledge map so you can spot
                      patterns across courses and finally understand how econ, calc, and history relate.
                    </p>
                  </article>
                  <article className="feature-card">
                    <div className="feature-icon" aria-hidden="true">
                      <Brain />
                    </div>
                    <h3 className="feature-title">Spaced repetition and active recall, built in</h3>
                    <p className="feature-description">
                      Turn any reading, lecture, or PDF into quizzes and flashcards in seconds. Research shows spaced repetition and
                      retrieval practice can boost recall from about 60% with cramming to around 80% when you review over time.
                    </p>
                  </article>
                  <article className="feature-card">
                    <div className="feature-icon" aria-hidden="true">
                      <Mic />
                    </div>
                    <h3 className="feature-title">Capture anything—lectures, slides, PDFs, or raw notes</h3>
                    <p className="feature-description">
                      Upload PDFs, record lectures, or paste text. Sat-Brain transcribes, summarizes, and pulls out key ideas so you
                      can spend less time formatting notes and more time actually learning.
                    </p>
                  </article>
                </div>
                <div className="features-grid features-mock row-bottom">
                  <article className="feature-card">
                    <div className="feature-icon" aria-hidden="true">
                      <BookOpen />
                    </div>
                    <h3 className="feature-title">Study tools that fit short sessions</h3>
                    <p className="feature-description">
                      Use quick quizzes and flashcards between classes instead of marathon cram sessions. Microlearning with spaced
                      repetition helps you chip away at tough subjects without burning out.
                    </p>
                  </article>
                  <article className="feature-card">
                    <div className="feature-icon" aria-hidden="true">
                      <Sparkles />
                    </div>
                    <h3 className="feature-title">Evidence-based, not just another note app</h3>
                    <p className="feature-description">
                      Sat-Brain is grounded in 80+ years of learning science—spaced repetition, active recall, and visual learning—so
                      you're not guessing whether your study method will actually work.
                    </p>
                </article>
                </div>
              </div>
            </div>
          </section>

          {/* Built With Section */}
          <BuiltWithSection />

          {/* Pricing - Second Hero Section */}
          <section id="pricing" className="pricing-hero-section" aria-labelledby="pricing-title">
            <div className="pricing-hero-container">
              <div className="pricing-hero-content">
                <div className="pricing-badge">
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Student-friendly pricing for serious studying</span>
                </div>
                <h2 id="pricing-title" className="pricing-hero-title">
                  Stop juggling apps and prompts.
                  <br />
                  Summaries, flashcards, quizzes just for{' '}
                  <span className="price-highlight">$9.99</span>/month
                </h2>
                <p className="pricing-hero-subtitle">
                  No credit card required for the first 7 days. Additional <span className="price-highlight">1 month free</span> when you add a card. Cancel anytime. Keep all your notes.
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
                <button
                  onClick={() => handleGetStarted('Pricing Section - Start retaining what you learn')}
                  className="pricing-hero-cta"
                  aria-label="Start retaining what you learn with Sat-Brain"
                >
                    <span className="cta-text">Start retaining what you learn</span>
                    <ArrowRight className="cta-icon" aria-hidden="true" />
                  </button>
                  <div className="pricing-reassurance">
                    <span className="reassurance-text">✓ No credit card required</span>
                    <span className="reassurance-divider">•</span>
                    <span className="reassurance-text">✓ Cancel anytime</span>
                  </div>
                </div>
              </div>

              {/* Pricing Visual - Value Summary */}
              <div className="pricing-hero-visual">
                <div className="value-card">
                  <div className="value-card-header">
                    <span className="value-label">What you're investing in</span>
                  </div>
                  <div className="value-comparison">
                    <div className="value-item">
                      <span className="value-service">Visual knowledge map for your semester</span>
                      <span className="value-price">Included</span>
                    </div>
                    <div className="value-item">
                      <span className="value-service">Spaced repetition quizzes & flashcards</span>
                      <span className="value-price">Included</span>
                    </div>
                    <div className="value-item">
                      <span className="value-service">AI summaries & lecture transcription</span>
                      <span className="value-price">Included</span>
                    </div>
                    <div className="value-divider"></div>
                    <div className="value-total">
                    <span className="value-total-label">Total study system:</span>
                    <span className="value-total-price">Focused learning. No waste time</span>
                    </div>
                  </div>
                  <div className="value-card-footer">
                    <div className="your-price">
                      <span className="your-price-label">Your price:</span>
                      <span className="your-price-amount">$9.99/mo</span>
                    </div>
                    <div className="savings-badge">
                      All-in-one study hub
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works (quick overview) */}
          <section className="how-section" aria-labelledby="how-title">
            <div className="how-container">
              <h2 id="how-title" className="how-title">How SatBrain works</h2>
              <p className="how-sub">Capture once, map it visually, then review with quizzes and flashcards.</p>
              <div className="how-grid">
                <article className="how-card">
                  <Mic className="how-icon" aria-hidden="true" />
                  <div>
                    <h3>Capture your inputs</h3>
                    <p>Upload PDFs and slides, paste notes, or record lectures. Sat-Brain pulls out the key ideas automatically.</p>
                  </div>
                </article>
                <article className="how-card">
                  <Sparkles className="how-icon" size={28} aria-hidden="true" />
                  <div>
                    <h3>Build a knowledge map</h3>
                    <p>Concepts are connected into a visual graph so you can see how topics across classes relate and reinforce each other.</p>
                  </div>
                </article>
                <article className="how-card">
                  <BookOpen className="how-icon" aria-hidden="true" />
                  <div>
                    <h3>Review with science-backed tools</h3>
                    <p>Use spaced repetition quizzes and flashcards to keep what matters fresh, even in short 10–20 minute sessions.</p>
                  </div>
                </article>
              </div>
              <div className="how-actions">
                <button
                  onClick={() => handleGetStarted('How It Works Section - Start retaining what you learn')}
                  className="cta-button"
                  aria-label="Start retaining what you learn with Sat-Brain"
                >
                  Start building your knowledge map
                  <ArrowRight className="cta-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* Product gallery section with real screenshots */}
          <section className="how-section" aria-labelledby="gallery-title">
            <div className="how-container">
              <h2 id="gallery-title" className="how-title">See your knowledge differently</h2>
              <p className="how-sub">
                Get a feel for what Sat-Brain actually looks like in actionfrom your knowledge map to quizzes and your study dashboard.
              </p>
              <div className="how-grid">
                <article className="how-card gallery-card">
                  <div className="gallery-media">
                    <img
                      src="/landing/knowledge-map.png"
                      alt="Screenshot of Sat-Brain's knowledge map showing connected topics across classes."
                      loading="lazy"
                    />
                  </div>
                  <div className="gallery-copy">
                    <h3>Knowledge map view</h3>
                    <p>
                      A visual graph of your semester, showing how concepts from different classes connect. This is where you'll see
                      the “Map your semester” view.
                    </p>
                  </div>
                </article>
                <article className="how-card gallery-card">
                  <div className="gallery-media gallery-media-split">
                    <img
                      src="/landing/quiz.png"
                      alt="Screenshot of a multiple-choice quiz question in Sat-Brain."
                      loading="lazy"
                    />
                    <img
                      src="/landing/flashcards.png"
                      alt="Screenshot of Sat-Brain flashcards showing the front and back of a card."
                      loading="lazy"
                    />
                  </div>
                  <div className="gallery-copy">
                    <h3>Quizzes and flashcards</h3>
                    <p>
                      Adaptive quizzes and flashcards that resurface what you're about to forget, so you can practice active recall in
                      short, focused sessions.
                    </p>
                  </div>
                </article>
                <article className="how-card gallery-card">
                  <div className="gallery-media">
                    <img
                      src="/landing/study-dashboard.png"
                      alt="Screenshot of Sat-Brain's study dashboard with progress and upcoming reviews."
                      loading="lazy"
                    />
                  </div>
                  <div className="gallery-copy">
                    <h3>Study dashboard</h3>
                    <p>
                      A simple overview of what you've captured, what's coming up, and where you're strongest or weakestso you always
                      know what to review next.
                    </p>
                  </div>
                </article>
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
