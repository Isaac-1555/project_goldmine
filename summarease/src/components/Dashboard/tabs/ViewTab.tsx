import React, { useState } from 'react'
import { List, Network } from 'lucide-react'
import { ListView } from './view/ListView'
import { GraphView } from './view/GraphView'
import { TagSearchBar } from '../../TagSearch/TagSearchBar'
import { type FileWithMetadata } from '../../../lib/api'
import './ViewTab.css'

interface ViewTabProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  onEditFile?: (fileId: string) => void
  onEditLocalNotebook?: (localNotebook: any) => void
}

export const ViewTab: React.FC<ViewTabProps> = ({ onFileSelect, selectedFileId, onEditFile, onEditLocalNotebook }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'graph'>('list')
  const [searchResults, setSearchResults] = useState<FileWithMetadata[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchedTags, setSearchedTags] = useState<string[]>([])

  const handleSearchResults = (results: FileWithMetadata[], resultCount: number) => {
    setSearchResults(results)
  }

  const handleSearchStateChange = (searching: boolean) => {
    setIsSearching(searching)
  }

  const handleSearchTagsChange = (tags: string[]) => {
    setSearchedTags(tags)
  }

  return (
    <div className="view-tab">
      <div className="view-header">
        <div className="view-header-top">
          <h2>Knowledge History</h2>
          
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
        
        <TagSearchBar 
          onResultsChange={handleSearchResults}
          onSearchStateChange={handleSearchStateChange}
          onSearchTagsChange={handleSearchTagsChange}
        />
      </div>

      <div className="view-content">
        {activeSubTab === 'list' ? (
          <ListView 
            onFileSelect={onFileSelect} 
            selectedFileId={selectedFileId} 
            onEditFile={onEditFile} 
            onEditLocalNotebook={onEditLocalNotebook}
            searchResults={isSearching ? searchResults : undefined}
            isSearching={isSearching}
          />
        ) : (
          <GraphView 
            onFileSelect={onFileSelect} 
            selectedFileId={selectedFileId}
            searchResults={isSearching ? searchResults : undefined}
            isSearching={isSearching}
            searchedTags={searchedTags}
          />
        )}
      </div>
    </div>
  )
}
