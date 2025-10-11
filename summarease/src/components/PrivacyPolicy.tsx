import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LegalHeader from './LandingPage/LegalHeader'
import './LegalPages.css'

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="landing-page landing-remix">
      {/* Background glows to match landing */}
      <div className="remix-glows" aria-hidden="true">
        <div className="g1" />
        <div className="g2" />
      </div>

      <LegalHeader />

      <main className="legal-page">
        <div className="legal-container">
          <Link to="/" className="back-link">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: October 11, 2025</p>

        <section>
          <h2>1. Information We Collect</h2>
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

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process your files and generate AI-powered summaries</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Detect and prevent fraud and abuse</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Storage and Security</h2>
          <p>
            Your data is stored securely using industry-standard encryption. We use Supabase for data storage,
            which provides enterprise-grade security and compliance. Your files and notes are encrypted both
            in transit and at rest.
          </p>
        </section>

        <section>
          <h2>4. AI Processing</h2>
          <p>
            We use Google Gemini AI to process your content and generate summaries, flashcards, and quizzes.
            Your content is sent to Google's servers for processing but is not used to train AI models.
            We maintain strict data processing agreements with our AI providers.
          </p>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide you services.
            You can delete your account at any time, which will permanently remove all your data from our servers
            within 30 days.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2>7. Cookies</h2>
          <p>
            We use essential cookies to maintain your session and preferences. We do not use tracking cookies
            or sell your data to third parties.
          </p>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            Our service is not directed to children under 13. If you are under 13, please do not use Sat-Brain
            or provide any personal information.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting
            the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
            <br />
            <strong>Email:</strong> privacy@yourdomain.com
          </p>
        </section>

        <div className="legal-footer">
          <p>© {new Date().getFullYear()} Sat-Brain. All rights reserved.</p>
        </div>
        </div>
      </main>
    </div>
  )
}
