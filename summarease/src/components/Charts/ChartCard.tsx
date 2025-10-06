import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { VegaChart } from './VegaChart'

interface ChartCardProps {
  title?: string
  spec: any
  onDownload?: (fmt: 'png' | 'svg') => void
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, spec }) => {
  const [api, setApi] = useState<{ downloadPNG: () => Promise<string>; downloadSVG: () => Promise<string> } | null>(null)

  const handleDownload = async (fmt: 'png' | 'svg') => {
    if (!api) return
    try {
      if (fmt === 'png') {
        const url = await api.downloadPNG()
        triggerDownload(url, `${(title || 'chart').toLowerCase().replace(/\s+/g, '-')}.png`)
      } else {
        const svg = await api.downloadSVG()
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        triggerDownload(url, `${(title || 'chart').toLowerCase().replace(/\s+/g, '-')}.svg`)
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
    } catch (e) {
      console.error('Download failed', e)
    }
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h4 className="chart-title">{title || 'Chart'}</h4>
        <div className="chart-actions">
          <button className="btn btn-soft" onClick={() => handleDownload('png')} title="Download PNG">
            <Download size={16} /> PNG
          </button>
          <button className="btn btn-soft" onClick={() => handleDownload('svg')} title="Download SVG">
            <Download size={16} /> SVG
          </button>
        </div>
      </div>
      <div className="chart-card-body">
        <VegaChart spec={spec} onReady={setApi} />
      </div>
    </div>
  )
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}