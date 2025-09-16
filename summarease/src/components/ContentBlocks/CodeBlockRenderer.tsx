import React, { useState, useRef } from 'react';
import type { CodeBlock } from '../../types/summaryTypes';
import './CodeBlockRenderer.css';

interface CodeBlockRendererProps {
  block: CodeBlock;
  onCopy?: (content: string) => void;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({ block, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      onCopy?.(block.content);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getLanguageDisplay = (lang: string): string => {
    const languageMap: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      html: 'HTML',
      css: 'CSS',
      sql: 'SQL',
      bash: 'Bash',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      markdown: 'Markdown',
      plaintext: 'Plain Text'
    };
    return languageMap[lang] || lang.toUpperCase();
  };

  const formatCode = (code: string): string[] => {
    return code.split('\n');
  };

  const lines = formatCode(block.content);

  return (
    <div className="code-block-container">
      {block.title && (
        <div className="code-block-title">{block.title}</div>
      )}
      
      <div className="code-block">
        <div className="code-block-header">
          <span className="code-language-badge">
            {getLanguageDisplay(block.language)}
          </span>
          <button 
            className={`copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label="Copy code"
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
        
        <pre ref={codeRef} className="code-content">
          {block.lineNumbers ? (
            <div className="code-with-lines">
              <div className="line-numbers">
                {lines.map((_, index) => (
                  <span 
                    key={index} 
                    className={`line-number ${
                      block.highlightLines?.includes(index + 1) ? 'highlighted' : ''
                    }`}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <code className={`language-${block.language}`}>
                {lines.map((line, index) => (
                  <div 
                    key={index} 
                    className={`code-line ${
                      block.highlightLines?.includes(index + 1) ? 'highlighted' : ''
                    }`}
                  >
                    {line || '\n'}
                  </div>
                ))}
              </code>
            </div>
          ) : (
            <code className={`language-${block.language}`}>
              {block.content}
            </code>
          )}
        </pre>
      </div>
      
      {block.description && (
        <div className="code-block-description">{block.description}</div>
      )}
    </div>
  );
};