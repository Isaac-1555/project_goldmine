import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { InfographicSpec } from '../../lib/viz/types';

interface ProcessRendererProps {
  spec: InfographicSpec;
  width?: number;
  height?: number;
}

export const ProcessRenderer: React.FC<ProcessRendererProps> = ({
  spec,
  width = 900,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create zoomable layer
    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');

    // Enable zoom & pan
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior as any);
    
    // Set cursor styles
    svg.style('cursor', 'grab');
    svg.on('mousedown', function() {
      d3.select(this).style('cursor', 'grabbing');
    });
    svg.on('mouseup', function() {
      d3.select(this).style('cursor', 'grab');
    });
    svg.on('mouseleave', function() {
      d3.select(this).style('cursor', 'grab');
    });

    // Sort nodes by position
    const sortedNodes = [...spec.nodes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const nodeCount = sortedNodes.length;

    if (nodeCount === 0) return;

    // Calculate layout
    const margin = { top: 80, right: 50, bottom: 50, left: 50 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;
    
    const stepWidth = contentWidth / nodeCount;
    const boxWidth = Math.min(stepWidth * 0.7, 180);
    const boxHeight = 100;

    const g = zoomLayer.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'process-arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#0ea5e9');

    // Draw connections with arrows
    for (let i = 0; i < nodeCount - 1; i++) {
      const x1 = (i + 0.5) * stepWidth + boxWidth / 2;
      const x2 = (i + 1.5) * stepWidth - boxWidth / 2;
      const y = contentHeight / 2;

      g.append('line')
        .attr('x1', x1)
        .attr('y1', y)
        .attr('x2', x2)
        .attr('y2', y)
        .attr('stroke', '#0ea5e9')
        .attr('stroke-width', 3)
        .attr('marker-end', 'url(#process-arrow)')
        .attr('opacity', 0.7);
    }

    // Draw process boxes
    sortedNodes.forEach((node, i) => {
      const x = (i + 0.5) * stepWidth;
      const y = contentHeight / 2;

      const nodeGroup = g.append('g')
        .attr('transform', `translate(${x}, ${y})`);

      // Box
      nodeGroup.append('rect')
        .attr('x', -boxWidth / 2)
        .attr('y', -boxHeight / 2)
        .attr('width', boxWidth)
        .attr('height', boxHeight)
        .attr('rx', 8)
        .attr('fill', node.color || getStepColor(i, nodeCount))
        .attr('stroke', '#0ea5e9')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0px 3px 6px rgba(0,0,0,0.15))');

      // Step number badge
      nodeGroup.append('circle')
        .attr('cx', -boxWidth / 2 + 20)
        .attr('cy', -boxHeight / 2 - 15)
        .attr('r', 18)
        .attr('fill', '#0ea5e9')
        .attr('stroke', '#fff')
        .attr('stroke-width', 3);

      nodeGroup.append('text')
        .attr('x', -boxWidth / 2 + 20)
        .attr('y', -boxHeight / 2 - 15)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#fff')
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .text((i + 1).toString());

      // Label
      const text = nodeGroup.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#1e293b')
        .attr('font-weight', '600')
        .attr('font-size', '14px')
        .text(node.label);

      const wasTruncated = wrapText(text, boxWidth - 20, 3);

      // Add tooltip if truncated
      if (wasTruncated || node.description) {
        nodeGroup.append('title').text(node.description || node.label);
      }

      // Description below if available
      if (node.description && node.description !== node.label) {
        const descText = nodeGroup.append('text')
          .attr('x', 0)
          .attr('y', boxHeight / 2 + 25)
          .attr('text-anchor', 'middle')
          .attr('fill', '#64748b')
          .attr('font-size', '11px')
          .attr('font-style', 'italic')
          .text(node.description);

        wrapText(descText, boxWidth, 2);
      }
    });

    // Title (outside zoom layer) - theme-aware colors
    if (spec.title) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '22px')
        .attr('font-weight', 'bold')
        .attr('fill', isDark ? '#e5e7eb' : '#1e293b')  // Light for dark, dark for light
        .text(spec.title);
    }

    // Subtitle - theme-aware colors
    if (spec.subtitle) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', isDark ? '#94a3b8' : '#64748b')  // Light for dark, medium for light
        .text(spec.subtitle);
    }

  }, [spec, width, height]);

  return (
    <div className="process-diagram-container">
      <svg 
        ref={svgRef}
        className="process-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', background: 'transparent', display: 'block' }}
      />
    </div>
  );
};

// Get color for step based on position
function getStepColor(index: number, total: number): string {
  const colors = [
    '#dbeafe', // sky-100
    '#bfdbfe', // blue-200
    '#93c5fd', // blue-300
    '#60a5fa', // blue-400
    '#3b82f6', // blue-500
    '#2563eb', // blue-600
    '#1d4ed8', // blue-700
    '#1e40af', // blue-800
  ];
  
  // Gradient from light to dark
  const colorIndex = Math.floor((index / total) * colors.length);
  return colors[Math.min(colorIndex, colors.length - 1)];
}

// Text wrapping utility
function wrapText(
  text: d3.Selection<SVGTextElement, unknown, null, undefined>,
  width: number,
  maxLines: number = 3
): boolean {
  let wasTruncated = false;

  text.each(function() {
    const textSel = d3.select(this);
    const original = textSel.text();
    const words = (original || '').split(/\s+/);
    const lineHeight = 1.1;

    textSel.text('');
    let tspan = textSel.append('tspan').attr('x', 0).attr('dy', '0em');
    let line: string = '';
    let linesCount = 1;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = line ? `${line} ${word}` : word;
      tspan.text(testLine);
      const tooLong = (tspan.node() as SVGTextElement).getComputedTextLength() > width;
      
      if (tooLong) {
        if (line) tspan.text(line);
        
        if (linesCount >= maxLines) {
          const currentText = tspan.text();
          tspan.text(currentText.substring(0, currentText.length - 2) + '...');
          wasTruncated = true;
          break;
        }
        
        line = word;
        linesCount++;
        tspan = textSel.append('tspan')
          .attr('x', 0)
          .attr('dy', `${lineHeight}em`)
          .text(word);
      } else {
        line = testLine;
      }
    }

    // Center vertically
    const yOffset = -(linesCount - 1) * lineHeight * 0.5;
    textSel.selectAll('tspan').attr('dy', (d, i) => {
      return i === 0 ? `${yOffset}em` : `${lineHeight}em`;
    });
  });

  return wasTruncated;
}
