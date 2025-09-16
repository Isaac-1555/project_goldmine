import React from 'react';
import type { ContentBlock } from '../../types/summaryTypes';
import { CodeBlockRenderer } from './CodeBlockRenderer';
import { MathBlockRenderer } from './MathBlockRenderer';
import './ContentBlockRenderer.css';

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  onCopyBlock?: (content: string, type: string) => void;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ blocks, onCopyBlock }) => {
  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'code':
        return (
          <CodeBlockRenderer
            key={index}
            block={block}
            onCopy={(content) => onCopyBlock?.(content, 'code')}
          />
        );
      
      case 'math':
        return (
          <MathBlockRenderer
            key={index}
            block={block}
            onCopy={(content) => onCopyBlock?.(content, 'math')}
          />
        );
      
      case 'special':
        return (
          <div key={index} className="special-block-container">
            <div className="special-block">
              <div className="special-block-header">
                <span className="special-label">
                  {getSpecialBlockLabel(block.contentType)}
                </span>
                <button
                  className="copy-button"
                  onClick={() => handleCopySpecial(block.content)}
                  aria-label="Copy content"
                >
                  <svg className="copy-icon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z"/>
                  </svg>
                  Copy
                </button>
              </div>
              <pre className="special-content">
                <code>{block.content}</code>
              </pre>
            </div>
            {block.title && <div className="special-block-title">{block.title}</div>}
          </div>
        );
      
      case 'text':
        if (block.isHeader) {
          const level = block.headerLevel || 2;
          const className = `content-header header-${block.headerLevel}`;
          const content = renderTextWithEmphasis(block.content);
          
          switch(level) {
            case 1:
              return <h1 key={index} className={className}>{content}</h1>;
            case 3:
              return <h3 key={index} className={className}>{content}</h3>;
            case 4:
              return <h4 key={index} className={className}>{content}</h4>;
            default:
              return <h2 key={index} className={className}>{content}</h2>;
          }
        }
        
        if (block.isList) {
          const listItems = block.content.split('\n').map((item, i) => {
            const cleanItem = item.replace(/^[•\-*]\s*/, '');
            return (
              <li key={i} className="content-list-item">
                {renderTextWithEmphasis(cleanItem)}
              </li>
            );
          });
          
          return (
            <ul key={index} className="content-list">
              {listItems}
            </ul>
          );
        }
        
        return (
          <p key={index} className="content-paragraph">
            {renderTextWithEmphasis(block.content)}
          </p>
        );
      
      default:
        return null;
    }
  };
  
  const handleCopySpecial = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      onCopyBlock?.(content, 'special');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const getSpecialBlockLabel = (type: string): string => {
    switch (type) {
      case 'terminal':
        return '💻 Terminal Commands';
      case 'config':
        return '⚙️ Configuration';
      case 'data':
        return '📊 Data';
      case 'chemical':
        return '🧪 Chemical Formula';
      default:
        return '📋 Special Content';
    }
  };
  
  const renderTextWithEmphasis = (text: string): React.ReactNode => {
    // Convert markdown bold (**text**) to strong tags
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };
  
  return (
    <div className="content-blocks-container">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};