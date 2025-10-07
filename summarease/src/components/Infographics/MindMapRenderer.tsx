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

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

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

  }, [spec, width, height, hoveredNode]);

  return (
    <div className="mind-map-container">
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
        className="mind-map-svg"
        style={{ background: 'transparent' }}
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
    .attr('dy', '0.35em')
    .attr('fill', '#fff')
    .attr('font-weight', 'bold')
    .attr('font-size', '16px')
    .text(centerNode.label);

  wrapText(text, 120);

  if (interactive) {
    nodeGroup
      .on('mouseenter', () => setHoveredNode(centerNode.id))
      .on('mouseleave', () => setHoveredNode(null));
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
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-weight', '600')
      .attr('font-size', '13px')
      .text(node.label);

    wrapText(text, 80);

    if (interactive) {
      nodeGroup
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
        .attr('dy', '0.35em')
        .attr('fill', '#1e293b')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(child.label);

      wrapText(text, 60);

      if (interactive) {
        nodeGroup
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
  width: number
) {
  text.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    const lineHeight = 1.1; // ems
    const y = text.attr('y');
    const dy = parseFloat(text.attr('dy'));
    
    let word;
    let line: string[] = [];
    let lineNumber = 0;
    let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(' '));
      
      if (tspan.node()!.getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan')
          .attr('x', 0)
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word);
      }
    }
  });
}
