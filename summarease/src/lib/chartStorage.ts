import type { ChartSpec } from './viz/types'

const LS_KEY = 'sat-brain-chart-specs-v1'

function loadAll(): Record<string, ChartSpec> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, ChartSpec>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function getChartSpec(summaryId: string): ChartSpec | null {
  const map = loadAll()
  return map[summaryId] || null
}

export function saveChartSpec(spec: ChartSpec) {
  const map = loadAll()
  map[spec.summaryId] = spec
  saveAll(map)
}