import React, { useState } from 'react'
import { List, Network } from 'lucide-react'
import { ListView } from './view/ListView'
import { GraphView } from './view/GraphView'
import { type FileWithMetadata } from '../../../lib/api'
import './ViewTab.css'

interface ViewTabProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  onEditFile?: (fileId: string) => void
}

export const ViewTab: React.FC<ViewTabProps> = ({ onFileSelect, selectedFileId, onEditFile }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'graph'>('list')

  return (
    <div className="view-tab">
      <div className="view-header">
        <h2>Your Content</h2>
        <div className="view-subtabs">
          <button
            className={`subtab-button ${activeSubTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('list')}
          >
            <List className="subtab-icon" />
            List View
          </button>
          <button
            className={`subtab-button ${activeSubTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('graph')}
          >
            <Network className="subtab-icon" />
            Graph View
          </button>
        </div>
      </div>

      <div className="view-content">
        {activeSubTab === 'list' ? (
          <ListView onFileSelect={onFileSelect} selectedFileId={selectedFileId} onEditFile={onEditFile} />
        ) : (
          <GraphView onFileSelect={onFileSelect} selectedFileId={selectedFileId} />
        )}
      </div>
    </div>
  )
}
