import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { InfographicSpec } from '../../lib/viz/types';

interface PyramidRendererProps {
  spec: InfographicSpec;
  width?: number;
  height?: number;
}

export const PyramidRenderer: React.FC<PyramidRendererProps> = ({
  spec,
  width = 900,
  height = 700
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

    const margin = { top: 80, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = zoomLayer.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Group nodes by level
    const levels = d3.group(spec.nodes, d => d.level ?? 0);
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);
    const levelCount = sortedLevels.length;

    if (levelCount === 0) return;

    const levelHeight = innerHeight / levelCount;
    const maxWidth = innerWidth * 0.95;
    const minWidth = innerWidth * 0.3;

    // Color palette for levels (from light/important at top to darker at bottom)
    const colorScale = d3.scaleOrdinal()
      .domain(sortedLevels.map(String))
      .range(['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']);

    sortedLevels.forEach((levelNum, index) => {
      const nodes = levels.get(levelNum) || [];
      const y = index * levelHeight;
      
      // Calculate width for this level (wider at bottom)
      const widthRatio = 1 - (index / (levelCount - 1 || 1)) * (1 - minWidth / maxWidth);
      const levelWidth = maxWidth * widthRatio;
      const x = (innerWidth - levelWidth) / 2;

      // Draw level rectangle
      const levelGroup = g.append('g')
        .attr('class', `pyramid-level-${index}`);

      levelGroup.append('rect')
        .attr('x', x)
        .attr('y', y + 5)
        .attr('width', levelWidth)
        .attr('height', levelHeight - 10)
        .attr('fill', nodes[0]?.color || colorScale(String(levelNum)) as string)
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
        .attr('rx', 8)
        .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))');

      // Add text for nodes - distribute horizontally if multiple nodes
      // Use better spacing calculation to prevent overlap
      const horizontalPadding = levelWidth * 0.05;  // 5% padding on each side
      const availableWidth = levelWidth - (horizontalPadding * 2);  // Define outside to fix scope
      
      nodes.forEach((node, nodeIndex) => {
        const textY = y + levelHeight / 2;
        
        // Distribute nodes horizontally within the level
        let textX;
        if (nodes.length === 1) {
          textX = x + levelWidth / 2;
        } else {
          // Better distribution with padding
          const spacing = availableWidth / nodes.length;
          textX = x + horizontalPadding + (spacing * nodeIndex) + (spacing / 2);
        }

        const nodeTextGroup = levelGroup.append('g')
          .attr('class', 'node-text-group')
          .style('cursor', 'pointer');

        // Add tooltip for full text
        nodeTextGroup.append('title')
          .text(node.description || node.label);

        // Main label with wrapping
        const labelText = nodeTextGroup.append('text')
          .attr('x', textX)
          .attr('y', textY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#1e293b')
          .attr('font-weight', 'bold')
          .attr('font-size', index === 0 ? '18px' : '13px')  // Slightly smaller for better fit
          .text(node.label);

        // Wrap text if needed - calculate max width based on actual spacing
        const maxTextWidth = nodes.length > 1 
          ? (availableWidth / nodes.length) * 0.85  // 85% of space per node
          : levelWidth * 0.8;
        wrapText(labelText, maxTextWidth, 2);  // Reduced to 2 lines max

        // Description if available and space permits
        if (node.description && node.description !== node.label && levelHeight > 80) {
          const descText = nodeTextGroup.append('text')
            .attr('x', textX)
            .attr('y', textY + 25)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '11px')
            .attr('font-style', 'italic')
            .text(node.description);

          wrapText(descText, maxTextWidth, 2);
        }
      });

      // Level indicator (optional)
      if (index < sortedLevels.length - 1) {
        const connectorY = y + levelHeight - 5;
        const nextLevelWidth = maxWidth * (1 - ((index + 1) / (levelCount - 1 || 1)) * (1 - minWidth / maxWidth));
        const nextX = (innerWidth - nextLevelWidth) / 2;

        // Draw subtle connectors
        [x, x + levelWidth].forEach((fromX, i) => {
          const toX = i === 0 ? nextX : nextX + nextLevelWidth;
          g.append('line')
            .attr('x1', fromX)
            .attr('y1', connectorY)
            .attr('x2', toX)
            .attr('y2', connectorY + 10)
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.4);
        });
      }
    });

    // Title (outside zoom layer) - light colored for dark background
    if (spec.title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '22px')
        .attr('font-weight', 'bold')
        .attr('fill', '#e5e7eb')  // Light gray for dark background
        .text(spec.title);
    }

    // Subtitle - light colored for dark background
    if (spec.subtitle) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#94a3b8')  // Light gray for dark background
        .text(spec.subtitle);
    }

  }, [spec, width, height]);

  return (
    <div className="pyramid-container">
      <svg 
        ref={svgRef}
        className="pyramid-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', background: 'transparent', display: 'block' }}
      />
    </div>
  );
};

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
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
    let tspan = textSel.append('tspan').attr('x', textSel.attr('x')).attr('dy', '0em');
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
          tspan.text(currentText.substring(0, Math.max(0, currentText.length - 2)) + '...');
          wasTruncated = true;
          break;
        }
        
        line = word;
        linesCount++;
        tspan = textSel.append('tspan')
          .attr('x', textSel.attr('x'))
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
