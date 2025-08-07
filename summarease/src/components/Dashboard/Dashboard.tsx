import React, { useState } from 'react'
import { Layout } from '../Layout/Layout'
import { DashboardContent } from './DashboardContent'
import { ContentViewer } from '../ContentViewer/ContentViewer'
import { type FileWithMetadata } from '../../lib/api'

export const Dashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)

  const handleFileSelect = (file: FileWithMetadata) => {
    setSelectedFile(file)
  }

  return (
    <Layout onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id}>
      {selectedFile ? (
        <ContentViewer file={selectedFile} />
      ) : (
        <DashboardContent />
      )}
    </Layout>
  )
}