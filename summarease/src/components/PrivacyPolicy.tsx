import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LegalHeader from './LandingPage/LegalHeader'
import './LegalPages.css'

export const PrivacyPolicy: React.FC = React.memo(() => {
  // Set document metadata for SEO
  useEffect(() => {
    document.title = 'Privacy Policy — Sat-Brain | AI Study Assistant'
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', "Sat-Brain's Privacy Policy. Learn how we collect, use, and protect your personal information and study materials.")
    
    // Add canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!linkCanonical) {
      linkCanonical = document.createElement('link')
      linkCanonical.setAttribute('rel', 'canonical')
      document.head.appendChild(linkCanonical)
    }
    linkCanonical.href = window.location.origin + '/privacy'
    
    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy",
      "description": "Sat-Brain's Privacy Policy",
      "publisher": {
        "@type": "Organization",
        "name": "Sat-Brain",
        "url": window.location.origin
      },
      "dateModified": "2025-10-11",
      "inLanguage": "en-US"
    }
    
    let scriptTag = document.querySelector('script[type="application/ld+json"]')
    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.setAttribute('type', 'application/ld+json')
      document.head.appendChild(scriptTag)
    }
    scriptTag.textContent = JSON.stringify(structuredData)
    
    // Cleanup function
    return () => {
      document.title = 'Sat-Brain'
    }
  }, [])

  return (
    <div className="landing-page landing-remix">
      {/* Background glows to match landing */}
      <div className="remix-glows" aria-hidden="true">
        <div className="g1" />
        <div className="g2" />
      </div>

      <LegalHeader />

      <main className="legal-page" role="main">
        <article className="legal-container" itemScope itemType="https://schema.org/PrivacyPolicy">
          <Link to="/" className="back-link" aria-label="Back to Home">
            <ArrowLeft size={20} aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          
          <h1 itemProp="name">Privacy Policy</h1>
          <p className="last-updated">
            <time dateTime="2025-10-11" itemProp="dateModified">
              Last updated: October 11, 2025
            </time>
          </p>

        <section aria-labelledby="section-1">
          <h2 id="section-1">1. Information We Collect</h2>
          <p>
            Sat-Brain collects information you provide directly to us, including:
          </p>
          <ul>
            <li><strong>Account Information:</strong> Email address, name, and password</li>
            <li><strong>Content:</strong> Files you upload, audio recordings, notes, and summaries</li>
            <li><strong>Usage Data:</strong> How you interact with our service</li>
            <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers</li>
          </ul>
        </section>

        <section aria-labelledby="section-2">
          <h2 id="section-2">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process your files and generate AI-powered summaries</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Detect and prevent fraud and abuse</li>
          </ul>
        </section>

        <section aria-labelledby="section-3">
          <h2 id="section-3">3. Data Storage and Security</h2>
          <p>
            Your data is stored securely using industry-standard encryption. We use Supabase for data storage,
            which provides enterprise-grade security and compliance. Your files and notes are encrypted both
            in transit and at rest.
          </p>
        </section>

        <section aria-labelledby="section-4">
          <h2 id="section-4">4. AI Processing</h2>
          <p>
            We use Google Gemini AI to process your content and generate summaries, flashcards, and quizzes.
            Your content is sent to Google's servers for processing but is not used to train AI models.
            We maintain strict data processing agreements with our AI providers.
          </p>
        </section>

        <section aria-labelledby="section-5">
          <h2 id="section-5">5. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide you services.
            You can delete your account at any time, which will permanently remove all your data from our servers
            within 30 days.
          </p>
        </section>

        <section aria-labelledby="section-6">
          <h2 id="section-6">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section aria-labelledby="section-7">
          <h2 id="section-7">7. Cookies</h2>
          <p>
            We use essential cookies to maintain your session and preferences. We do not use tracking cookies
            or sell your data to third parties.
          </p>
        </section>

        <section aria-labelledby="section-8">
          <h2 id="section-8">8. Children's Privacy</h2>
          <p>
            Our service is not directed to children under 13. If you are under 13, please do not use Sat-Brain
            or provide any personal information.
          </p>
        </section>

        <section aria-labelledby="section-9">
          <h2 id="section-9">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting
            the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section aria-labelledby="section-10">
          <h2 id="section-10">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
            <br />
            <strong>Email:</strong> <a href="mailto:privacy@sat-brain.app">privacy@sat-brain.app</a>
          </p>
        </section>

        <footer className="legal-footer">
          <p>© {new Date().getFullYear()} Sat-Brain. All rights reserved.</p>
        </footer>
        </article>
      </main>
    </div>
  )
})

PrivacyPolicy.displayName = 'PrivacyPolicy'
