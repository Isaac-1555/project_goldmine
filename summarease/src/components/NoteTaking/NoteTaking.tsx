import React, { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { AppTooltip } from '../ui/AppTooltip'
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
  const isInitializedRef = useRef<boolean>(false)

  console.log('NoteTaking render - initialContent:', initialContent, 'current content:', content) // Debug log

  // Initialize content on mount and update only when necessary
  useEffect(() => {
    if (!isInitializedRef.current && editorRef.current) {
      // First time initialization
      console.log('NoteTaking first initialization with:', initialContent) // Debug log
      editorRef.current.innerHTML = initialContent
      setContent(initialContent)
      isInitializedRef.current = true
    }
  }, [initialContent])

  // Handle external content updates (like restoring from localStorage)
  // Only update if the content is different and we're not currently focused
  useEffect(() => {
    if (isInitializedRef.current && initialContent !== content && editorRef.current) {
      const isEditorFocused = document.activeElement === editorRef.current
      if (!isEditorFocused) {
        console.log('NoteTaking updating content from external source:', initialContent) // Debug log
        editorRef.current.innerHTML = initialContent
        setContent(initialContent)
      }
    }
  }, [initialContent, content])

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
          <AppTooltip content="Bold (Ctrl+B)">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('bold')}
            >
              <Bold size={16} />
            </button>
          </AppTooltip>
          <AppTooltip content="Italic (Ctrl+I)">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('italic')}
            >
              <Italic size={16} />
            </button>
          </AppTooltip>
          <AppTooltip content="Underline (Ctrl+U)">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('underline')}
            >
              <Underline size={16} />
            </button>
          </AppTooltip>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <AppTooltip content="Bullet list">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('insertUnorderedList')}
            >
              <List size={16} />
            </button>
          </AppTooltip>
          <AppTooltip content="Numbered list">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('insertOrderedList')}
            >
              <ListOrdered size={16} />
            </button>
          </AppTooltip>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <AppTooltip content="Align left">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('justifyLeft')}
            >
              <AlignLeft size={16} />
            </button>
          </AppTooltip>
          <AppTooltip content="Align center">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('justifyCenter')}
            >
              <AlignCenter size={16} />
            </button>
          </AppTooltip>
          <AppTooltip content="Align right">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => execCommand('justifyRight')}
            >
              <AlignRight size={16} />
            </button>
          </AppTooltip>
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