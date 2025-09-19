import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Folder as FolderIcon, FileText } from 'lucide-react'
import * as d3 from 'd3'
import { getUserFiles, getUserFolders, type FileWithMetadata, type Folder } from '../../../../lib/api'
import './GraphView.css'

interface GraphViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  searchResults?: FileWithMetadata[]
  isSearching?: boolean
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  type: 'file' | 'folder'
  tags: string[]
  folderId?: string | null
  folderName?: string
  fileType?: string
  // Connection-based properties
  connectionCount: number
  importance: number
  radius: number
  // D3 simulation properties
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  type: 'file-file' | 'folder-file' | 'folder-folder'
  sharedTags?: string[]
  strength?: number
}

export const GraphView: React.FC<GraphViewProps> = ({ onFileSelect, selectedFileId, searchResults, isSearching }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null)
  
  // D3 refs and state
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  
  // Container dimensions and zoom state
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [currentZoom, setCurrentZoom] = useState(1)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [connectedNodes, setConnectedNodes] = useState<Set<string>>(new Set())
  
  // Obsidian-style display thresholds
  const labelVisibilityThreshold = 0.5
  const iconVisibilityThreshold = 0.8
  const detailVisibilityThreshold = 1.2

  // Color palette similar to Obsidian color groups – used to colorize nodes
  const COLOR_PALETTE = [
    '#60a5fa', // blue-400
    '#f59e0b', // amber-500
    '#34d399', // emerald-400
    '#f472b6', // pink-400
    '#a78bfa', // violet-400
    '#f87171', // red-400
    '#22d3ee', // cyan-400
    '#fb923c', // orange-400
    '#10b981', // emerald-500
    '#f43f5e', // rose-500
    '#6366f1', // indigo-500
    '#84cc16'  // lime-500
  ]

  // Stable hash → color index so the same tag/filetype always maps to the same color
  const hashToIndex = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
    return Math.abs(h) % COLOR_PALETTE.length
  }

  const getNodeBaseColor = (node: GraphNode) => {
    if (node.type === 'folder') return '#fbbf24' // amber-400 for folders
    if (node.tags && node.tags.length > 0) return COLOR_PALETTE[hashToIndex(node.tags[0])]
    if (node.fileType) return COLOR_PALETTE[hashToIndex(node.fileType)]
    return '#94a3b8' // slate-400 fallback
  }

  const getFillAndStroke = (node: GraphNode, opts: { selected: boolean; highlighted: boolean }) => {
    const base = getNodeBaseColor(node)
    if (opts.selected) {
      return { fill: d3.hsl('#3b82f6').brighter(1).formatHex(), stroke: '#3b82f6' }
    }
    if (opts.highlighted) {
      return { fill: d3.hsl(base).brighter(1).formatHex(), stroke: base }
    }
    // subtle desaturation for default state so the graph looks calm but colorful
    const fill = d3.hsl(base)
    fill.s = Math.max(0, fill.s - 0.2)
    fill.l = Math.min(0.9, fill.l + 0.2)
    return { fill: fill.formatHex(), stroke: base }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (files.length > 0 || folders.length > 0) {
      generateGraph()
    }
  }, [files, folders])

  useEffect(() => {
    // Update container dimensions on resize
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width || 800, height: rect.height || 600 })
      }
    }

    window.addEventListener('resize', updateDimensions)
    updateDimensions()

    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [filesData, foldersData] = await Promise.all([
        getUserFiles(),
        getUserFolders()
      ])
      setFiles(filesData)
      setFolders(foldersData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get search result IDs for highlighting/dimming
  const searchResultIds = React.useMemo(() => {
    if (!isSearching || !searchResults) return new Set<string>()
    return new Set(searchResults.map(file => file.id))
  }, [isSearching, searchResults])

  const generateGraph = useCallback(() => {
    const newNodes: GraphNode[] = []
    const newLinks: GraphLink[] = []

    // Create folder nodes with initial properties
    folders.forEach(folder => {
      newNodes.push({
        id: `folder-${folder.id}`,
        title: folder.name,
        type: 'folder',
        tags: [],
        connectionCount: 0,
        importance: 1,
        radius: 30, // Base radius for folders
        x: dimensions.width / 2 + (Math.random() - 0.5) * 100,
        y: dimensions.height / 2 + (Math.random() - 0.5) * 100
      })
    })

    // Use search results if searching, otherwise use all files
    const sourceFiles = isSearching ? (searchResults || []) : files

    // Create file nodes with initial properties
    sourceFiles.forEach(file => {
      newNodes.push({
        id: file.id,
        title: file.title || file.filename || 'Untitled',
        type: 'file',
        tags: file.tags || [],
        folderId: file.folder_id,
        folderName: file.folder_name,
        fileType: file.file_type,
        connectionCount: 0,
        importance: 1,
        radius: 8, // Base radius for files
        x: dimensions.width / 2 + (Math.random() - 0.5) * 200,
        y: dimensions.height / 2 + (Math.random() - 0.5) * 200
      })
    })

    // Create folder-file links
    files.forEach(file => {
      if (file.folder_id) {
        const folderNodeId = `folder-${file.folder_id}`
        if (newNodes.find(n => n.id === folderNodeId)) {
          newLinks.push({
            source: folderNodeId,
            target: file.id,
            type: 'folder-file',
            strength: 0.8
          })
        }
      }
    })

    // Create file-file links based on shared tags
    for (let i = 0; i < sourceFiles.length; i++) {
      for (let j = i + 1; j < sourceFiles.length; j++) {
        const fileA = sourceFiles[i]
        const fileB = sourceFiles[j]
        const tagsA = fileA.tags || []
        const tagsB = fileB.tags || []
        const sharedTags = tagsA.filter(tag => tagsB.includes(tag))
        
        if (sharedTags.length > 0) {
          newLinks.push({
            source: fileA.id,
            target: fileB.id,
            type: 'file-file',
            sharedTags,
            strength: Math.min(sharedTags.length * 0.2, 0.8)
          })
        }
      }
    }

    // Calculate connection counts and update node properties
    const connectionCounts = new Map<string, number>()
    
    newLinks.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      
      connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1)
      connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1)
    })

    // Update node properties based on connections
    newNodes.forEach(node => {
      const connections = connectionCounts.get(node.id) || 0
      node.connectionCount = connections
      
      // Calculate importance (1-5 scale based on connections)
      node.importance = Math.min(1 + connections * 0.5, 5)
      
      // Calculate dynamic radius based on type and importance
      if (node.type === 'folder') {
        // Folders: base 25, scale with contained files
        const containedFiles = files.filter(f => f.folder_id === node.id.replace('folder-', '')).length
        node.radius = Math.max(25, Math.min(25 + containedFiles * 3, 45))
      } else {
        // Files: base 8, scale with connections (Obsidian-style)
        node.radius = Math.max(8, Math.min(8 + connections * 2, 20))
      }
    })

    setNodes(newNodes)
    setLinks(newLinks)
    
    // Initialize D3 simulation
    initializeSimulation(newNodes, newLinks)
  }, [files, folders, dimensions, searchResults, isSearching])

  const initializeSimulation = useCallback((nodes: GraphNode[], links: GraphLink[]) => {
    if (!svgRef.current) return

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    // Create new simulation with Obsidian-style parameters
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          // Adaptive link distance based on node importance
          const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source)
          const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target)
          
          if (d.type === 'folder-file') return 60 + (source?.radius || 0) + (target?.radius || 0)
          if (d.type === 'file-file') {
            // Shorter distances for highly connected nodes (Obsidian behavior)
            const avgImportance = ((source?.importance || 1) + (target?.importance || 1)) / 2
            return Math.max(30, 80 - avgImportance * 10)
          }
          return 80
        })
        .strength(d => {
          // Weaker links for better stability (Obsidian-style)
          if (d.type === 'folder-file') return 0.6
          return Math.min(d.strength || 0.3, 0.5)
        })
      )
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // Obsidian-style repulsion based on node importance
          const baseStrength = d.type === 'folder' ? -600 : -200
          return baseStrength * d.importance
        })
        .distanceMax(300) // Limit repulsion range for performance
      )
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
        .strength(0.1) // Weak center force for natural clustering
      )
      .force('collision', d3.forceCollide()
        .radius(d => d.radius + 5) // Use dynamic radius with padding
        .strength(0.8)
      )

    // Add subtle folder containment force (Obsidian-style)
    simulation.force('folderContainment', () => {
      nodes.forEach(node => {
        if (node.type === 'file' && node.folderId) {
          const folderNode = nodes.find(n => n.id === `folder-${node.folderId}`)
          if (folderNode && folderNode.x !== undefined && folderNode.y !== undefined) {
            const dx = folderNode.x - (node.x || 0)
            const dy = folderNode.y - (node.y || 0)
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Gentle attraction to folder (not too strong)
            if (distance > folderNode.radius + 20) {
              const force = 0.02 // Very gentle force
              if (node.vx !== undefined) node.vx += dx * force
              if (node.vy !== undefined) node.vy += dy * force
            }
          }
        }
      })
    })

    // Obsidian-style simulation parameters
    simulation
      .alpha(1) // Start with high energy
      .alphaDecay(0.02) // Slow decay for smooth settling
      .alphaMin(0.001) // Very low minimum for stability
      .velocityDecay(0.4) // Moderate friction

    simulationRef.current = simulation

    // Set up zoom behavior with level-of-detail
    const svg = d3.select(svgRef.current)
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        transformRef.current = event.transform
        setCurrentZoom(event.transform.k)
        
        svg.select('.graph-content')
          .attr('transform', event.transform.toString())
        
        // Update visibility based on zoom level (Obsidian-style)
        svg.selectAll('.node-label')
          .style('opacity', event.transform.k >= labelVisibilityThreshold ? 1 : 0)
        
        svg.selectAll('.connection-indicator')
          .style('opacity', event.transform.k >= detailVisibilityThreshold ? 1 : 0)
        
        // Simplify links at low zoom
        svg.selectAll('.graph-link')
          .style('opacity', event.transform.k >= 0.3 ? 
            (d: any) => d.type === 'folder-file' ? 0.6 : 0.4 : 0.2)
      })

    svg.call(zoomBehavior)

    // Update nodes on simulation tick with throttling for performance
    let tickCount = 0
    simulation.on('tick', () => {
      tickCount++
      // Throttle updates for better performance (Obsidian-style)
      if (tickCount % 2 === 0 || simulation.alpha() < 0.1) {
        // spread keeps object identity for D3 while allowing React to re-render
        setNodes([...nodes])
      }
    })

    // Auto-stop simulation when settled for better performance
    simulation.on('end', () => {
      setNodes([...nodes])
    })

  }, [dimensions])

  const handleZoomIn = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.2
    )
  }

  const handleZoomOut = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.8
    )
  }

  const handleReset = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    )
    transformRef.current = d3.zoomIdentity
  }

  const handleNodeClick = (node: GraphNode) => {
    if (node.type === 'file') {
      const file = files.find(f => f.id === node.id)
      if (file) {
        onFileSelect(file)
      }
    }
    // For folder nodes, we could implement folder expansion/collapse here
  }

  const handleNodeHover = (node: GraphNode | null) => {
    if (!node) {
      setHoveredNode(null)
      setConnectedNodes(new Set())
      return
    }

    setHoveredNode(node.id)
    
    // Find all connected nodes (Obsidian-style highlighting)
    const connected = new Set<string>()
    connected.add(node.id)
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id
      const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id
      
      if (sourceId === node.id) {
        connected.add(targetId)
      } else if (targetId === node.id) {
        connected.add(sourceId)
      }
    })
    
    setConnectedNodes(connected)
  }

  const handleNodeDragStart = (event: any, node: GraphNode) => {
    if (!simulationRef.current) return
    if (!event.active) simulationRef.current.alphaTarget(0.3).restart()
    node.fx = node.x
    node.fy = node.y
    setDraggedNode(node)
  }

  const handleNodeDrag = (event: any, node: GraphNode) => {
    node.fx = event.x
    node.fy = event.y
  }

  const handleNodeDragEnd = (event: any, node: GraphNode) => {
    if (!simulationRef.current) return
    if (!event.active) simulationRef.current.alphaTarget(0)
    node.fx = null
    node.fy = null
    setDraggedNode(null)
  }

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="graph-view-loading">
        <div className="loading-spinner"></div>
        <p>Loading knowledge graph...</p>
      </div>
    )
  }

  if (files.length === 0 && folders.length === 0) {
    return (
      <div className="graph-view-empty">
        <div className="empty-graph-icon">⚡</div>
        <h3>No knowledge graph yet</h3>
        <p>Upload content with tags or create folders to see connections between your documents.</p>
      </div>
    )
  }

  return (
    <div className="graph-view">
      <div className="graph-controls">
        <button className="graph-control-btn" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn />
        </button>
        <button className="graph-control-btn" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut />
        </button>
        <button className="graph-control-btn" onClick={handleReset} title="Reset View">
          <RotateCcw />
        </button>
      </div>

      <div className="graph-container">
        <svg
          ref={svgRef}
          className="graph-svg"
          width="100%"
          height="100%"
        >
          <defs>
            {/* Obsidian-style subtle gradients */}
            <radialGradient id="nodeGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f3f4f6" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="selectedNodeGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="folderGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
              <stop offset="100%" stopColor="#f3f4f6" stopOpacity="1" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <g className="graph-content">
            {/* Render links with Obsidian-style subtlety */}
            {links.map((link, index) => {
              const source = typeof link.source === 'string' 
                ? nodes.find(n => n.id === link.source) 
                : link.source
              const target = typeof link.target === 'string' 
                ? nodes.find(n => n.id === link.target) 
                : link.target
              
              if (!source || !target || source.x === undefined || source.y === undefined || 
                  target.x === undefined || target.y === undefined) return null

              // Obsidian-style link colors and widths with hover highlighting
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id
              const targetId = typeof link.target === 'string' ? link.target : link.target.id
              const isHighlighted = hoveredNode && (connectedNodes.has(sourceId) && connectedNodes.has(targetId))
              const isDimmed = hoveredNode && !isHighlighted
              
              const linkColor = isHighlighted ? '#3b82f6' : 
                              link.type === 'folder-file' ? '#d1d5db' : '#e5e7eb'
              const linkWidth = isHighlighted ? 2.5 : 
                              link.type === 'folder-file' ? 1.5 : 
                              link.sharedTags ? Math.min(1 + link.sharedTags.length * 0.3, 2) : 1
              const linkOpacity = isDimmed ? 0.1 : 
                                 isHighlighted ? 0.8 : 
                                 link.type === 'folder-file' ? 0.6 : 0.4

              return (
                <line
                  key={`link-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={linkColor}
                  strokeWidth={linkWidth}
                  opacity={linkOpacity}
                  className="graph-link"
                  strokeLinecap="round"
                />
              )
            })}

            {/* Render nodes with Obsidian-style clean aesthetics and better alignment */}
            {nodes.map((node) => {
              if (node.x === undefined || node.y === undefined) return null
              
              const isSelected = selectedFileId === node.id
              const isFolder = node.type === 'folder'
              const nodeRadius = node.radius
              const isHighlighted = connectedNodes.has(node.id)
              const isDimmed = hoveredNode && !isHighlighted
              const nodeOpacity = isDimmed ? 0.3 : 1
              const colors = getFillAndStroke(node, { selected: !!isSelected, highlighted: !!isHighlighted })
              
              return (
                <g
                  key={node.id}
                  className="graph-node-group"
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ opacity: nodeOpacity, cursor: 'pointer' }}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => handleNodeHover(node)}
                  onMouseLeave={() => handleNodeHover(null)}
                >
                  {isFolder ? (
                    // Folder node - subtle rounded rectangle centered at (0,0)
                    <rect
                      x={-nodeRadius}
                      y={-nodeRadius * 0.6}
                      width={nodeRadius * 2}
                      height={nodeRadius * 1.2}
                      rx={6}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={isSelected || isHighlighted ? 2 : 1}
                      className="graph-node folder-node"
                      filter={isSelected || isHighlighted ? 'url(#glow)' : undefined}
                    />
                  ) : (
                    // File node - clean circle with dynamic sizing centered at (0,0)
                    <circle
                      cx={0}
                      cy={0}
                      r={nodeRadius}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={isSelected || isHighlighted ? 2 : 1}
                      className="graph-node file-node"
                      filter={isSelected || isHighlighted ? 'url(#glow)' : undefined}
                    />
                  )}

                  {/* Centered node icon - avoid foreignObject for consistent alignment */}
                  {nodeRadius > 10 && currentZoom >= iconVisibilityThreshold && (
                    isFolder ? (
                      <g transform={`translate(-6,-6)`} style={{ pointerEvents: 'none' }}>
                        <FolderIcon size={12} color="#374151" />
                      </g>
                    ) : (
                      <g transform={`translate(-6,-6)`} style={{ pointerEvents: 'none' }}>
                        <FileText size={12} color="#374151" />
                      </g>
                    )
                  )}
                  
                  {/* Node label with level-of-detail visibility */}
                  <text
                    x={0}
                    y={nodeRadius + 15}
                    textAnchor="middle"
                    className="node-label"
                    style={{ 
                      cursor: 'pointer',
                      opacity: currentZoom >= labelVisibilityThreshold ? 1 : 0,
                      transition: 'opacity 0.15s ease-out'
                    }}
                  >
                    {node.title.length > 12 ? `${node.title.substring(0, 12)}...` : node.title}
                  </text>
                  
                  {/* Connection count indicator - only at high zoom */}
                  {node.connectionCount > 3 && currentZoom >= detailVisibilityThreshold && (
                    <>
                      <circle
                        cx={nodeRadius - 4}
                        cy={-nodeRadius + 4}
                        r={6}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={1}
                        className="connection-indicator"
                        style={{ 
                          opacity: currentZoom >= detailVisibilityThreshold ? 1 : 0,
                          transition: 'opacity 0.15s ease-out'
                        }}
                      />
                      <text
                        x={nodeRadius - 4}
                        y={-nodeRadius + 7}
                        textAnchor="middle"
                        style={{ 
                          fontSize: '8px', 
                          fill: 'white', 
                          fontWeight: 'bold',
                          opacity: currentZoom >= detailVisibilityThreshold ? 1 : 0,
                          transition: 'opacity 0.15s ease-out'
                        }}
                      >
                        {node.connectionCount}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}