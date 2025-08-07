import React from 'react'
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import './StatusIndicator.css'

interface StatusIndicatorProps {
  status: 'processing' | 'completed' | 'failed'
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'medium', 
  showText = true 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className="status-icon spinning" />,
          text: 'Processing...',
          className: 'status-processing'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="status-icon" />,
          text: 'Completed',
          className: 'status-completed'
        }
      case 'failed':
        return {
          icon: <AlertCircle className="status-icon" />,
          text: 'Failed',
          className: 'status-failed'
        }
      default:
        return {
          icon: <Clock className="status-icon" />,
          text: 'Unknown',
          className: 'status-unknown'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`status-indicator ${config.className} size-${size}`}>
      {config.icon}
      {showText && <span className="status-text">{config.text}</span>}
    </div>
  )
}