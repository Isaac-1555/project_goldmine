import React, { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import './NoteTaking.css'

interface NoteTakingProps {
  initialContent?: string
  onChange?: (content: string) => void
  placeholder?: string
}

export const NoteTaking: React.FC<NoteTakingProps> = ({ 
  initialContent = '', 
  onChange, 
  placeholder = 'Start typing your notes...' 
}) => {
  const [content, setContent] = useState(initialContent)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && initialContent !== content) {
      editorRef.current.innerHTML = initialContent
      setContent(initialContent)
    }
  }, [initialContent])

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      setContent(newContent)
      onChange?.(newContent)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle common keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          execCommand('bold')
          break
        case 'i':
          e.preventDefault()
          execCommand('italic')
          break
        case 'u':
          e.preventDefault()
          execCommand('underline')
          break
      }
    }
  }

  return (
    <div className="note-taking">
      <div className="note-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('insertUnorderedList')}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('insertOrderedList')}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('justifyLeft')}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('justifyCenter')}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => execCommand('justifyRight')}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        className="note-editor"
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
    </div>
  )
}