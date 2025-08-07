import React from 'react'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { MainContent } from './MainContent'
import { type FileWithMetadata } from '../../lib/api'
import './Layout.css'

interface LayoutProps {
  children?: React.ReactNode
  onFileSelect?: (file: FileWithMetadata) => void
  selectedFileId?: string
}

export const Layout: React.FC<LayoutProps> = ({ children, onFileSelect, selectedFileId }) => {
  return (
    <div className="layout">
      <LeftSidebar />
      <MainContent>{children}</MainContent>
      <RightSidebar onFileSelect={onFileSelect} selectedFileId={selectedFileId} />
    </div>
  )
}