import React, { useEffect } from 'react'
import { List, Network } from 'lucide-react'
import { ListView } from './view/ListView'
import { GraphView } from './view/GraphView'
import { TagSearchBar } from '../../TagSearch/TagSearchBar'
import { type FileWithMetadata } from '../../../lib/api'
import { useViewState } from '../../../hooks/useViewState'
import './ViewTab.css'

interface ViewTabProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  onEditLocalNotebook?: (localNotebook: any) => void
}

export const ViewTab: React.FC<ViewTabProps> = ({ onFileSelect, selectedFileId, onEditLocalNotebook }) => {
  // Use the new useViewState hook instead of individual useState calls
  const [viewState, viewActions] = useViewState()
  
  // Get current state values from the centralized state
  const {
    activeSubTab,
    searchResults,
    isSearching,
    searchedTags,
    listView,
    graphView
  } = viewState
  
  // Extract actions from the hook
  const {
    setActiveSubTab,
    setSearchResults,
    setIsSearching,
    setSearchedTags,
  } = viewActions
  
  // Initialize with last active tab from preferences if available
  useEffect(() => {
    if (viewState.preferences.lastActiveSubTab) {
      setActiveSubTab(viewState.preferences.lastActiveSubTab)
    }
  }, [])
  const handleSearchResults = (results: FileWithMetadata[]) => {
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
              aria-label="Switch to List View"
            >
              <List className="subtab-icon" />
              List View
            </button>
            <button
              className={`subtab-button premium-subtab ${activeSubTab === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('graph')}
              aria-label="Switch to Graph View (Premium)"
            >
              <Network className="subtab-icon" />
              Map View
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
            onEditLocalNotebook={onEditLocalNotebook}
            searchResults={isSearching ? searchResults : undefined}
            isSearching={isSearching}
            // Pass list view state from our centralized state
            selectedFolderFilter={listView.selectedFolderFilter}
            onFolderFilterChange={viewActions.setSelectedFolderFilter}
            editingFolder={listView.editingFolder}
            onEditingFolderChange={viewActions.setEditingFolder}
            newFolderName={listView.newFolderName}
            onNewFolderNameChange={viewActions.setNewFolderName}
            showMoveModal={listView.showMoveModal}
            onShowMoveModalChange={viewActions.setShowMoveModal}
            selectedTargetFolder={listView.selectedTargetFolder}
            onSelectedTargetFolderChange={viewActions.setSelectedTargetFolder}
            showTags={listView.showTags}
            onShowTagsChange={viewActions.setShowTags}
            scrollPosition={listView.scrollPosition}
            onScrollPositionChange={viewActions.updateScrollPosition}
            sidebarCollapsed={listView.sidebarCollapsed}
            onSidebarCollapsedChange={viewActions.setSidebarCollapsed}
            bulkSelectMode={listView.bulkSelectMode}
            onBulkSelectModeChange={viewActions.setBulkSelectMode}
            bulkSelectedFileIds={listView.bulkSelectedFileIds}
            onBulkSelectedFileIdsChange={viewActions.setBulkSelectedFileIds}
            showBulkMoveModal={listView.showBulkMoveModal}
            onShowBulkMoveModalChange={viewActions.setShowBulkMoveModal}
            bulkSelectedTargetFolder={listView.bulkSelectedTargetFolder}
            onBulkSelectedTargetFolderChange={viewActions.setBulkSelectedTargetFolder}
          />
        ) : (
          <GraphView 
            onFileSelect={onFileSelect} 
            selectedFileId={selectedFileId}
            searchResults={isSearching ? searchResults : undefined}
            isSearching={isSearching}
            searchedTags={searchedTags}
            // Pass graph view state from our centralized state
            initialZoom={graphView.zoomLevel}
            onZoomChange={viewActions.setZoomLevel}
            initialPanPosition={graphView.panPosition}
            onPanPositionChange={viewActions.setPanPosition}
            hoveredNodeId={graphView.hoveredNodeId}
            onHoveredNodeChange={viewActions.setHoveredNodeId}
            onSelectedNodeChange={viewActions.setSelectedNodeId}
          />
        )}
      </div>
    </div>
  )
}
