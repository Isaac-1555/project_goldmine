import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { InfographicSpec, InfographicNode } from '../../lib/viz/types';

interface MindMapRendererProps {
  spec: InfographicSpec;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const MindMapRenderer: React.FC<MindMapRendererProps> = ({
  spec,
  width = 900,
  height = 700,
  interactive = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const centerX = width / 2;
    const centerY = height / 2;

    // Create a zoomable layer
    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');

    // Main content group centered
    const g = zoomLayer.append('g')
      .attr('class', 'mindmap-content')
      .attr('transform', `translate(${centerX}, ${centerY})`);

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

    // Get nodes by level
    const centerNode = spec.nodes.find(n => n.level === 0);
    const primaryNodes = spec.nodes.filter(n => n.level === 1);
    const secondaryNodes = spec.nodes.filter(n => n.level === 2);

    if (!centerNode) {
      console.error('Mind map must have a center node (level=0)');
      return;
    }

    // Render connections (lines) first so they're behind nodes
    renderConnections(g, centerNode, primaryNodes, secondaryNodes);

    // Render center node
    renderCenterNode(g, centerNode, interactive, setHoveredNode, hoveredNode);

    // Render primary branches
    renderPrimaryBranches(g, primaryNodes, secondaryNodes, interactive, setHoveredNode, hoveredNode);

    // Render secondary nodes
    renderSecondaryNodes(g, primaryNodes, secondaryNodes, interactive, setHoveredNode, hoveredNode);

  }, [spec, width, height]);

  return (
    <div className="mind-map-container">
      <svg 
        ref={svgRef}
        className="mind-map-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', background: 'transparent', display: 'block' }}
      />
    </div>
  );
};

/**
 * Render all connection lines
 */
function renderConnections(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  centerNode: InfographicNode,
  primaryNodes: InfographicNode[],
  secondaryNodes: InfographicNode[]
) {
  const angleStep = (2 * Math.PI) / primaryNodes.length;

  // Primary connections (center to primary nodes)
  primaryNodes.forEach((node, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = Math.cos(angle) * 220;
    const y = Math.sin(angle) * 220;

    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', y)
      .attr('stroke', node.color || '#94a3b8')
      .attr('stroke-width', 3)
      .attr('opacity', 0.4)
      .attr('class', 'connection-line');
  });

  // Secondary connections (primary to secondary nodes)
  primaryNodes.forEach((primary, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const px = Math.cos(angle) * 220;
    const py = Math.sin(angle) * 220;

    const children = secondaryNodes.filter(s => primary.children?.includes(s.id));
    
    children.forEach((child, j) => {
      const childAngle = angle + ((j - (children.length - 1) / 2) * 0.35);
      const cx = Math.cos(childAngle) * 360;
      const cy = Math.sin(childAngle) * 360;

      g.append('line')
        .attr('x1', px)
        .attr('y1', py)
        .attr('x2', cx)
        .attr('y2', cy)
        .attr('stroke', primary.color || '#cbd5e1')
        .attr('stroke-width', 2)
        .attr('opacity', 0.25)
        .attr('stroke-dasharray', '5,5')
        .attr('class', 'connection-line-secondary');
    });
  });
}

/**
 * Render center node
 */
function renderCenterNode(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  centerNode: InfographicNode,
  interactive: boolean,
  setHoveredNode: (id: string | null) => void,
  hoveredNode: string | null
) {
  const nodeGroup = g.append('g')
    .attr('class', 'center-node')
    .style('cursor', interactive ? 'pointer' : 'default');

  // Shadow filter
  const defs = g.append('defs');
  const filter = defs.append('filter')
    .attr('id', 'shadow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');
  
  filter.append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 3);
  
  filter.append('feOffset')
    .attr('dx', 0)
    .attr('dy', 2);
  
  filter.append('feComponentTransfer')
    .append('feFuncA')
    .attr('type', 'linear')
    .attr('slope', 0.3);
  
  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode');
  feMerge.append('feMergeNode')
    .attr('in', 'SourceGraphic');

  // Circle
  nodeGroup.append('circle')
    .attr('r', 70)
    .attr('fill', centerNode.color || '#3b82f6')
    .attr('stroke', '#fff')
    .attr('stroke-width', 4)
    .attr('filter', 'url(#shadow)')
    .attr('class', 'node-circle');

  // Text
  const text = nodeGroup.append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 0)
    .attr('fill', '#fff')
    .attr('font-weight', 'bold')
    .attr('font-size', '14px')
    .text(centerNode.label);

  const wasTruncated = wrapText(text, 110, 3);

    if (interactive) {
      nodeGroup
        .on('mouseenter', () => {
          setHoveredNode(centerNode.id);
          nodeGroup.style('cursor', 'pointer');
        })
        .on('mouseleave', () => {
          setHoveredNode(null);
          nodeGroup.style('cursor', null);
        });
    }

  // Add tooltip if truncated
  if (wasTruncated) {
    nodeGroup.append('title').text(centerNode.label);
  }
}

/**
 * Render primary branch nodes
 */
function renderPrimaryBranches(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  primaryNodes: InfographicNode[],
  secondaryNodes: InfographicNode[],
  interactive: boolean,
  setHoveredNode: (id: string | null) => void,
  hoveredNode: string | null
) {
  const angleStep = (2 * Math.PI) / primaryNodes.length;

  primaryNodes.forEach((node, i) => {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * 220;
    const y = Math.sin(angle) * 220;

    const nodeGroup = g.append('g')
      .attr('class', 'primary-node')
      .attr('transform', `translate(${x}, ${y})`)
      .style('cursor', interactive ? 'pointer' : 'default');

    // Circle
    nodeGroup.append('circle')
      .attr('r', 50)
      .attr('fill', node.color || '#60a5fa')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .attr('filter', 'url(#shadow)')
      .attr('class', 'node-circle')
      .style('transition', 'all 0.3s ease');

    // Text
    const text = nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 0)
      .attr('fill', '#fff')
      .attr('font-weight', '600')
      .attr('font-size', '12px')
      .text(node.label);

    const wasTruncated = wrapText(text, 75, 2);

    // Add tooltip if truncated
    if (wasTruncated) {
      nodeGroup.append('title').text(node.label);
    }

    if (interactive) {
      nodeGroup
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          setHoveredNode(node.id);
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 55)
            .attr('stroke-width', 4);
        })
        .on('mouseleave', function() {
          setHoveredNode(null);
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 50)
            .attr('stroke-width', 3);
        });
    }

    // Show description on hover if available
    if (node.description && hoveredNode === node.id) {
      nodeGroup.append('foreignObject')
        .attr('x', -100)
        .attr('y', 65)
        .attr('width', 200)
        .attr('height', 60)
        .append('xhtml:div')
        .style('background', 'rgba(0,0,0,0.9)')
        .style('color', '#fff')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '11px')
        .style('text-align', 'center')
        .text(node.description);
    }
  });
}

/**
 * Render secondary nodes
 */
function renderSecondaryNodes(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  primaryNodes: InfographicNode[],
  secondaryNodes: InfographicNode[],
  interactive: boolean,
  setHoveredNode: (id: string | null) => void,
  hoveredNode: string | null
) {
  const angleStep = (2 * Math.PI) / primaryNodes.length;

  primaryNodes.forEach((primary, i) => {
    const angle = i * angleStep - Math.PI / 2;
    
    const children = secondaryNodes.filter(s => primary.children?.includes(s.id));
    
    children.forEach((child, j) => {
      const childAngle = angle + ((j - (children.length - 1) / 2) * 0.35);
      const cx = Math.cos(childAngle) * 360;
      const cy = Math.sin(childAngle) * 360;

      const nodeGroup = g.append('g')
        .attr('class', 'secondary-node')
        .attr('transform', `translate(${cx}, ${cy})`)
        .style('cursor', interactive ? 'pointer' : 'default');

      // Circle
      nodeGroup.append('circle')
        .attr('r', 35)
        .attr('fill', '#f1f5f9')
        .attr('stroke', primary.color || '#60a5fa')
        .attr('stroke-width', 2.5)
        .attr('class', 'node-circle')
        .style('transition', 'all 0.3s ease');

      // Text
      const text = nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 0)
        .attr('fill', '#1e293b')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .text(child.label);

      const wasTruncated = wrapText(text, 55, 2);

      // Add tooltip if truncated
      if (wasTruncated) {
        nodeGroup.append('title').text(child.label);
      }

      if (interactive) {
        nodeGroup
          .style('cursor', 'pointer')
          .on('mouseenter', function() {
            setHoveredNode(child.id);
            d3.select(this).select('circle')
              .transition()
              .duration(200)
              .attr('r', 38)
              .attr('stroke-width', 3);
          })
          .on('mouseleave', function() {
            setHoveredNode(null);
            d3.select(this).select('circle')
              .transition()
              .duration(200)
              .attr('r', 35)
              .attr('stroke-width', 2.5);
          });
      }

      // Show description on hover
      if (child.description && hoveredNode === child.id) {
        nodeGroup.append('foreignObject')
          .attr('x', -80)
          .attr('y', 45)
          .attr('width', 160)
          .attr('height', 50)
          .append('xhtml:div')
          .style('background', 'rgba(0,0,0,0.9)')
          .style('color', '#fff')
          .style('padding', '6px')
          .style('border-radius', '4px')
          .style('font-size', '10px')
          .style('text-align', 'center')
          .text(child.description);
      }
    });
  });
}

/**
 * Wrap text to fit within a given width
 */
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
    const lineHeight = 1.15; // ems - slightly tighter

    // Clear and start with the first tspan
    textSel.text('');
    const tspans: d3.Selection<SVGTSpanElement, unknown, null, undefined>[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      // Create temp tspan to measure
      const tempTspan = textSel.append('tspan')
        .attr('x', 0)
        .attr('y', 0)
        .text(testLine);
      
      const tooLong = (tempTspan.node() as SVGTextElement).getComputedTextLength() > width;
      
      if (tooLong && currentLine) {
        // Commit the current line
        tempTspan.text(currentLine);
        tspans.push(tempTspan);
        
        if (tspans.length >= maxLines) {
          // Truncate on last line
          const lastTspan = tspans[tspans.length - 1];
          lastTspan.text(currentLine + '…');
          wasTruncated = true;
          break;
        }
        
        // Start new line with current word
        currentLine = word;
      } else if (tooLong && !currentLine) {
        // Single word is too long - truncate it
        tempTspan.text(word.substring(0, Math.floor(width / 8)) + '…');
        tspans.push(tempTspan);
        wasTruncated = true;
        break;
      } else {
        currentLine = testLine;
        tempTspan.remove();
      }
    }

    // Add final line if not truncated
    if (currentLine && tspans.length < maxLines) {
      const finalTspan = textSel.append('tspan')
        .attr('x', 0)
        .attr('y', 0)
        .text(currentLine);
      tspans.push(finalTspan);
    }

    // Center block vertically by applying dy offsets
    const totalLines = tspans.length;
    const startOffset = -((totalLines - 1) * lineHeight) / 2;
    
    tspans.forEach((tspan, index) => {
      tspan.attr('dy', (startOffset + index * lineHeight) + 'em');
    });
  });

  return wasTruncated;
}
