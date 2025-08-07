import React, { useState, useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { getUserFiles, type FileWithMetadata } from '../../../../lib/api'
import './GraphView.css'

interface GraphViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
}

interface Node {
  id: string
  title: string
  x: number
  y: number
  tags: string[]
}

interface Edge {
  from: string
  to: string
  sharedTags: string[]
}

export const GraphView: React.FC<GraphViewProps> = ({ onFileSelect, selectedFileId }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    loadFiles()
  }, [])

  useEffect(() => {
    if (files.length > 0) {
      generateGraph()
    }
  }, [files])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const filesData = await getUserFiles()
      setFiles(filesData)
    } catch (err) {
      console.error('Error loading files:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateGraph = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create nodes
    files.forEach((file, index) => {
      const angle = (index / files.length) * 2 * Math.PI
      const radius = Math.min(200, files.length * 30)
      newNodes.push({
        id: file.id,
        title: file.title || file.filename,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        tags: file.tags || []
      })
    })

    // Create edges based on shared tags
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const nodeA = newNodes[i]
        const nodeB = newNodes[j]
        const sharedTags = nodeA.tags.filter(tag => nodeB.tags.includes(tag))
        
        if (sharedTags.length > 0) {
          newEdges.push({
            from: nodeA.id,
            to: nodeB.id,
            sharedTags
          })
        }
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)

    // Auto-fit the graph
    if (newNodes.length > 0) {
      autoFit()
    }
  }

  const autoFit = () => {
    if (nodes.length === 0) return

    const padding = 100
    const minX = Math.min(...nodes.map(n => n.x)) - padding
    const maxX = Math.max(...nodes.map(n => n.x)) + padding
    const minY = Math.min(...nodes.map(n => n.y)) - padding
    const maxY = Math.max(...nodes.map(n => n.y)) + padding

    const graphWidth = maxX - minX
    const graphHeight = maxY - minY
    const containerWidth = 800 // Approximate container width
    const containerHeight = 600 // Approximate container height

    const scaleX = containerWidth / graphWidth
    const scaleY = containerHeight / graphHeight
    const newZoom = Math.min(scaleX, scaleY, 2) // Max zoom of 2

    setZoom(newZoom)
    setPan({
      x: -(minX + maxX) / 2,
      y: -(minY + maxY) / 2
    })
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1))
  }

  const handleReset = () => {
    autoFit()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleNodeClick = (nodeId: string) => {
    const file = files.find(f => f.id === nodeId)
    if (file) {
      onFileSelect(file)
    }
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
        <div className="empty-graph-icon">🕸️</div>
        <h3>No knowledge graph yet</h3>
        <p>Upload content with tags to see connections between your documents.</p>
      </div>
    )
  }

  return (
    <div className="graph-view">
      <div className="graph-controls">
        <button className="graph-control-btn" onClick={handleZoomIn}>
          <ZoomIn />
        </button>
        <button className="graph-control-btn" onClick={handleZoomOut}>
          <ZoomOut />
        </button>
        <button className="graph-control-btn" onClick={handleReset}>
          <RotateCcw />
        </button>
      </div>

      <div className="graph-container">
        <svg
          ref={svgRef}
          className="graph-svg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(400, 300) scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
            {/* Render edges */}
            {edges.map((edge, index) => {
              const fromNode = nodes.find(n => n.id === edge.from)
              const toNode = nodes.find(n => n.id === edge.to)
              if (!fromNode || !toNode) return null

              return (
                <line
                  key={index}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#e5e7eb"
                  strokeWidth={Math.min(edge.sharedTags.length * 2, 6)}
                  opacity={0.6}
                />
              )
            })}

            {/* Render nodes */}
            {nodes.map((node) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={20}
                  fill={selectedFileId === node.id ? "#3b82f6" : "#f3f4f6"}
                  stroke={selectedFileId === node.id ? "#1d4ed8" : "#d1d5db"}
                  strokeWidth={2}
                  className="graph-node"
                  onClick={() => handleNodeClick(node.id)}
                />
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  className="node-label"
                  onClick={() => handleNodeClick(node.id)}
                >
                  {node.title.length > 15 ? `${node.title.substring(0, 15)}...` : node.title}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}