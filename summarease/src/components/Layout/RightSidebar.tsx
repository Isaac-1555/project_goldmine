import React from 'react'
import { FileList } from '../FileList/FileList'
import { type FileWithMetadata } from '../../lib/api'
import './RightSidebar.css'

interface RightSidebarProps {
  onFileSelect?: (file: FileWithMetadata) => void
  selectedFileId?: string
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ onFileSelect, selectedFileId }) => {
  return (
    <aside className="right-sidebar">
      <FileList onFileSelect={onFileSelect} selectedFileId={selectedFileId} />
    </aside>
  )
}