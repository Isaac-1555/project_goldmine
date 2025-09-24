import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './InfographicRenderer.css';

interface InfographicData {
  type: 'flowchart' | 'mindmap' | 'timeline' | 'comparison' | 'hierarchy' | 'process' | 'chart';
  title: string;
  description?: string;
  elements?: string[];
  relationships?: string[];
  data?: any[];
  chartType?: 'bar' | 'line' | 'pie';
}

interface InfographicRendererProps {
  content: string;
}

// Initialize mermaid
mermaid.initialize({ 
  startOnLoad: true,
  theme: 'default',
  flowchart: {
    htmlLabels: true,
    curve: 'basis'
  }
});

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const InfographicRenderer: React.FC<InfographicRendererProps> = ({ content }) => {
  const [infographicData, setInfographicData] = useState<InfographicData | null>(null);
  const [mermaidDiagram, setMermaidDiagram] = useState<string>('');
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    parseInfographicContent(content);
  }, [content]);

  useEffect(() => {
    if (mermaidDiagram && mermaidRef.current) {
      mermaidRef.current.innerHTML = mermaidDiagram;
      mermaid.init(undefined, mermaidRef.current);
    }
  }, [mermaidDiagram]);

  const parseInfographicContent = (rawContent: string) => {
    try {
      const lines = rawContent.trim().split('\n');
      const data: InfographicData = {
        type: 'flowchart',
        title: '',
        elements: [],
        relationships: [],
        data: []
      };

      lines.forEach(line => {
        const trimmed = line.replace('//', '').trim();
        if (trimmed.startsWith('Type:')) {
          data.type = trimmed.replace('Type:', '').trim().toLowerCase() as any;
        } else if (trimmed.startsWith('Title:')) {
          data.title = trimmed.replace('Title:', '').trim();
        } else if (trimmed.startsWith('Description:')) {
          data.description = trimmed.replace('Description:', '').trim();
        } else if (trimmed.startsWith('Elements:')) {
          // Parse elements list
        } else if (trimmed.includes(':') && !trimmed.startsWith('Relationships')) {
          // Parse element items
          data.elements?.push(trimmed);
        } else if (trimmed.startsWith('-')) {
          // Parse relationships
          data.relationships?.push(trimmed.substring(1).trim());
        } else if (trimmed.startsWith('Data:')) {
          // Parse data for charts
          try {
            const jsonStr = trimmed.replace('Data:', '').trim();
            data.data = JSON.parse(jsonStr);
          } catch {
            // If not JSON, handle as simple data
          }
        }
      });

      setInfographicData(data);
      
      if (['flowchart', 'mindmap', 'hierarchy', 'process'].includes(data.type)) {
        generateMermaidDiagram(data);
      }
    } catch (error) {
      console.error('Error parsing infographic content:', error);
    }
  };

  const generateMermaidDiagram = (data: InfographicData) => {
    let diagram = '';
    
    switch (data.type) {
      case 'flowchart':
      case 'process':
        diagram = generateFlowchart(data);
        break;
      case 'mindmap':
        diagram = generateMindmap(data);
        break;
      case 'hierarchy':
        diagram = generateHierarchy(data);
        break;
      default:
        break;
    }
    
    setMermaidDiagram(diagram);
  };

  const generateFlowchart = (data: InfographicData): string => {
    let flowchart = 'graph TD\n';
    const nodes: { [key: string]: string } = {};
    
    // Create nodes from elements
    data.elements?.forEach((element, index) => {
      const nodeId = `node${index}`;
      const label = element.replace(/^\d+\.\s*/, '');
      nodes[label] = nodeId;
      flowchart += `    ${nodeId}["${label}"]\n`;
    });
    
    // Add relationships
    data.relationships?.forEach(rel => {
      // Parse relationship strings like "1→2→3"
      const arrows = rel.match(/(\d+|[^→\s]+)\s*→\s*(\d+|[^→\s]+)/g);
      if (arrows) {
        arrows.forEach(arrow => {
          const [from, to] = arrow.split('→').map(s => s.trim());
          const fromNode = Object.keys(nodes).find(key => key.includes(from));
          const toNode = Object.keys(nodes).find(key => key.includes(to));
          if (fromNode && toNode) {
            flowchart += `    ${nodes[fromNode]} --> ${nodes[toNode]}\n`;
          }
        });
      }
    });
    
    return flowchart;
  };

  const generateMindmap = (data: InfographicData): string => {
    let mindmap = 'graph LR\n';
    const root = data.title || 'Root';
    mindmap += `    root["${root}"]\n`;
    
    data.elements?.forEach((element, index) => {
      const nodeId = `node${index}`;
      mindmap += `    root --> ${nodeId}["${element}"]\n`;
    });
    
    return mindmap;
  };

  const generateHierarchy = (data: InfographicData): string => {
    let hierarchy = 'graph TB\n';
    
    data.elements?.forEach((element, index) => {
      const nodeId = `node${index}`;
      const level = element.match(/^\s*/)?.[0].length || 0;
      const label = element.trim();
      
      if (level === 0) {
        hierarchy += `    ${nodeId}["${label}"]\n`;
      } else {
        const parentId = `node${Math.max(0, index - 1)}`;
        hierarchy += `    ${parentId} --> ${nodeId}["${label}"]\n`;
      }
    });
    
    return hierarchy;
  };

  const renderTimeline = () => {
    if (!infographicData) return null;
    
    return (
      <div className="timeline-container">
        <h3>{infographicData.title}</h3>
        <div className="timeline">
          {infographicData.elements?.map((element, index) => (
            <div key={index} className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                {element}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    if (!infographicData) return null;
    
    return (
      <div className="comparison-container">
        <h3>{infographicData.title}</h3>
        <div className="comparison-grid">
          {infographicData.elements?.map((element, index) => (
            <div key={index} className="comparison-item">
              {element}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    if (!infographicData || !infographicData.data) return null;
    
    const chartType = infographicData.chartType || 'bar';
    
    return (
      <div className="chart-container">
        <h3>{infographicData.title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'bar' && (
            <BarChart data={infographicData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={CHART_COLORS[0]} />
            </BarChart>
          )}
          {chartType === 'line' && (
            <LineChart data={infographicData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} />
            </LineChart>
          )}
          {chartType === 'pie' && (
            <PieChart>
              <Pie
                data={infographicData.data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill={CHART_COLORS[0]}
                dataKey="value"
                label
              >
                {infographicData.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  if (!infographicData) return null;

  return (
    <div className="infographic-renderer">
      {['flowchart', 'mindmap', 'hierarchy', 'process'].includes(infographicData.type) && (
        <div className="mermaid-container">
          <h3>{infographicData.title}</h3>
          {infographicData.description && <p>{infographicData.description}</p>}
          <div ref={mermaidRef} className="mermaid"></div>
        </div>
      )}
      {infographicData.type === 'timeline' && renderTimeline()}
      {infographicData.type === 'comparison' && renderComparison()}
      {infographicData.type === 'chart' && renderChart()}
    </div>
  );
};