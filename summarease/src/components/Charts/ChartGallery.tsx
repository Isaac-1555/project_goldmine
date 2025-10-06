import React, { useMemo, useState, useEffect } from 'react'
import { specsForCandidate } from '../../lib/viz/vegaTemplates'
import { extractVisualizationCandidates } from '../../lib/viz/extractor'
import { ChartCard } from './ChartCard'
import { getChartSpec, saveChartSpec } from '../../lib/chartStorage'
import type { ChartSpec } from '../../lib/viz/types'
import { getChartSpecForSummary, upsertChartSpecForSummary } from '../../lib/api'
import './Charts.css'

interface ChartGalleryProps {
  summaryId: string
  summaryText: string
}

export const ChartGallery: React.FC<ChartGalleryProps> = ({ summaryId, summaryText }) => {
  const saved = useMemo(() => getChartSpec(summaryId), [summaryId])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    const cands = extractVisualizationCandidates(summaryText)
    if (cands.length === 0) return [] as { key: string; label: string; spec: any; title?: string }[]
    const top = cands[0]
    const specs = specsForCandidate(top)
    if (!selectedKey && specs.length > 0) setSelectedKey(specs[0].key)
    return specs.map(s => ({ ...s, title: top.title }))
  }, [summaryText])

  const chosen = suggestions.find(s => s.key === (selectedKey || suggestions[0]?.key))

  // Try to load persisted selection from Supabase when available
  useEffect(() => {
    let canceled = false
    if (suggestions.length === 0) return
    ;(async () => {
      try {
        const row = await getChartSpecForSummary(summaryId)
        if (!row || canceled) return
        const serverKey = row.chosen_type
        if (serverKey && suggestions.some(s => s.key === serverKey)) {
          setSelectedKey(serverKey)
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => { canceled = true }
  }, [summaryId, suggestions.length])

  const handleSave = async () => {
    if (!chosen) return
    const now = new Date().toISOString()
    const spec: ChartSpec = {
      id: `${summaryId}-${chosen.key}`,
      summaryId,
      recommendedType: suggestions[0]?.key || chosen.key,
      chosenType: chosen.key,
      vegaLiteSpec: chosen.spec,
      dataset: { columns: [], rows: [] },
      theme: 'default',
      createdAt: saved?.createdAt || now,
      updatedAt: now
    }
    // Save locally for immediate UX
    saveChartSpec(spec)
    // Persist to Supabase (safe if table not present)
    await upsertChartSpecForSummary({
      summaryId,
      recommendedType: spec.recommendedType,
      chosenType: spec.chosenType,
      spec: spec.vegaLiteSpec,
      dataset: spec.dataset,
      theme: spec.theme
    })
  }

  if (suggestions.length === 0) {
    return (
      <div className="charts-panel empty">
        <h3 className="panel-title">Charts</h3>
        <div className="no-chartable-data">No chartable data detected. Add numbers or structured bullet points to see charts.</div>
      </div>
    )
  }

  return (
    <div className="charts-panel">
      <div className="panel-header">
        <h3 className="panel-title">Charts</h3>
        <div className="chart-type-switcher">
          {suggestions.map(s => (
            <button
              key={s.key}
              className={`type-btn ${s.key === (selectedKey || suggestions[0].key) ? 'active' : ''}`}
              onClick={() => setSelectedKey(s.key)}
            >
              {s.label}
            </button>
          ))}
          <button className="btn btn-soft" onClick={handleSave} title="Save selection">Save</button>
        </div>
      </div>
      {chosen && (
        <ChartCard title={chosen.title} spec={chosen.spec} />
      )}
    </div>
  )
}