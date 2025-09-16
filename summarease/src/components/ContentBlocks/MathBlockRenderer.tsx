import React, { useState, useEffect, useRef } from 'react';
import type { MathBlock } from '../../types/summaryTypes';
import './MathBlockRenderer.css';

interface MathBlockRendererProps {
  block: MathBlock;
  onCopy?: (content: string) => void;
}

// We'll use KaTeX for rendering - needs to be installed: npm install katex
declare global {
  interface Window {
    katex?: any;
  }
}

export const MathBlockRenderer: React.FC<MathBlockRendererProps> = ({ block, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const mathRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    // Render LaTeX using KaTeX if available
    if (mathRef.current && !showRaw) {
      try {
        if (window.katex) {
          mathRef.current.innerHTML = '';
          window.katex.render(block.latex, mathRef.current, {
            displayMode: block.displayMode === 'block',
            throwOnError: false,
            errorColor: '#ff6b6b'
          });
          setRenderError(null);
        } else {
          // Fallback if KaTeX is not loaded
          setRenderError('Math renderer not loaded');
        }
      } catch (error) {
        console.error('KaTeX render error:', error);
        setRenderError('Failed to render equation');
      }
    }
  }, [block.latex, block.displayMode, showRaw]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.latex);
      setCopied(true);
      onCopy?.(block.latex);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleView = () => {
    setShowRaw(!showRaw);
  };

  return (
    <div className="math-block-container">
      <div className="math-block">
        <div className="math-block-header">
          <span className="math-label">
            <svg className="math-icon" viewBox="0 0 16 16" width="16" height="16">
              <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm1.5 3h-3l-.5.5v1l.5.5h1v6.5l.5.5h1l.5-.5V4h1l.5-.5V3L9.5 3z"/>
            </svg>
            Mathematical Expression
          </span>
          <div className="math-actions">
            <button 
              className="view-toggle-button"
              onClick={toggleView}
              aria-label="Toggle view"
            >
              {showRaw ? (
                <>
                  <svg className="toggle-icon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M8 2C4.5 2 1.5 5 0 8c1.5 3 4.5 6 8 6s6.5-3 8-6c-1.5-3-4.5-6-8-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                    <circle cx="8" cy="8" r="2"/>
                  </svg>
                  Rendered
                </>
              ) : (
                <>
                  <svg className="toggle-icon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M6.3 5.69a.942.942 0 01-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 01-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.56 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"/>
                  </svg>
                  LaTeX
                </>
              )}
            </button>
            <button 
              className={`copy-button ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              aria-label="Copy LaTeX"
            >
              {copied ? (
                <>
                  <svg className="copy-icon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="copy-icon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="math-content">
          {showRaw ? (
            <pre className="math-latex-code">
              <code>{block.latex}</code>
            </pre>
          ) : renderError ? (
            <div className="math-render-error">
              {renderError}
              <pre className="math-latex-fallback">
                <code>{block.latex}</code>
              </pre>
            </div>
          ) : (
            <div 
              ref={mathRef} 
              className={`math-rendered ${block.displayMode === 'block' ? 'block-mode' : 'inline-mode'}`}
            />
          )}
        </div>

        {block.variables && Object.keys(block.variables).length > 0 && (
          <div className="math-variables">
            <div className="variables-title">Where:</div>
            <div className="variables-list">
              {Object.entries(block.variables).map(([key, value]) => (
                <div key={key} className="variable-item">
                  <span className="variable-key">{key}</span>
                  <span className="variable-equals">=</span>
                  <span className="variable-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {block.description && (
        <div className="math-block-description">{block.description}</div>
      )}
    </div>
  );
};