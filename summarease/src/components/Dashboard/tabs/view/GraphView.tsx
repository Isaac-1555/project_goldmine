import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, FileText } from 'lucide-react'
import * as d3 from 'd3'
import { getUserFiles, getUserFolders, type FileWithMetadata, type Folder } from '../../../../lib/api'
import { useSubscription } from '../../../../contexts/SubscriptionContext'
import { PremiumLock } from '../../../Subscription/PremiumLock'
import './GraphView.css'

interface GraphViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  searchResults?: FileWithMetadata[]
  isSearching?: boolean
  searchedTags?: string[]
  // State management props
  initialZoom?: number
  onZoomChange?: (zoom: number) => void
  initialPanPosition?: { x: number; y: number }
  onPanPositionChange?: (position: { x: number; y: number }) => void
  hoveredNodeId?: string | null
  onHoveredNodeChange?: (nodeId: string | null) => void
  onSelectedNodeChange?: (nodeId: string | null) => void
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  type: 'file' | 'folder' | 'tag'
  tags: string[]
  folderId?: string | null
  folderName?: string
  fileType?: string
  // Tag-specific properties
  tagName?: string
  relatedFileCount?: number
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
  type: 'file-file' | 'tag-file'
  sharedTags?: string[]
  strength?: number
}

export const GraphView: React.FC<GraphViewProps> = ({ 
  onFileSelect, 
  selectedFileId, 
  searchResults, 
  isSearching, 
  searchedTags,
  // State management props with defaults
  initialZoom = 1,
  onZoomChange,
  initialPanPosition = { x: 0, y: 0 },
  onPanPositionChange,
  hoveredNodeId: externalHoveredNodeId,
  onHoveredNodeChange,
  onSelectedNodeChange
}) => {
  const { canAccessPremiumFeatures } = useSubscription();

  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [loading, setLoading] = useState(true)
  
  // D3 refs and state
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  
  // Container dimensions and zoom state (use external state if available)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [internalHoveredNode, setInternalHoveredNode] = useState<string | null>(null)
  const [connectedNodes, setConnectedNodes] = useState<Set<string>>(new Set())
  const [graphRebuilding, setGraphRebuilding] = useState(false)
  
  // Use external state if available, otherwise use internal state
  const currentZoom = initialZoom
  const hoveredNode = externalHoveredNodeId !== undefined ? externalHoveredNodeId : internalHoveredNode
  const setHoveredNode = onHoveredNodeChange || setInternalHoveredNode
  
  // Track last generation parameters to prevent unnecessary regeneration
  const lastGenParamsRef = useRef<string>('')
  
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
    if (node.type === 'tag') return '#8b5cf6' // violet-500 for tag nodes
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
    if (!canAccessPremiumFeatures) return
    loadData()
  }, [canAccessPremiumFeatures])
  
  useEffect(() => {
    if (!canAccessPremiumFeatures) return

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

  // // Get search result IDs for highlighting/dimming - currently unused
  // const searchResultIds = React.useMemo(() => {
  //   if (!isSearching || !searchResults) return new Set<string>()
  //   return new Set(searchResults.map(file => file.id))
  // }, [isSearching, searchResults])

  const generateGraph = useCallback(() => {
    // Indicate that we're rebuilding the graph (used for overlay and cross-fade)
    setGraphRebuilding(true)

    const newNodes: GraphNode[] = []
    const newLinks: GraphLink[] = []

    // Use search results if searching, otherwise use all files
    const sourceFiles = isSearching ? (searchResults || []) : files

    // Create tag nodes when in search mode
    if (isSearching && searchedTags && searchedTags.length > 0) {
      searchedTags.forEach((tagName, index) => {
        const relatedFiles = sourceFiles.filter(file => {
          const names = (file.tags || []).map(t => (typeof t === 'string' ? t : t.name))
          return names.includes(tagName)
        })
        
        // Calculate position for tag nodes in a circular arrangement in center
        const tagCount = searchedTags.length
        const angle = (index * 2 * Math.PI) / tagCount
        const radius = tagCount > 1 ? 100 : 0 // Spread tags in circle if multiple
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2
        
        newNodes.push({
          id: `tag-${tagName}`,
          title: tagName,
          type: 'tag',
          tags: [],
          tagName: tagName,
          relatedFileCount: relatedFiles.length,
          connectionCount: relatedFiles.length,
          importance: Math.min(1 + relatedFiles.length * 0.3, 5),
          radius: Math.max(25, Math.min(25 + relatedFiles.length * 2, 50)),
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        })
      })
    }

    // Create file nodes with initial properties
    sourceFiles.forEach((file) => {
      let fileX, fileY
      
      if (isSearching && searchedTags && searchedTags.length > 0) {
        // In tag-centered mode: position files radially around their primary tag
        const fileTagNames = (file.tags || []).map(t => (typeof t === 'string' ? t : t.name))
        const primaryTag = fileTagNames.find(tag => searchedTags.includes(tag))
        if (primaryTag) {
          const tagNode = newNodes.find(n => n.id === `tag-${primaryTag}`)
          
          if (tagNode && tagNode.x !== undefined && tagNode.y !== undefined) {
            // Position files in a circle around their tag
            const filesForTag = sourceFiles.filter(f => {
              const names = (f.tags || []).map(t => (typeof t === 'string' ? t : t.name))
              return names.includes(primaryTag)
            })
            const fileIndex = filesForTag.indexOf(file)
            const fileAngle = (fileIndex * 2 * Math.PI) / filesForTag.length
            const fileRadius = 120 + Math.random() * 80 // Add some randomness
            
            fileX = tagNode.x + Math.cos(fileAngle) * fileRadius
            fileY = tagNode.y + Math.sin(fileAngle) * fileRadius
          } else {
            // Fallback positioning
            fileX = dimensions.width / 2 + (Math.random() - 0.5) * 300
            fileY = dimensions.height / 2 + (Math.random() - 0.5) * 300
          }
        } else {
          // File doesn't have searched tags (shouldn't happen with proper filtering)
          fileX = dimensions.width / 2 + (Math.random() - 0.5) * 200
          fileY = dimensions.height / 2 + (Math.random() - 0.5) * 200
        }
      } else {
        // Normal mode: random positioning
        fileX = dimensions.width / 2 + (Math.random() - 0.5) * 200
        fileY = dimensions.height / 2 + (Math.random() - 0.5) * 200
      }
      
      newNodes.push({
        id: file.id,
        title: file.title || file.filename || 'Untitled',
        type: 'file',
        tags: (file.tags || []).map(t => (typeof t === 'string' ? t : t.name)),
        folderId: file.folder_id,
        folderName: file.folder_name,
        fileType: file.file_type,
        connectionCount: 0,
        importance: 1,
        radius: 8, // Base radius for files
        x: fileX,
        y: fileY
      })
    })

    // Create tag-file links when in search mode
    if (isSearching && searchedTags && searchedTags.length > 0) {
      sourceFiles.forEach(file => {
        const fileTags = (file.tags || []).map(t => (typeof t === 'string' ? t : t.name))
        fileTags.forEach(tag => {
          if (searchedTags.includes(tag)) {
            newLinks.push({
              source: `tag-${tag}`,
              target: file.id,
              type: 'tag-file',
              strength: 0.8
            })
          }
        })
      })
    }

    // Create file-file links based on shared tags
    for (let i = 0; i < sourceFiles.length; i++) {
      for (let j = i + 1; j < sourceFiles.length; j++) {
        const fileA = sourceFiles[i]
        const fileB = sourceFiles[j]
        const tagsA = (fileA.tags || []).map(t => (typeof t === 'string' ? t : t.name))
        const tagsB = (fileB.tags || []).map(t => (typeof t === 'string' ? t : t.name))
        const sharedTags = tagsA.filter(tag => tagsB.includes(tag))
        
        if (sharedTags.length > 0) {
          // In search mode, reduce file-file connections to emphasize tag-file relationships
          const linkStrength = isSearching ? Math.min(sharedTags.length * 0.1, 0.3) : Math.min(sharedTags.length * 0.2, 0.8)
          newLinks.push({
            source: fileA.id,
            target: fileB.id,
            type: 'file-file',
            sharedTags,
            strength: linkStrength
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
      if (node.type === 'tag') {
        // Tag nodes: base 20, scale with related file count
        node.radius = Math.max(20, Math.min(20 + (node.relatedFileCount || 0) * 2, 40))
      } else {
        // Files: base 8, scale with connections (Obsidian-style)
        node.radius = Math.max(8, Math.min(8 + connections * 2, 20))
      }
    })

    setNodes(newNodes)
    setLinks(newLinks)
    
    // Initialize D3 simulation
    initializeSimulation(newNodes, newLinks)
  }, [files, folders, dimensions, searchResults, isSearching, searchedTags])

  // Rebuild the graph any time underlying data, search state, or dimensions change
  useEffect(() => {
    // Create signature of current parameters
    const currentParams = JSON.stringify({
      filesCount: files.length,
      foldersCount: folders.length,
      dimensions: dimensions,
      searchResultsCount: searchResults?.length || 0,
      isSearching,
      searchedTags: searchedTags?.sort(),
      loading
    })
    
    // Only regenerate if parameters actually changed and we have data
    if (currentParams !== lastGenParamsRef.current) {
      const hasData = files.length > 0 || (isSearching && searchResults && searchResults.length > 0)
      if (hasData && !loading) {
        lastGenParamsRef.current = currentParams
        generateGraph()
      }
    }
  }, [files, folders, dimensions, searchResults, isSearching, searchedTags, loading])

  const initializeSimulation = (nodes: GraphNode[], links: GraphLink[]) => {
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
          
        if (d.type === 'tag-file') return 60 + (source?.radius || 0) + (target?.radius || 0)
          if (d.type === 'file-file') {
            // Shorter distances for highly connected nodes (Obsidian behavior)
            const avgImportance = ((source?.importance || 1) + (target?.importance || 1)) / 2
            return Math.max(30, 80 - avgImportance * 10)
          }
          return 80
        })
        .strength(d => {
          // Weaker links for better stability (Obsidian-style)
          if (d.type === 'tag-file') return 0.8
          return Math.min(d.strength || 0.3, 0.5)
        })
      )
      .force('charge', d3.forceManyBody()
        .strength((d: any) => {
          // Obsidian-style repulsion based on node importance
          const node = d as GraphNode
          const baseStrength = node.type === 'tag' ? -800 : -200
          return baseStrength * node.importance
        })
        .distanceMax(300) // Limit repulsion range for performance
      )
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
        .strength(0.1) // Weak center force for natural clustering
      )
      .force('collision', d3.forceCollide()
        .radius((d: any) => (d as GraphNode).radius + 5) // Use dynamic radius with padding
        .strength(0.8)
      )

    // Add tag-centered forces when in search mode
    if (isSearching && searchedTags && searchedTags.length > 0) {
      // Tag attraction force - files are attracted to their tags
      simulation.force('tagAttraction', () => {
        nodes.forEach(node => {
          if (node.type === 'file' && node.tags && node.tags.length > 0) {
            node.tags.forEach(tag => {
              if (searchedTags.includes(tag)) {
                const tagNode = nodes.find(n => n.id === `tag-${tag}`)
                if (tagNode && tagNode.x !== undefined && tagNode.y !== undefined && 
                    node.x !== undefined && node.y !== undefined) {
                  const dx = tagNode.x - node.x
                  const dy = tagNode.y - node.y
                  const distance = Math.sqrt(dx * dx + dy * dy)
                  const desiredDistance = tagNode.radius + node.radius + 80
                  
                  if (distance > desiredDistance) {
                    const force = 0.03 * (distance - desiredDistance) / distance
                    if (node.vx !== undefined) node.vx += dx * force
                    if (node.vy !== undefined) node.vy += dy * force
                  }
                }
              }
            })
          }
        })
      })
      
      // Tag repulsion force - keep tags spread apart
      simulation.force('tagRepulsion', () => {
        const tagNodes = nodes.filter(n => n.type === 'tag')
        tagNodes.forEach(tagA => {
          tagNodes.forEach(tagB => {
            if (tagA !== tagB && tagA.x !== undefined && tagA.y !== undefined &&
                tagB.x !== undefined && tagB.y !== undefined) {
              const dx = tagA.x - tagB.x
              const dy = tagA.y - tagB.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              const minDistance = tagA.radius + tagB.radius + 150
              
              if (distance < minDistance && distance > 0) {
                const force = 0.05 * (minDistance - distance) / distance
                if (tagA.vx !== undefined) tagA.vx += dx * force
                if (tagA.vy !== undefined) tagA.vy += dy * force
              }
            }
          })
        })
      })
      
      // Central positioning force for tags
      simulation.force('tagCenter', () => {
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2
        nodes.forEach(node => {
          if (node.type === 'tag' && node.x !== undefined && node.y !== undefined) {
            const dx = centerX - node.x
            const dy = centerY - node.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > 120) { // Allow some spread but keep near center
              const force = 0.01
              if (node.vx !== undefined) node.vx += dx * force
              if (node.vy !== undefined) node.vy += dy * force
            }
          }
        })
      })
    }

    // Obsidian-style simulation parameters
    simulation
      .alpha(1) // Start with high energy
      .alphaDecay(0.02) // Slow decay for smooth settling
      .alphaMin(0.001) // Very low minimum for stability
      .velocityDecay(0.4) // Moderate friction

    simulationRef.current = simulation

    // Set up zoom behavior with level-of-detail
    const svg = d3.select(svgRef.current)

    // Ensure we start from the persisted pan/zoom on first render
    if (transformRef.current === d3.zoomIdentity) {
      transformRef.current = d3.zoomIdentity
        .translate(initialPanPosition.x, initialPanPosition.y)
        .scale(initialZoom)
    }

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        transformRef.current = event.transform
        // Update zoom level through callback if provided
        if (onZoomChange) {
          onZoomChange(event.transform.k)
        }
        
        // Update pan position through callback if provided
        if (onPanPositionChange) {
          onPanPositionChange({ x: event.transform.x, y: event.transform.y })
        }
        
        svg.select('.graph-content')
          .attr('transform', event.transform.toString())
        
        // Update visibility based on zoom level (Obsidian-style)
        svg.selectAll('.node-label')
          .style('opacity', event.transform.k >= labelVisibilityThreshold ? 1 : 0)
        
        svg.selectAll('.connection-indicator')
          .style('opacity', event.transform.k >= detailVisibilityThreshold ? 1 : 0)
        
        // Simplify links at low zoom
        if (event.transform.k >= 0.3) {
          svg.selectAll('.graph-link')
            .style('opacity', (d: any) => {
              if (!d || !d.type) return 0.4
              return d.type === 'tag-file' ? 0.6 : 0.4
            })
        } else {
          svg.selectAll('.graph-link')
            .style('opacity', 0.2)
        }
      })

    zoomBehaviorRef.current = zoomBehavior
    svg.call(zoomBehavior)
    // Apply the current transform using the *same* zoom behavior, so buttons don't "queue" changes
    svg.call(zoomBehavior.transform as any, transformRef.current)

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
      // Hide rebuilding overlay shortly after simulation settles to avoid flicker
      setTimeout(() => setGraphRebuilding(false), 120)
    })

  }

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = d3.select(svgRef.current)
    svg
      .transition()
      .duration(120)
      .call(zoomBehaviorRef.current.scaleBy as any, 1.2)
  }

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = d3.select(svgRef.current)
    svg
      .transition()
      .duration(120)
      .call(zoomBehaviorRef.current.scaleBy as any, 0.8)
  }

  const handleNodeClick = (node: GraphNode) => {
    if (node.type === 'file') {
      const file = files.find(f => f.id === node.id)
      if (file) {
        // Update selected node state if callback provided
        if (onSelectedNodeChange) {
          onSelectedNodeChange(node.id)
        }
        onFileSelect(file)
      }
    } else if (node.type === 'tag') {
      // Update selected node state for tags too
      if (onSelectedNodeChange) {
        onSelectedNodeChange(node.id)
      }
      // For tag nodes, we could implement tag filtering or expansion
      console.log(`Clicked on tag: ${node.tagName}`)
    }
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

  // Drag handlers - commented out for now as they're not currently used
  // const handleNodeDragStart = (event: any, node: GraphNode) => {
  //   if (!simulationRef.current) return
  //   if (!event.active) simulationRef.current.alphaTarget(0.3).restart()
  //   node.fx = node.x
  //   node.fy = node.y
  //   setDraggedNode(node)
  // }

  // const handleNodeDrag = (event: any, node: GraphNode) => {
  //   node.fx = event.x
  //   node.fy = event.y
  // }

  // const handleNodeDragEnd = (event: any, node: GraphNode) => {
  //   if (!simulationRef.current) return
  //   if (!event.active) simulationRef.current.alphaTarget(0)
  //   node.fx = null
  //   node.fy = null
  //   setDraggedNode(null)
  // }

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [])

  if (!canAccessPremiumFeatures) {
    return (
      <PremiumLock
        feature="Map View"
        description="Visualize your notes and documents as an interactive knowledge graph with connections and relationships."
      />
    )
  }

  if (loading) {
    return (
      <div className="graph-view-loading">
        <div className="loading-spinner"></div>
        <p>Loading knowledge graph...</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="graph-view-empty">
        <div className="empty-graph-icon">⚡</div>
        <h3>No knowledge graph yet</h3>
        <p>Upload content with tags to see connections between your documents.</p>
      </div>
    )
  }

  if (isSearching && (!searchResults || searchResults.length === 0)) {
    return (
      <div className="graph-view-empty">
        <div className="empty-graph-icon">🔍</div>
        <h3>No results found</h3>
        <p>No files match the selected tags. Try different tags or remove some filters.</p>
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
      </div>

      <div className="graph-container">
        {/* Non-blocking overlay while rebuilding */}
        {graphRebuilding && (
          <div className="graph-rebuilding-overlay">
            <div className="graph-rebuilding-box">
              <div className="loading-spinner" />
              <span>Rebuilding graph…</span>
            </div>
          </div>
        )}

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
            <radialGradient id="tagGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#f3e8ff" stopOpacity="1" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="tagGradientHighlighted" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="30%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="tagGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <g className="graph-content" style={{ opacity: graphRebuilding ? 0.5 : 1, transition: 'opacity 200ms ease' }}>
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

              // Enhanced link styling for tag-centered mode
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id
              const targetId = typeof link.target === 'string' ? link.target : link.target.id
              const isHighlighted = hoveredNode && (connectedNodes.has(sourceId) && connectedNodes.has(targetId))
              const isDimmed = hoveredNode && !isHighlighted
              const isTagLink = link.type === 'tag-file'
              
              const linkColor = isHighlighted ? '#3b82f6' : 
                              isTagLink ? '#8b5cf6' : '#e5e7eb'
              const linkWidth = isHighlighted ? 3 : 
                              isTagLink ? 2.5 : 
                              link.sharedTags ? Math.min(1 + link.sharedTags.length * 0.3, 2) : 1
              const linkOpacity = isDimmed ? 0.1 : 
                                 isHighlighted ? 0.9 : 
                                 isTagLink ? 0.8 : 0.4

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
              const isTag = node.type === 'tag'
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
                  {isTag ? (
                    // Tag node - diamond shape centered at (0,0) with enhanced styling
                    <>
                      <polygon
                        points={`0,${-nodeRadius} ${nodeRadius},0 0,${nodeRadius} ${-nodeRadius},0`}
                        fill={isHighlighted ? 'url(#tagGradientHighlighted)' : 'url(#tagGradient)'}
                        stroke={colors.stroke}
                        strokeWidth={isSelected || isHighlighted ? 3 : 2}
                        className="graph-node tag-node"
                        filter={isSelected || isHighlighted ? 'url(#tagGlow)' : 'url(#glow)'}
                      />
                      {/* Inner diamond for depth effect */}
                      <polygon
                        points={`0,${-nodeRadius * 0.6} ${nodeRadius * 0.6},0 0,${nodeRadius * 0.6} ${-nodeRadius * 0.6},0`}
                        fill="rgba(255, 255, 255, 0.3)"
                        stroke="none"
                        className="tag-node-inner"
                      />
                    </>
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
                    isTag ? (
                      <text
                        x={0}
                        y={6}
                        textAnchor="middle"
                        style={{ 
                          fontSize: `${Math.min(nodeRadius * 0.6, 16)}px`, 
                          fill: '#ffffff', 
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          pointerEvents: 'none'
                        }}
                      >
                        #
                      </text>
                    ) : (
                      <g transform={`translate(-6,-6)`} style={{ pointerEvents: 'none' }}>
                        <FileText size={12} color="#374151" />
                      </g>
                    )
                  )}
                  
                  {/* Node label with level-of-detail visibility */}
                  <text
                    x={0}
                    y={nodeRadius + (isTag ? 20 : 15)}
                    textAnchor="middle"
                    className={`node-label ${isTag ? 'tag-label' : 'file-label'}`}
                    style={{ 
                      cursor: 'pointer',
                      opacity: currentZoom >= (isTag ? 0.3 : labelVisibilityThreshold) ? 1 : 0,
                      transition: 'opacity 0.15s ease-out',
                      fontSize: isTag ? '0.8rem' : '0.6875rem',
                      fontWeight: isTag ? '600' : '400',
                      fill: isTag ? '#7c3aed' : 'var(--text-secondary)'
                    }}
                  >
                    {isTag ? node.title : (node.title.length > 12 ? `${node.title.substring(0, 12)}...` : node.title)}
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