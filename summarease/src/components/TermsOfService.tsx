import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LegalHeader from './LandingPage/LegalHeader'
import './LegalPages.css'

export const TermsOfService: React.FC = React.memo(() => {
  // Set document metadata for SEO
  useEffect(() => {
    document.title = 'Terms of Service — Sat-Brain | AI Study Assistant'
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', "Sat-Brain's Terms of Service. Understand your rights and responsibilities when using our AI-powered study assistant.")
    
    // Add canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!linkCanonical) {
      linkCanonical = document.createElement('link')
      linkCanonical.setAttribute('rel', 'canonical')
      document.head.appendChild(linkCanonical)
    }
    linkCanonical.href = window.location.origin + '/terms'
    
    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Terms of Service",
      "description": "Sat-Brain's Terms of Service",
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
        <article className="legal-container" itemScope itemType="https://schema.org/TermsOfService">
          <Link to="/" className="back-link" aria-label="Back to Home">
            <ArrowLeft size={20} aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          
          <h1 itemProp="name">Terms of Service</h1>
          <p className="last-updated">
            <time dateTime="2025-10-11" itemProp="dateModified">
              Last updated: October 11, 2025
            </time>
          </p>

        <section aria-labelledby="section-1">
          <h2 id="section-1">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Sat-Brain, you agree to be bound by these Terms of Service and all applicable
            laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
          </p>
        </section>

        <section aria-labelledby="section-2">
          <h2 id="section-2">2. Description of Service</h2>
          <p>
            Sat-Brain is an AI-powered note-taking and study assistant that helps you:
          </p>
          <ul>
            <li>Upload and process PDFs, DOCX files, and audio recordings</li>
            <li>Generate AI summaries, flashcards, and quizzes</li>
            <li>Organize content with tags and folders</li>
            <li>Visualize connections through knowledge graphs</li>
          </ul>
        </section>

        <section aria-labelledby="section-3">
          <h2 id="section-3">3. Account Registration</h2>
          <p>
            To use Sat-Brain, you must create an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your password</li>
            <li>Notify us immediately of any unauthorized use</li>
            <li>Be responsible for all activities under your account</li>
          </ul>
        </section>

        <section aria-labelledby="section-4">
          <h2 id="section-4">4. Subscription and Billing</h2>
          <p>
            <strong>Free Trial:</strong> New users receive 1 month free access to all features.
            <br />
            <strong>Paid Subscription:</strong> After the trial, subscriptions are $9.99/month, billed monthly.
            <br />
            <strong>Cancellation:</strong> You may cancel anytime during your free trial without charge.
            After the trial, you can cancel your subscription, which will remain active until the end of your current billing period.
          </p>
        </section>

        <section aria-labelledby="section-5">
          <h2 id="section-5">5. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Upload copyrighted content without permission</li>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to reverse engineer or hack the service</li>
            <li>Share your account credentials with others</li>
            <li>Upload malicious files or content</li>
            <li>Abuse or overload our servers</li>
          </ul>
        </section>

        <section aria-labelledby="section-6">
          <h2 id="section-6">6. Content Ownership</h2>
          <p>
            <strong>Your Content:</strong> You retain all rights to the content you upload. By using Sat-Brain,
            you grant us a license to process, store, and display your content solely to provide the service.
            <br /><br />
            <strong>Generated Content:</strong> AI-generated summaries, flashcards, and quizzes are owned by you.
            We do not claim ownership of any outputs generated from your content.
          </p>
        </section>

        <section aria-labelledby="section-7">
          <h2 id="section-7">7. AI Processing Disclaimer</h2>
          <p>
            Sat-Brain uses AI (Google Gemini) to generate summaries and study materials. While we strive for accuracy:
          </p>
          <ul>
            <li>AI-generated content may contain errors or inaccuracies</li>
            <li>You should verify important information independently</li>
            <li>We are not liable for decisions made based on AI outputs</li>
            <li>Academic integrity is your responsibility</li>
          </ul>
        </section>

        <section aria-labelledby="section-8">
          <h2 id="section-8">8. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your data. However, no system is 100% secure.
            You acknowledge that you use the service at your own risk.
          </p>
        </section>

        <section aria-labelledby="section-9">
          <h2 id="section-9">9. Limitation of Liability</h2>
          <p>
            Sat-Brain and its affiliates shall not be liable for any indirect, incidental, special, or consequential
            damages arising out of or related to your use of the service. Our total liability shall not exceed the
            amount you paid us in the last 12 months.
          </p>
        </section>

        <section aria-labelledby="section-10">
          <h2 id="section-10">10. Service Availability</h2>
          <p>
            We strive for 99.9% uptime but cannot guarantee uninterrupted service. We may suspend service for
            maintenance, updates, or force majeure events without liability.
          </p>
        </section>

        <section aria-labelledby="section-11">
          <h2 id="section-11">11. Termination</h2>
          <p>
            We reserve the right to terminate or suspend your account if you violate these terms. Upon termination,
            you may export your data within 30 days, after which it will be permanently deleted.
          </p>
        </section>

        <section aria-labelledby="section-12">
          <h2 id="section-12">12. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. We will notify you of significant changes via email or
            in-app notification. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section aria-labelledby="section-13">
          <h2 id="section-13">13. Governing Law</h2>
          <p>
            These terms shall be governed by the laws of [Your Jurisdiction], without regard to conflict of law provisions.
          </p>
        </section>

        <section aria-labelledby="section-14">
          <h2 id="section-14">14. Contact Us</h2>
          <p>
            For questions about these Terms of Service, contact us at:
            <br />
            <strong>Email:</strong> <a href="mailto:legal@sat-brain.app">legal@sat-brain.app</a>
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

TermsOfService.displayName = 'TermsOfService'
