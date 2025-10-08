import React, { useState } from 'react';
import type { InfographicSpec } from '../../lib/viz/types';
import { MindMapRenderer } from './MindMapRenderer';
import { PyramidRenderer } from './PyramidRenderer';
import { CycleDiagramRenderer } from './CycleDiagramRenderer';
import { ProcessRenderer } from './ProcessRenderer';
import { Download, Loader2, Maximize2, X } from 'lucide-react';

interface InfographicRendererProps {
  spec: InfographicSpec;
  width?: number;
  height?: number;
  showControls?: boolean;
  onExport?: (format: 'png' | 'svg') => void;
}

export const InfographicRenderer: React.FC<InfographicRendererProps> = ({
  spec,
  width,
  height,
  showControls = true,
  onExport
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Render appropriate component based on type
  const renderInfographic = () => {
    switch (spec.type) {
      case 'mindmap':
        return <MindMapRenderer spec={spec} width={width} height={height} />;
      
      case 'pyramid':
      case 'hierarchy':
        return <PyramidRenderer spec={spec} width={width} height={height} />;
      
      case 'cycle':
        return <CycleDiagramRenderer spec={spec} width={width} height={height} />;
      
      case 'timeline':
        return (
          <div className="infographic-placeholder">
            <p>Timeline renderer coming soon...</p>
            <pre>{JSON.stringify(spec, null, 2)}</pre>
          </div>
        );
      
      case 'comparison':
        return (
          <div className="infographic-placeholder">
            <p>Comparison renderer coming soon...</p>
            <pre>{JSON.stringify(spec, null, 2)}</pre>
          </div>
        );
      
      case 'process':
        return <ProcessRenderer spec={spec} width={width} height={height} />;
      
      default:
        return (
          <div className="infographic-error">
            <p>Unknown infographic type: {spec.type}</p>
          </div>
        );
    }
  };

  const handleExport = async (format: 'png' | 'svg') => {
    setIsExporting(true);
    try {
      // Find the SVG element
      const svgElement = document.querySelector(`.${spec.type}-svg`) as SVGElement;
      if (!svgElement) {
        console.error('SVG element not found');
        return;
      }

      if (format === 'svg') {
        // Export as SVG
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `${spec.title.replace(/\s+/g, '_')}_infographic.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      } else {
        // Export as PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          canvas.width = img.width * 2; // 2x for better quality
          canvas.height = img.height * 2;
          ctx.scale(2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) return;
            const pngUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `${spec.title.replace(/\s+/g, '_')}_infographic.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
            setIsExporting(false);
          });
        };
        img.src = url;
      }

      if (onExport) {
        onExport(format);
      }
    } catch (error) {
      console.error('Error exporting infographic:', error);
      setIsExporting(false);
    }
  };

  return (
    <div className="infographic-renderer">
      {/* Header with metadata */}
      <div className="infographic-header">
        <div className="infographic-title-section">
          <h3 className="infographic-title">{spec.title}</h3>
          {spec.subtitle && (
            <p className="infographic-subtitle">{spec.subtitle}</p>
          )}
        </div>
        
        {showControls && (
          <div className="infographic-controls">
            <button
              className="export-button"
              onClick={() => setIsFullscreen(true)}
              title="Expand"
            >
              <Maximize2 size={16} />
              <span>View</span>
            </button>
            <button
              className="export-button"
              onClick={() => handleExport('png')}
              disabled={isExporting}
              title="Export as PNG"
            >
              {isExporting ? (
                <Loader2 className="icon spinning" size={16} />
              ) : (
                <Download size={16} />
              )}
              <span>PNG</span>
            </button>
            <button
              className="export-button"
              onClick={() => handleExport('svg')}
              disabled={isExporting}
              title="Export as SVG"
            >
              <Download size={16} />
              <span>SVG</span>
            </button>
          </div>
        )}
      </div>

      {/* Metadata bar */}
      {spec.metadata && (
        <div className="infographic-metadata">
          <span className="metadata-item">Type: <strong>{spec.type}</strong></span>
          <span className="metadata-item">
            Confidence: <strong>{(spec.metadata.confidence * 100).toFixed(0)}%</strong>
          </span>
          {/* Reasoning removed from UI for cleaner layout */}
        </div>
      )}

      {/* Render the actual infographic */}
      <div className="infographic-content">
        {renderInfographic()}
      </div>
      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="infographic-fullscreen-overlay" role="dialog" aria-modal="true">
          <div className="infographic-fullscreen-inner">
            <div className="infographic-fullscreen-bar">
              <h4 className="infographic-fullscreen-title">{spec.title}</h4>
              <button className="export-button" onClick={() => setIsFullscreen(false)} title="Close">
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
            <div className="infographic-fullscreen-content">
              {renderInfographic()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Error boundary component
export class InfographicErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Infographic rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="infographic-error-boundary">
          <h4>Failed to render infographic</h4>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
