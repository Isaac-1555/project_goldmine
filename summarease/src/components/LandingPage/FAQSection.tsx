import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { analytics } from '../Analytics/Analytics'
import './FAQSection.css'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: 'How does Sat-Brain work?',
    answer: 'Upload audio recordings, PDFs, or documents to Sat-Brain. Our AI instantly transcribes and analyzes your content, generating summaries, flashcards, quizzes, and automatically tagging key concepts. Everything syncs across your devices in real-time.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes! Your data is encrypted both in transit and at rest using industry-standard encryption. We use Supabase for secure storage and never sell your data to third parties. You can delete your account and all data at any time.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel during your free trial month without any charges. If you continue after the trial, you can still cancel anytime and your subscription will remain active until the end of your billing period. No hidden fees or commitments.'
  },
  {
    question: 'What file types are supported?',
    answer: 'Sat-Brain supports PDFs, DOCX, PPTX, images (JPG, PNG), and audio files (MP3, WAV, WebM). You can also paste text directly or record audio within the app. We process most common document and audio formats.'
  },
  {
    question: 'Does it work offline?',
    answer: 'Your notes and summaries are cached locally and available offline. However, AI processing (summarization, flashcard generation) requires an internet connection as it uses cloud-based AI models. You can upload files offline and they\'ll process when you\'re back online.'
  },
  {
    question: 'How accurate are the AI summaries?',
    answer: 'We use Google Gemini AI which provides highly accurate summaries. However, AI can occasionally make mistakes, so we recommend reviewing important information. You can edit all AI-generated content (summaries, flashcards, quizzes) to ensure accuracy.'
  },
  {
    question: 'Do you offer student discounts?',
    answer: 'Currently, everyone gets the same low price: free for the first month, then just $4.99/month. We\'re working on educational institution partnerships for bulk licensing. Contact us if you\'re an educator interested in using Sat-Brain with your students.'
  },
  {
    question: 'What makes Sat-Brain different from Notion?',
    answer: 'Unlike Notion, Sat-Brain is specifically built for learning and studying with AI-first features: automatic transcription, AI summaries, flashcard generation, quiz creation, and a knowledge graph that connects your ideas. Notion is great for organization, but Sat-Brain is designed for active learning.'
  },
  {
    question: 'Can I export my notes and summaries?',
    answer: 'Yes! You can export your content in multiple formats including PDF, DOCX, and Markdown. All your data remains yours, and you can download everything at any time, even if you cancel your subscription.'
  },
  {
    question: 'How many files can I upload?',
    answer: 'During the free trial and subscription, there are no limits on the number of files you can upload. Individual file size limits are 100MB for documents and 500MB for audio files, which covers most use cases including long lectures.'
  },
  {
    question: 'Does Sat-Brain use my content to train AI?',
    answer: 'No. Your content is private and is not used to train AI models. We process your files through Google Gemini API under strict data processing agreements. Your notes, summaries, and uploaded content remain completely private to you.'
  },
  {
    question: 'Can I collaborate with others?',
    answer: 'Currently, Sat-Brain is focused on individual learning. Collaboration features (sharing notes, collaborative flashcards) are on our roadmap for a future update. Follow our updates or contact us to express interest in team features.'
  }
]

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    if (openIndex !== index) {
      // Track FAQ click when opening (not when closing)
      analytics.trackFAQClick(faqs[index].question)
    }
    setOpenIndex(openIndex === index ? null : index)
  }

  // Generate Schema.org FAQPage structured data
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <>
      {/* Inject Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="faq-section" aria-labelledby="faq-title">
        <div className="faq-container">
          <div className="faq-header">
            <h2 id="faq-title" className="faq-title">Frequently Asked Questions</h2>
            <p className="faq-subtitle">
              Everything you need to know about Sat-Brain. Can't find the answer you're looking for?{' '}
              <a href="mailto:support@yourdomain.com" className="faq-contact-link">Contact us</a>.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className={`faq-item ${openIndex === index ? 'open' : ''}`}
                open={openIndex === index}
                onClick={(e) => {
                  e.preventDefault()
                  toggleFAQ(index)
                }}
              >
                <summary className="faq-question">
                  {faq.question}
                  <ChevronDown
                    className="faq-icon"
                    aria-hidden="true"
                    style={{
                      transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </summary>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
