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
  const [hoveredNodeData, setHoveredNodeData] = useState<InfographicNode | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<InfographicNode | null>(null);

  // The active node is either the selected one (locked) or the hovered one (preview)
  const activeNode = selectedNodeData || hoveredNodeData;

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
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior as any);
    
    // Background click handler to deselect
    svg.on('click', (event) => {
      // Only deselect if clicking on the background (svg element itself)
      if (event.target === svgRef.current) {
        setSelectedNodeData(null);
      }
    });
    
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

    // Pass state setters to render functions
    const interactionProps = {
      interactive,
      setHoveredNodeData,
      setSelectedNodeData
    };

    // Render connections (lines) first so they're behind nodes
    renderConnections(g, centerNode, primaryNodes, secondaryNodes);

    // Render center node
    renderCenterNode(g, centerNode, interactionProps);

    // Render primary branches
    renderPrimaryBranches(g, primaryNodes, secondaryNodes, interactionProps);

    // Render secondary nodes
    renderSecondaryNodes(g, primaryNodes, secondaryNodes, interactionProps);

  }, [spec, width, height]);

  return (
    <div className="mind-map-container" style={{ position: 'relative' }}>
      <svg 
        ref={svgRef}
        className="mind-map-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', background: 'transparent', display: 'block' }}
      />
      
      {/* Rich Details Hover Card */}
      {activeNode && (
        <div className="infographic-details-card">
          <div className="details-card-header">
            <span 
              className="details-card-type"
              style={{ backgroundColor: activeNode.color || '#3b82f6' }}
            >
              {getNodeTypeLabel(activeNode.level)}
            </span>
            {selectedNodeData && selectedNodeData.id === activeNode.id && (
              <span className="details-card-pinned">📌 Pinned</span>
            )}
          </div>
          <h4 className="details-card-title">{activeNode.label}</h4>
          {activeNode.description && (
            <p className="details-card-description">{activeNode.description}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Helper for node type labels
function getNodeTypeLabel(level?: number): string {
  switch(level) {
    case 0: return 'Central Concept';
    case 1: return 'Key Topic';
    case 2: return 'Sub-point';
    default: return 'Concept';
  }
}

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
  // Increased radius for better legibility (220 -> 280)
  const primaryRadius = 280;
  // Increased radius for better legibility (360 -> 450)
  const secondaryRadius = 450;

  // Primary connections (center to primary nodes)
  primaryNodes.forEach((node, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = Math.cos(angle) * primaryRadius;
    const y = Math.sin(angle) * primaryRadius;

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
    const px = Math.cos(angle) * primaryRadius;
    const py = Math.sin(angle) * primaryRadius;

    const children = secondaryNodes.filter(s => primary.children?.includes(s.id));
    
    children.forEach((child, j) => {
      const childAngle = angle + ((j - (children.length - 1) / 2) * 0.35);
      const cx = Math.cos(childAngle) * secondaryRadius;
      const cy = Math.sin(childAngle) * secondaryRadius;

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

// Interface for shared interaction props
interface InteractionProps {
  interactive: boolean;
  setHoveredNodeData: (node: InfographicNode | null) => void;
  setSelectedNodeData: (node: InfographicNode | null) => void;
}

/**
 * Render center node
 */
function renderCenterNode(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  centerNode: InfographicNode,
  props: InteractionProps
) {
  const nodeGroup = g.append('g')
    .attr('class', 'center-node')
    .attr('pointer-events', 'all') // CRITICAL: Ensure events are captured
    .style('cursor', props.interactive ? 'pointer' : 'default');

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
    .attr('r', 80) // Increased size (70 -> 80)
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
    .attr('font-size', '16px') // Increased font (14px -> 16px)
    .style('pointer-events', 'none') // Let events pass through text to the group/circle
    .text(centerNode.label);

  wrapText(text, 130, 3); // Increased wrap width (110 -> 130)

  if (props.interactive) {
    nodeGroup
      .on('mouseenter', () => {
        props.setHoveredNodeData(centerNode);
        nodeGroup.style('cursor', 'pointer');
      })
      .on('mouseleave', () => {
        props.setHoveredNodeData(null);
      })
      .on('click', (event) => {
        event.stopPropagation(); // Stop background click from firing
        props.setSelectedNodeData(centerNode);
      });
  }
}

/**
 * Render primary branch nodes
 */
function renderPrimaryBranches(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  primaryNodes: InfographicNode[],
  secondaryNodes: InfographicNode[],
  props: InteractionProps
) {
  const angleStep = (2 * Math.PI) / primaryNodes.length;
  const primaryRadius = 280; // Matches connection radius

  primaryNodes.forEach((node, i) => {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * primaryRadius;
    const y = Math.sin(angle) * primaryRadius;

    const nodeGroup = g.append('g')
      .attr('class', 'primary-node')
      .attr('pointer-events', 'all') // CRITICAL: Ensure events are captured
      .attr('transform', `translate(${x}, ${y})`)
      .style('cursor', props.interactive ? 'pointer' : 'default');

    // Circle
    nodeGroup.append('circle')
      .attr('r', 60) // Increased size (50 -> 60)
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
      .attr('font-size', '14px') // Increased font (12px -> 14px)
      .style('pointer-events', 'none') // Let events pass through text
      .text(node.label);

    wrapText(text, 90, 3); // Increased wrap width (75 -> 90)

    if (props.interactive) {
      nodeGroup
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          props.setHoveredNodeData(node);
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 65)
            .attr('stroke-width', 4);
        })
        .on('mouseleave', function() {
          props.setHoveredNodeData(null);
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 60)
            .attr('stroke-width', 3);
        })
        .on('click', (event) => {
          event.stopPropagation();
          props.setSelectedNodeData(node);
        });
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
  props: InteractionProps
) {
  const angleStep = (2 * Math.PI) / primaryNodes.length;
  const secondaryRadius = 450; // Matches connection radius

  primaryNodes.forEach((primary, i) => {
    const angle = i * angleStep - Math.PI / 2;
    
    const children = secondaryNodes.filter(s => primary.children?.includes(s.id));
    
    children.forEach((child, j) => {
      const childAngle = angle + ((j - (children.length - 1) / 2) * 0.35);
      const cx = Math.cos(childAngle) * secondaryRadius;
      const cy = Math.sin(childAngle) * secondaryRadius;

      const nodeGroup = g.append('g')
        .attr('class', 'secondary-node')
        .attr('pointer-events', 'all') // CRITICAL: Ensure events are captured
        .attr('transform', `translate(${cx}, ${cy})`)
        .style('cursor', props.interactive ? 'pointer' : 'default');

      // Circle
      nodeGroup.append('circle')
        .attr('r', 40) // Increased size (35 -> 40)
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
        .attr('font-size', '12px') // Increased font (10px -> 12px)
        .attr('font-weight', '500')
        .style('pointer-events', 'none') // Let events pass through text
        .text(child.label);

      wrapText(text, 65, 2); // Increased wrap width (55 -> 65)

      if (props.interactive) {
        nodeGroup
          .style('cursor', 'pointer')
          .on('mouseenter', function() {
            props.setHoveredNodeData(child);
            d3.select(this).select('circle')
              .transition()
              .duration(200)
              .attr('r', 45)
              .attr('stroke-width', 3);
          })
          .on('mouseleave', function() {
            props.setHoveredNodeData(null);
            d3.select(this).select('circle')
              .transition()
              .duration(200)
              .attr('r', 40)
              .attr('stroke-width', 2.5);
          })
          .on('click', (event) => {
            event.stopPropagation();
            props.setSelectedNodeData(child);
          });
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
    if (currentLine && tspans.length < maxLines && !wasTruncated) {
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
