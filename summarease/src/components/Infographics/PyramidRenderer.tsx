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
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
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

      // Add text for nodes
      nodes.forEach((node, nodeIndex) => {
        const textY = y + levelHeight / 2;
        const textX = x + levelWidth / 2;

        // Main label
        levelGroup.append('text')
          .attr('x', textX)
          .attr('y', textY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#1e293b')
          .attr('font-weight', 'bold')
          .attr('font-size', index === 0 ? '18px' : '15px')
          .text(node.label);

        // Description if available
        if (node.description) {
          levelGroup.append('text')
            .attr('x', textX)
            .attr('y', textY + 22)
            .attr('text-anchor', 'middle')
            .attr('fill', '#475569')
            .attr('font-size', '12px')
            .text(truncateText(node.description, 50));
        }

        // Icon placeholder (if icon property exists)
        if (node.icon) {
          levelGroup.append('text')
            .attr('x', textX - levelWidth / 3)
            .attr('y', textY)
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .text(node.icon);
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

    // Title
    if (spec.title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1e293b')
        .text(spec.title);
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
