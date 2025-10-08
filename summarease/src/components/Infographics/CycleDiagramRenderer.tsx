import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { InfographicSpec } from '../../lib/viz/types';

interface CycleDiagramRendererProps {
  spec: InfographicSpec;
  width?: number;
  height?: number;
}

export const CycleDiagramRenderer: React.FC<CycleDiagramRendererProps> = ({
  spec,
  width = 800,
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

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const g = zoomLayer.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Sort nodes by position
    const sortedNodes = [...spec.nodes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const nodeCount = sortedNodes.length;

    if (nodeCount === 0) return;

    // Define arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#94a3b8');

    // Draw circular connections with arrows
    sortedNodes.forEach((node, i) => {
      const angle1 = (i / nodeCount) * 2 * Math.PI - Math.PI / 2;
      const angle2 = ((i + 1) / nodeCount) * 2 * Math.PI - Math.PI / 2;

      const x1 = Math.cos(angle1) * radius;
      const y1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius;
      const y2 = Math.sin(angle2) * radius;

      // Create curved path between nodes
      const midAngle = (angle1 + angle2) / 2;
      const controlRadius = radius * 1.2;
      const cx = Math.cos(midAngle) * controlRadius;
      const cy = Math.sin(midAngle) * controlRadius;

      const path = g.append('path')
        .attr('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`)
        .attr('fill', 'none')
        .attr('stroke', node.color || '#94a3b8')
        .attr('stroke-width', 3)
        .attr('marker-end', 'url(#arrow)')
        .attr('opacity', 0.5);

      // Connection label if available
      const connection = spec.connections?.find(c => 
        c.from === node.id || c.to === node.id
      );
      
      if (connection?.label) {
        g.append('text')
          .attr('x', cx)
          .attr('y', cy)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('fill', '#64748b')
          .attr('font-style', 'italic')
          .text(connection.label);
      }
    });

    // Draw nodes
    sortedNodes.forEach((node, i) => {
      const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const nodeGroup = g.append('g')
        .attr('transform', `translate(${x}, ${y})`);

      // Node circle
      nodeGroup.append('circle')
        .attr('r', 55)
        .attr('fill', node.color || '#e0f2fe')
        .attr('stroke', '#0ea5e9')
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))');

      // Node label
      const text = nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', 0)
        .attr('fill', '#1e293b')
        .attr('font-weight', '600')
        .attr('font-size', '13px')
        .text(node.label);

      const wasTruncated = wrapText(text, 90, 3);

      // Add tooltip if truncated
      if (wasTruncated) {
        nodeGroup.append('title').text(node.label);
      }

      // Position number
      nodeGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', -45)
        .attr('r', 15)
        .attr('fill', node.color || '#0ea5e9')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      nodeGroup.append('text')
        .attr('x', 0)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#fff')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text((i + 1).toString());
    });

    // Title (outside zoom layer) - theme-aware colors
    if (spec.title) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px')
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
    <div className="cycle-diagram-container">
      <svg 
        ref={svgRef}
        className="cycle-diagram-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', background: 'transparent', display: 'block' }}
      />
    </div>
  );
};

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
    let firstTspan = textSel.append('tspan').attr('x', 0).attr('y', 0).attr('dy', '0em');
    let tspan = firstTspan;
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
          tspan.text(currentText ? currentText + '…' : word + '…');
          linesCount = maxLines;
          wasTruncated = true;
          break;
        }
        line = word;
        tspan = textSel.append('tspan')
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', lineHeight + 'em')
          .text(word);
        linesCount++;
      } else {
        line = testLine;
      }
    }

    const offset = -((linesCount - 1) * lineHeight) / 2;
    firstTspan.attr('dy', offset + 'em');
  });

  return wasTruncated;
}
