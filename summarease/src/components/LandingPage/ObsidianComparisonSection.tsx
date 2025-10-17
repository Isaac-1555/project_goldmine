import React from 'react'
import { Check, X } from 'lucide-react'
import './ObsidianComparisonSection.css'

export const ObsidianComparisonSection: React.FC = () => {
  return (
    <section className="obsidian-comparison-section" aria-labelledby="comparison-title">
      <div className="comparison-container">
        <div className="comparison-header">
          <h2 id="comparison-title" className="comparison-title">
            Obsidian vs. Sat-Brain: What's the Difference?
          </h2>
          <p className="comparison-subtitle">
            Get everything Obsidian offers, plus AI features—without the setup hassle
          </p>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="feature-col">Feature</th>
                <th className="obsidian-col">Obsidian</th>
                <th className="satbrain-col">Sat-Brain</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="feature-name">Setup time</td>
                <td className="obsidian-value">Hours (plugins + config)</td>
                <td className="satbrain-value highlight">30 seconds</td>
              </tr>
              <tr>
                <td className="feature-name">AI summaries</td>
                <td className="obsidian-value">
                  <span className="status-badge negative">
                    <X size={16} aria-hidden="true" />
                    Requires paid plugins
                  </span>
                </td>
                <td className="satbrain-value">
                  <span className="status-badge positive">
                    <Check size={16} aria-hidden="true" />
                    Built-in
                  </span>
                </td>
              </tr>
              <tr>
                <td className="feature-name">Audio transcription</td>
                <td className="obsidian-value">
                  <span className="status-badge negative">
                    <X size={16} aria-hidden="true" />
                    Third-party only
                  </span>
                </td>
                <td className="satbrain-value">
                  <span className="status-badge positive">
                    <Check size={16} aria-hidden="true" />
                    Built-in
                  </span>
                </td>
              </tr>
              <tr>
                <td className="feature-name">Flashcards</td>
                <td className="obsidian-value">Manual or plugins</td>
                <td className="satbrain-value highlight">Auto-generated</td>
              </tr>
              <tr>
                <td className="feature-name">Knowledge graph</td>
                <td className="obsidian-value">Manual linking</td>
                <td className="satbrain-value highlight">Auto-tagged + linked</td>
              </tr>
              <tr>
                <td className="feature-name">Learning curve</td>
                <td className="obsidian-value">Steep (Markdown, plugins)</td>
                <td className="satbrain-value highlight">Instant</td>
              </tr>
              <tr>
                <td className="feature-name">Pricing</td>
                <td className="obsidian-value">Free (but plugins add up to $40+/mo)</td>
                <td className="satbrain-value highlight">$4.99/mo</td>
              </tr>
              <tr>
                <td className="feature-name">Best for</td>
                <td className="obsidian-value">Power users & developers</td>
                <td className="satbrain-value highlight">Students & microlearners</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="comparison-cta">
          <p className="comparison-cta-text">
            Try Sat-Brain free for 30 days—no credit card required
          </p>
        </div>
      </div>
    </section>
  )
}
