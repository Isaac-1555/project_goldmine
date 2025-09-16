import React, { useState } from 'react';
import { parseSummaryContent } from '../../lib/summaryParser';
import { ContentBlockRenderer } from '../ContentBlocks/ContentBlockRenderer';
import './SummaryPreview.css';

interface SummaryPreviewProps {
  summaryText: string;
  title?: string;
  showRawView?: boolean;
}

export const SummaryPreview: React.FC<SummaryPreviewProps> = ({ 
  summaryText, 
  title,
  showRawView = false 
}) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>(showRawView ? 'raw' : 'formatted');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  
  // Parse the summary text into blocks
  const contentBlocks = parseSummaryContent(summaryText);
  
  const handleBlockCopy = (content: string, type: string) => {
    setCopyStatus(`Copied ${type} block to clipboard!`);
    setTimeout(() => setCopyStatus(null), 2000);
  };
  
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus('Copied entire summary to clipboard!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };
  
  return (
    <div className="summary-preview-container">
      {title && (
        <div className="summary-preview-header">
          <h2 className="summary-title">{title}</h2>
        </div>
      )}
      
      <div className="summary-preview-toolbar">
        <div className="view-toggle-buttons">
          <button
            className={`view-button ${viewMode === 'formatted' ? 'active' : ''}`}
            onClick={() => setViewMode('formatted')}
          >
            📝 Formatted View
          </button>
          <button
            className={`view-button ${viewMode === 'raw' ? 'active' : ''}`}
            onClick={() => setViewMode('raw')}
          >
            📄 Raw Text
          </button>
        </div>
        
        <button className="copy-all-button" onClick={handleCopyAll}>
          📋 Copy All
        </button>
      </div>
      
      {copyStatus && (
        <div className="copy-status-toast">
          ✅ {copyStatus}
        </div>
      )}
      
      <div className="summary-preview-content">
        {viewMode === 'formatted' ? (
          <ContentBlockRenderer 
            blocks={contentBlocks} 
            onCopyBlock={handleBlockCopy}
          />
        ) : (
          <pre className="summary-raw-text">
            <code>{summaryText}</code>
          </pre>
        )}
      </div>
    </div>
  );
};