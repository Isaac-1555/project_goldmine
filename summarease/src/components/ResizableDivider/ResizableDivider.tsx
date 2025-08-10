import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GripVertical } from 'lucide-react'
import './ResizableDivider.css'

interface ResizableDividerProps {
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  initialLeftWidth?: number // percentage (0-100)
  minLeftWidth?: number // percentage
  maxLeftWidth?: number // percentage
  onResize?: (leftWidth: number) => void
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  leftContent,
  rightContent,
  initialLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  onResize
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth)
    setLeftWidth(clampedWidth)
    onResize?.(clampedWidth)
  }, [isDragging, minLeftWidth, maxLeftWidth, onResize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className="resizable-container">
      <div 
        className="resizable-left"
        style={{ width: `${leftWidth}%` }}
      >
        {leftContent}
      </div>
      
      <div 
        className={`resizable-divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="divider-handle">
          <GripVertical size={16} />
        </div>
      </div>
      
      <div 
        className="resizable-right"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightContent}
      </div>
    </div>
  )
}