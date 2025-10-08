import React, { useState, useEffect } from 'react';
import { InfographicRenderer, InfographicErrorBoundary } from './InfographicRenderer';
import { getInfographicSpec, saveInfographicSpec, hasInfographic } from '../../lib/infographicStorage';
import { generateInfographic, suggestInfographicTypes } from '../../lib/infographicService';
import type { InfographicSpec, InfographicType } from '../../lib/viz/types';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import './Infographics.css';
import TypeDropdown from './TypeDropdown';

interface InfographicGalleryProps {
  summaryId: string;
  summaryText: string;
  autoGenerate?: boolean;
}

export const InfographicGallery: React.FC<InfographicGalleryProps> = ({
  summaryId,
  summaryText,
  autoGenerate = false
}) => {
  const [currentSpec, setCurrentSpec] = useState<InfographicSpec | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedTypes, setSuggestedTypes] = useState<InfographicType[]>([]);
  const [selectedType, setSelectedType] = useState<InfographicType | null>(null);

  // Load existing infographic on mount
  useEffect(() => {
    const existing = getInfographicSpec(summaryId);
    if (existing) {
      setCurrentSpec(existing);
      setSelectedType(existing.type);
    } else if (autoGenerate && summaryText.length >= 50) {
      // Auto-generate if enabled and text is long enough
      handleGenerate();
    } else {
      // Get suggested types
      const suggested = suggestInfographicTypes(summaryText);
      setSuggestedTypes(suggested);
      if (suggested.length > 0) {
        setSelectedType(suggested[0]);
      }
    }
  }, [summaryId]);

  const handleGenerate = async (type?: InfographicType) => {
    setIsGenerating(true);
    setError(null);

    try {
      const targetType = type || selectedType || 'mindmap';
      
      const result = await generateInfographic(summaryText, {
        summaryId,
        preferredType: targetType
      });

      if (result.success && result.spec) {
        setCurrentSpec(result.spec);
        saveInfographicSpec(result.spec);
        setSelectedType(result.spec.type);
      } else {
        setError(result.error || 'Failed to generate infographic');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate(currentSpec?.type);
  };

  const handleTypeSwitch = (type: InfographicType) => {
    setSelectedType(type);
    handleGenerate(type);
  };

  // If no infographic exists and not generating, show generation prompt
  if (!currentSpec && !isGenerating) {
    return (
      <div className="infographic-gallery-empty">
        <div className="empty-state">
          <Sparkles size={48} className="empty-icon" />
          <h3>Generate Visual Representation</h3>
          <p>Transform this summary into an interactive infographic</p>
          
          {suggestedTypes.length > 0 && (
            <div className="suggested-types">
              <p className="suggested-label">Recommended types:</p>
              <div className="type-buttons">
                {suggestedTypes.map(type => (
                  <button
                    key={type}
                    className={`type-button ${type === selectedType ? 'selected' : ''}`}
                    onClick={() => handleGenerate(type)}
                  >
                    {formatTypeName(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {summaryText.length < 50 ? (
            <p className="warning-text">
              Summary too short for infographic generation (min 50 characters)
            </p>
          ) : (
            <button
              className="generate-button primary"
              onClick={() => handleGenerate()}
            >
              <Sparkles size={16} />
              Generate Infographic
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show loading state
  if (isGenerating) {
    return (
      <div className="infographic-gallery-loading">
        <Loader2 size={40} className="spinner" />
        <p>Generating infographic...</p>
        <p className="loading-subtext">This may take a few seconds</p>
      </div>
    );
  }

  // Show error state
  if (error && !currentSpec) {
    return (
      <div className="infographic-gallery-error">
        <h4>Failed to generate infographic</h4>
        <p>{error}</p>
        <button onClick={() => handleGenerate()} className="retry-button">
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  // Show the infographic with controls
  return (
    <div className="infographic-gallery">
      <div className="gallery-header">
        <div className="gallery-title-section">
          <h3 className="gallery-title">📊 Visual Representation</h3>
          <div className="type-indicator">
            <span className="type-badge">{formatTypeName(currentSpec!.type)}</span>
            {currentSpec!.metadata.confidence && (
              <span className="confidence-badge">
                {(currentSpec!.metadata.confidence * 100).toFixed(0)}% match
              </span>
            )}
          </div>
        </div>
        
        <div className="gallery-controls">
          <button
            className="control-button"
            onClick={handleRegenerate}
            disabled={isGenerating}
            title="Regenerate same type"
          >
            Regenerate
          </button>
          
          {/* Type switcher dropdown (custom themed) */}
          {(() => {
            const allTypes: InfographicType[] = ['mindmap', 'pyramid', 'cycle', 'timeline', 'comparison', 'process', 'hierarchy'];
            const options = allTypes.map(t => ({ value: t, label: formatTypeName(t) }));
            return (
              <TypeDropdown
                value={currentSpec!.type}
                onChange={(val) => handleTypeSwitch(val)}
                options={options}
                disabled={isGenerating}
                ariaLabel="Infographic type"
              />
            );
          })()}
        </div>
      </div>

      {currentSpec && (
        <InfographicErrorBoundary>
          <InfographicRenderer
            spec={currentSpec}
            showControls={true}
          />
        </InfographicErrorBoundary>
      )}
    </div>
  );
};

// Helper function to format type names
function formatTypeName(type: InfographicType): string {
  const names: Record<InfographicType, string> = {
    mindmap: 'Mind Map',
    cycle: 'Cycle Diagram',
    pyramid: 'Pyramid',
    timeline: 'Timeline',
    comparison: 'Comparison',
    process: 'Process Flow',
    hierarchy: 'Hierarchy'
  };
  return names[type] || type;
}
