import React from 'react'
import { MessageCircle, Bot } from 'lucide-react'
import './LeftSidebar.css'

export const LeftSidebar: React.FC = () => {
  return (
    <aside className="left-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Bot className="sidebar-icon" />
          <span>AI Assistant</span>
        </div>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          <div className="welcome-message">
            <MessageCircle className="message-icon" />
            <p>Hello! I'm your AI assistant. Upload or record some content and I'll help you explore it.</p>
          </div>
        </div>
        
        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Ask me about your content..."
            className="chat-input"
            disabled
          />
        </div>
      </div>
    </aside>
  )
}