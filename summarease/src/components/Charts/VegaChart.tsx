import React, { useEffect, useRef } from 'react'
import embed, { type VisualizationSpec, type EmbedOptions } from 'vega-embed'

interface VegaChartProps {
  spec: VisualizationSpec | any
  onReady?: (api: { downloadPNG: () => Promise<string>; downloadSVG: () => Promise<string> }) => void
}

export const VegaChart: React.FC<VegaChartProps> = ({ spec, onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    const opts: EmbedOptions = { actions: false, renderer: 'canvas', theme: undefined }
    const el = containerRef.current
    if (!el) return

    embed(el, spec as any, opts).then((res) => {
      if (cancelled) return
      viewRef.current = res.view
      if (onReady) {
        onReady({
          downloadPNG: async () => res.view.toImageURL('png'),
          downloadSVG: async () => res.view.toSVG()
        })
      }
    })

    return () => { cancelled = true; viewRef.current = null }
  }, [JSON.stringify(spec)])

  return <div className="vega-chart" ref={containerRef} />
}