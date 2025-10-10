import React, { useEffect } from 'react'
import { Mic, BookOpen, ArrowRight, Sparkles, Play, Upload, CheckCircle, GitBranch, Brain } from 'lucide-react'
import { SatBrainMark } from '../brand/SatBrainMark'
import './LandingPage.css'

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
    const featuresSection = document.getElementById('features')
    featuresSection?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing')
    pricingSection?.scrollIntoView({ behavior: 'smooth' })
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

  // Lightweight SEO setup without touching index.html or adding deps
  useEffect(() => {
    const title = 'Sat‑Brain — AI text summarizer, note‑taking, and lecture transcription'
    const description = 'Sat‑Brain is an AI text summarizer and note‑taking app for students and professionals. Record and transcribe audio, summarize PDFs & DOCX, auto‑generate flashcards and quizzes, and connect ideas in a knowledge graph.'
    const keywords = [
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
      'study tool'
    ].join(', ')

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

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', keywords)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', window.location.href)

    // Canonical link
    const canonicalId = 'landing-canonical-link'
    let canonical = document.head.querySelector(`link#${canonicalId}[rel="canonical"]`) as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.id = canonicalId
      document.head.appendChild(canonical)
    }
    canonical.href = `${window.location.origin}/`
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

  return (
    <>
      {/* Scoped style overrides to match mock without editing external CSS */}
      <style>{`
        .landing-remix {
          position: relative;
          min-height: 100vh;
          background: radial-gradient(650px circle at 20% 10%, rgba(139,92,246,0.22), transparent 60%),
                      radial-gradient(800px circle at 80% 60%, rgba(99,102,241,0.16), transparent 60%),
                      #0a0a12 !important;
          color: #e5e7eb;
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          overflow-x: hidden; /* prevent horizontal scroll from oversized decorative layers */
        }
        .landing-remix .landing-nav {
          background: rgba(10,10,18,0.6) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          backdrop-filter: blur(12px);
        }
        /* When Spline is active, simplify background and remove old glows */
        .landing-remix.spline-on { background: #0a0a12 !important; }
        .landing-remix.spline-on .remix-glows { display: none !important; }
        .landing-remix.spline-on .hero-portal { display: none !important; }
        .landing-remix.spline-on .hero-visual { min-height: 640px; overflow: hidden; }
        .landing-remix.spline-on .spline-wrap { opacity: 1; }
        .landing-remix.spline-on .spline-inner { width:100%; height:100%; transform: scale(1.08); transform-origin: center; }
        /* Nav link focus handling to avoid pill-like default ring on click */
        .landing-remix .nav-link {
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          border: 0;
          color: #e5e7eb;
          padding: 0.375rem 0.5rem;
          border-radius: 8px;
        }
        .landing-remix .nav-link:focus { outline: none; }
        .landing-remix .nav-link:focus-visible {
          outline: 2px solid rgba(139,92,246,0.65);
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.15);
          border-radius: 10px;
        }
        .landing-remix .nav-button.nav-login{
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          position: relative;
          isolation: isolate;
        }
        .landing-remix .nav-button.nav-login::before{
          content: '';
          position: absolute; inset: -2px; border-radius: 999px; z-index: -1;
          background: linear-gradient(135deg,#8b5cf6, #22d3ee);
          opacity: .55;
          filter: blur(6px);
        }
        .landing-remix .hero-section {
          padding-top: 7rem !important;
          position: relative;
          z-index: 1;
        }
        .landing-remix .hero-container{position:relative;z-index:1}
        .landing-remix .hero-content{position:relative;z-index:2}
        .landing-remix .hero-title {
          font-size: clamp(2.25rem, 4.2vw + 1rem, 4.5rem) !important;
          color: #fff !important;
          letter-spacing: -0.02em;
        }
.landing-remix .hero-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#e5e7eb;font-size:12px;border-radius:999px;padding:6px 10px;margin-bottom:16px}
        .landing-remix .hero-subtitle {
          color: #cbd5e1 !important;
          max-width: 44ch;
        }
        .landing-remix .hero-cta-row{display:flex;gap:12px;flex-wrap:wrap}
        .landing-remix .hero-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#cbd5e1;border:1px solid rgba(255,255,255,0.15);border-radius:999px;padding:.75rem 1.25rem}
        .landing-remix .hero-ghost:hover{background:rgba(255,255,255,0.06)}
        .landing-remix .hero-cta,
        .landing-remix .cta-button {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #22d3ee 100%) !important;
          color: #fff !important;
          box-shadow: 0 12px 24px -8px rgba(99,102,241,0.35);
        }
        .landing-remix .hero-cta:hover,
        .landing-remix .cta-button:hover {
          transform: translateY(-2px);
        }
        .landing-remix .floating-card {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .landing-remix .features-section { position: relative; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02)) !important; }
        .landing-remix .features-section:before{content:'';position:absolute;inset:0;background:conic-gradient(from 180deg at 50% 50%, rgba(99,102,241,0.25), rgba(139,92,246,0.18), rgba(99,102,241,0.25));opacity:.12;pointer-events:none}
        .landing-remix .features-container{position:relative;z-index:1}
        .landing-remix .features-mock{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
        .landing-remix .features-rows{display:grid;gap:24px}
        .landing-remix .features-grid.row-top{grid-template-columns:repeat(3,1fr)}
        .landing-remix .features-grid.row-bottom{grid-template-columns:repeat(2,1fr)}
        @media (max-width: 900px){.landing-remix .features-grid.row-top{grid-template-columns:1fr}.landing-remix .features-grid.row-bottom{grid-template-columns:1fr}}
        .landing-remix .feature-card {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          border-radius: 18px;
        }
        .landing-remix .feature-icon svg{width:32px;height:32px;color:#e5e7eb}
        .landing-remix .cta-section {
          background: transparent !important;
        }
        .remix-glows { pointer-events: none; position: absolute; inset: 0; overflow: hidden; z-index: 0; }
        .remix-glows .g1 { position: absolute; top: -22%; left: 50%; width: 1100px; height: 1100px; transform: translateX(-50%); filter: blur(64px); opacity: .45; background: radial-gradient(closest-side, rgba(139,92,246,0.48), rgba(18,18,27,0)); }
        .remix-glows .g2 { position: absolute; bottom: -25%; right: -10%; width: 800px; height: 800px; filter: blur(60px); opacity: .30; background: radial-gradient(closest-side, rgba(99,102,241,0.42), rgba(18,18,27,0)); }

        /* Hero portal + glass preview + Spline */
        .landing-remix .hero-visual{position:relative;min-height:420px}
        .landing-remix .spline-wrap{position:absolute;inset:0;z-index:0;pointer-events:auto;opacity:.9;overflow:hidden}
        .landing-remix .spline-wrap::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) calc(100% - 72px), #0a0a12 100%);pointer-events:none;}        
        .landing-remix .spline-inner{position:absolute;left:0;top:0;width:100%;height:100%;transform:scale(1.05);transform-origin:center;pointer-events:auto;}
        .landing-remix .hero-portal{position:absolute;left:0;right:0;bottom:0;height:280px;z-index:1}
        .landing-remix .portal-glow{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:min(1200px,92vw);height:240px;background:radial-gradient(120% 120% at 50% 100%, rgba(168,85,247,0.75) 0%, rgba(99,102,241,0.6) 35%, rgba(99,102,241,0.18) 70%, rgba(0,0,0,0) 78%);filter:blur(22px);opacity:.95}
        .landing-remix .portal-core{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);width:min(620px,60vw);height:160px;border-radius:999px;background:radial-gradient(120% 160% at 50% 120%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.92) 60%, rgba(0,0,0,1) 70%)}
        .landing-remix .glass-preview{position:absolute;right:12px;top:12px;width:360px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.55);backdrop-filter:blur(14px);padding:16px 18px;overflow:hidden;z-index:2}
        .landing-remix .glass-preview:before{content:'';position:absolute;inset:-1px;border-radius:28px;background:linear-gradient(90deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25));filter:blur(40px);opacity:.28;z-index:-1}
        .landing-remix .gp-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .landing-remix .gp-badge{font-size:12px;color:#a5b4fc;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:999px;padding:4px 10px}
        .landing-remix .gp-title{color:#fff;font-weight:600}
        .landing-remix .gp-dot{margin-left:auto;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#22d3ee);box-shadow:0 0 0 2px rgba(255,255,255,0.12) inset}
        .landing-remix .gp-list{display:grid;grid-template-columns:1fr;gap:10px}
        .landing-remix .gp-item{display:flex;align-items:center;gap:8px;color:#e5e7eb;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);padding:12px 14px;border-radius:14px}
        @media (prefers-reduced-motion: reduce){.landing-remix .spline-wrap{display:none}}

        /* Quick Start card */
        .landing-remix .qs-card{position:absolute;right:12px;top:var(--qs-top,100px);width:380px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.55);backdrop-filter:blur(14px);padding:16px 18px;overflow:hidden}
        .landing-remix .qs-header{display:flex;align-items:center;margin-bottom:8px}
        .landing-remix .qs-chip{font-size:12px;color:#a5b4fc;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:999px;padding:4px 10px}
        .landing-remix .qs-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .landing-remix .qs-label{color:#e5e7eb;opacity:.85;font-size:12px;margin-bottom:6px}
        .landing-remix .qs-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
        .landing-remix .qs-item{display:flex;align-items:center;gap:8px;color:#e5e7eb;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);padding:12px 14px;border-radius:12px;height:64px;box-sizing:border-box}
        .landing-remix .qs-item span{flex:1 1 auto;min-width:0;white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}
        .landing-remix .qs-actions{display:flex;justify-content:center;margin-top:12px}
        @media (max-width: 900px){.landing-remix .qs-card{position:relative;top:0;margin-top:16px;width:100%}}

        /* CTA panel */
        .landing-remix .cta-panel{max-width:980px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:22px;padding:30px;box-shadow:0 28px 80px rgba(0,0,0,.55);backdrop-filter:blur(12px)}
        .landing-remix .cta-sub{color:#cbd5e1;margin:8px 0 16px}
        .landing-remix .cta-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
        .landing-remix .lp-footer{border-top:1px solid rgba(255,255,255,0.06);padding:22px 16px;color:#94a3b8}
        .landing-remix .lp-footer .inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .landing-remix .lp-footer a{color:#a8b1ff;text-decoration:none}
        .landing-remix .lp-footer a:hover{color:#e5e7eb}

        /* Pricing */
        .landing-remix .pricing-section{position:relative;padding:56px 16px}
        .landing-remix .pricing-container{max-width:980px;margin:0 auto}
        .landing-remix .pricing-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.55);backdrop-filter:blur(12px);padding:28px;text-align:center}
        .landing-remix .pricing-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:999px;font-size:12px;color:#e5e7eb;padding:6px 10px;margin-bottom:12px}
        .landing-remix .pricing-title{color:#fff;font-weight:700;letter-spacing:-0.01em;margin:4px 0 8px}
        .landing-remix .pricing-title .accent{background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
        .landing-remix .pricing-sub{color:#cbd5e1;margin-bottom:14px}
        .landing-remix .pricing-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

        /* How it works */
        .landing-remix .how-section{position:relative;padding:64px 16px;background:transparent !important}
        .landing-remix .how-container{max-width:1100px;margin:0 auto}
        .landing-remix .how-title{color:#fff;text-align:center;font-weight:800;letter-spacing:-0.01em;margin-bottom:8px}
        .landing-remix .how-sub{color:#cbd5e1;text-align:center;margin-bottom:22px}
        .landing-remix .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
        @media (max-width: 900px){.landing-remix .how-grid{grid-template-columns:1fr}}
        .landing-remix .how-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,0.35);display:flex;gap:12px;align-items:flex-start}
        .landing-remix .how-card h3{color:#fff;margin:0 0 4px;font-weight:600}
        .landing-remix .how-card p{color:#cbd5e1;margin:0}
        .landing-remix .how-icon{width:28px;height:28px;color:#e5e7eb;flex:0 0 auto}
        .landing-remix .how-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:10px}
      `}</style>

      <div className={`landing-page landing-remix ${splineUrl ? 'spline-on' : ''}`}>
        {/* Background glows inspired by mock */}
        <div className="remix-glows" aria-hidden="true">
          <div className="g1" />
          <div className="g2" />
        </div>

        {/* Navigation */}
        <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <SatBrainMark className="logo-icon" theme="mono" variant="f" detail="low" />
            <span>Sat‑Brain</span>
          </div>
          <div className="nav-links">
            <button onClick={scrollToFeatures} className="nav-link">Features</button>
            <button onClick={scrollToPricing} className="nav-link">Pricing</button>
            <button onClick={onLogin} className="nav-button nav-login" aria-label="Login">Log In</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        {splineUrl && (
          <div className="spline-wrap" aria-hidden="true">
            <div className="spline-inner">
              <spline-viewer url={splineUrl} style={{ width: '100%', height: '100%' }}></spline-viewer>
            </div>
          </div>
        )}
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-chip">
              <Sparkles size={14} />
              <span>New: Realtime graph sync just landed</span>
            </div>
            <h1 className="hero-title">
              Smarter notes, instantly
            </h1>
            <p className="hero-subtitle">
              Capture ideas, link them with backlinks, and recall anything in milliseconds—across devices, anywhere.
            </p>
            <div className="hero-cta-row">
              <button onClick={onGetStarted} className="hero-cta" aria-label="Start free trial">
                Start free trial
                <ArrowRight className="cta-icon" />
              </button>
              <button className="hero-ghost" aria-label="Watch demo">
                <Play size={16} />
                Watch demo
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
              <div className="qs-actions">
                <button onClick={onGetStarted} className="hero-cta" aria-label="Start free month">
                  Start free month
                  <ArrowRight className="cta-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <h2 className="features-title">What Sat‑Brain does today</h2>
          <div className="features-rows">
            <div className="features-grid features-mock row-top">
              <div className="feature-card">
                <div className="feature-icon"><Upload /></div>
                <h3 className="feature-title">Upload PDFs, DOCX, PPTX, images, or audio</h3>
                <p className="feature-description">extracts text client‑side, then auto‑summarizes and tags</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><Mic /></div>
                <h3 className="feature-title">Record lectures and classes</h3>
                <p className="feature-description">noise‑reduced recording with live transcript; use your phone as a remote mic</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><BookOpen /></div>
                <h3 className="feature-title">Notebook: notes + docs in one place</h3>
                <p className="feature-description">rich notes, transcripts, and files; autosave locally and organize by folders</p>
              </div>
            </div>
            <div className="features-grid features-mock row-bottom">
              <div className="feature-card">
                <div className="feature-icon"><Brain size={24} /></div>
                <h3 className="feature-title">Study tools: flashcards & quizzes</h3>
                <p className="feature-description">generate MCQs and flashcards from summaries; review with spaced repetition</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><GitBranch /></div>
                <h3 className="feature-title">Knowledge graph & tag search</h3>
                <p className="feature-description">interactive graph of files and tags; open items from the graph and filter by tags</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-card">
            <div className="pricing-chip">Simple pricing</div>
            <h3 className="pricing-title">Free for the first month, then <span className="accent">$4.99</span>/month</h3>
            <p className="pricing-sub">Cancel anytime during your free month. Keep all your notes and summaries.</p>
            <div className="pricing-actions">
              <button onClick={onGetStarted} className="hero-cta" aria-label="Start free month">
                Start free month
                <ArrowRight className="cta-icon" />
              </button>
              <button className="hero-ghost" onClick={scrollToFeatures}>See features</button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works (better fit for a single-plan product) */}
      <section className="how-section">
        <div className="how-container">
          <h2 className="how-title">How Sat‑Brain works</h2>
          <p className="how-sub">Three quick steps to capture and connect your ideas.</p>
          <div className="how-grid">
            <div className="how-card">
              <Mic className="how-icon" />
              <div>
                <h3>Record or import</h3>
                <p>Bring in audio, PDFs, or notes to start.</p>
              </div>
            </div>
            <div className="how-card">
              <Sparkles className="how-icon" size={28} />
              <div>
                <h3>AI summarizes</h3>
                <p>Get clean notes, key points, and tasks automatically.</p>
              </div>
            </div>
            <div className="how-card">
              <BookOpen className="how-icon" />
              <div>
                <h3>Connect & recall</h3>
                <p>Link ideas with the graph and find them in seconds.</p>
              </div>
            </div>
          </div>
          <div className="how-actions">
            <button onClick={onGetStarted} className="cta-button" aria-label="Start free month">
              Start free month
              <ArrowRight className="cta-icon" />
            </button>
            <button className="hero-ghost" aria-label="Watch demo">
              <Play size={16} />
              Watch demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="inner">
          <div>© {new Date().getFullYear()} Sat‑Brain</div>
          <div className="links" style={{display:'flex',gap:'14px'}}>
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="#">Status</a>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}
