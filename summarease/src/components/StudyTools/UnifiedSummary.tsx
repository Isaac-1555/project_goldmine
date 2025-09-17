import React, { useState, useEffect } from 'react'
import { getUserFiles, getFileDetails, type FileWithMetadata } from '../../lib/api'
import { processAudioTranscript } from '../../lib/audioProcessor'
import { useSettingsConfig } from '../../hooks/useSettingsConfig'
import { Button } from '@radix-ui/themes'

export const UnifiedSummary: React.FC = () => {
  const { getSummaryConfig } = useSettingsConfig()
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getUserFiles().then(setFiles)
  }, [])

  const handleFileToggle = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    )
  }

  const generateSummary = async () => {
    setIsLoading(true)
    setError('')
    setSummary('')

    try {
      let combinedContent = ``
      if (notes.trim()) {
        combinedContent += `User Notes:\n${notes.trim()}\n\n`
      }

      for (const fileId of selectedFiles) {
        const details = await getFileDetails(fileId)
        if (details?.transcript?.content) {
          combinedContent += `Transcript from ${details.file.title}:\n${details.transcript.content}\n\n`
        }
      }

      if (!combinedContent.trim()) {
        setError('Please select at least one file or add some notes.')
        return
      }

      const summaryConfig = getSummaryConfig()
      const result = await processAudioTranscript(combinedContent, summaryConfig)
      setSummary(result.summary)

    } catch (err: any) {
      setError(err.message || 'Failed to generate summary.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="unified-summary-container">
      <h2>Unified Summary Generator</h2>
      <p>Select documents and add notes to generate a combined summary.</p>

      <div className="content-selection">
        <div className="file-selection">
          <h4>Select Files</h4>
          {files.map(file => (
            <div key={file.id}>
              <input 
                type="checkbox" 
                id={file.id} 
                checked={selectedFiles.includes(file.id)} 
                onChange={() => handleFileToggle(file.id)} 
              />
              <label htmlFor={file.id}>{file.title}</label>
            </div>
          ))}
        </div>
        <div className="notes-input">
          <h4>Add Notes</h4>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Add any additional notes or context here..."
          />
        </div>
      </div>

      <Button onClick={generateSummary} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Summary'}
      </Button>

      {error && <div className="error-message">{error}</div>}

      {summary && (
        <div className="summary-output">
          <h4>Generated Summary</h4>
          <p>{summary}</p>
        </div>
      )}
    </div>
  )
}
