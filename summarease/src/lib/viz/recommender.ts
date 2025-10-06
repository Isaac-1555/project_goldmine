import { extractVisualizationCandidates } from './extractor'
import { specsForCandidate } from './vegaTemplates'
import type { ChartSuggestion } from './types'

export function recommendChartsForSummary(text: string): ChartSuggestion[] {
  const cands = extractVisualizationCandidates(text)
  if (cands.length === 0) return []
  return specsForCandidate(cands[0])
}
