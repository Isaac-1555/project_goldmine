import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { type FileWithMetadata } from '../../lib/api'
import './AIChatSidebar.css'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface AIChatSidebarProps {
  selectedFile: FileWithMetadata | null
}

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ selectedFile }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Clear messages when file changes
    if (selectedFile) {
      setMessages([
        {
          id: '1',
          type: 'ai',
          content: `I'm now ready to chat about "${selectedFile.title || selectedFile.filename}". Ask me anything about this content!`,
          timestamp: new Date()
        }
      ])
    } else {
      setMessages([])
    }
  }, [selectedFile])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedFile) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I understand you're asking about "${userMessage.content}" in relation to ${selectedFile.title || selectedFile.filename}. This feature is coming soon! I'll be able to provide detailed answers about your content once the AI chat integration is complete.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="ai-chat-sidebar">
      <div className="chat-header">
        <div className="chat-title">
          <Bot className="chat-icon" />
          <span>AI Assistant</span>
        </div>
        {selectedFile && (
          <div className="chat-context">
            Chatting about: {selectedFile.title || selectedFile.filename}
          </div>
        )}
      </div>

      <div className="chat-messages">
        {!selectedFile ? (
          <div className="chat-welcome">
            <Bot className="welcome-icon" />
            <p>Select a summary to start chatting about it.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-welcome">
            <Bot className="welcome-icon" />
            <p>Loading context...</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'user' ? <User /> : <Bot />}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="message-avatar">
                  <Bot />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedFile 
                ? "Ask me about this content..." 
                : "Select content to start chatting..."
            }
            disabled={!selectedFile || isLoading}
            className="chat-input"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !selectedFile || isLoading}
            className="send-button"
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  )
}