import type { VisualizationCandidate, FieldDef } from './types'

// Heuristic extraction of chartable data from free-form summary text.
// Conservative: only emit datasets when numeric evidence is clear.
export function extractVisualizationCandidates(text: string): VisualizationCandidate[] {
  const fromInfographic = extractFromInfographicBlocks(text)
  if (fromInfographic.length) return fromInfographic
  const candidates: VisualizationCandidate[] = []
  if (!text || !text.trim()) return candidates

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)

  // 1) Detect simple category:value lists like "Label: 12" or "Label (34%)"
  const listRows: { category: string; value: number; unit?: string }[] = []
  for (const line of lines) {
    // - bullets and plain lines
    const m1 = line.match(/^[-•*]?\s*([^:()]+?)\s*[:\-–]\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*(%|[a-zA-Z]+)?\s*$/)
    const m2 = line.match(/^[-•*]?\s*([^:()]+?)\s*\((\d+(?:\.\d+)?)%\)\s*$/)
    if (m1) {
      const [, label, num, unit] = m1
      const value = Number(num)
      if (!Number.isNaN(value) && label.trim().length <= 80) {
        listRows.push({ category: sanitizeLabel(label), value, unit: unit === '%' ? '%' : unit })
      }
      continue
    }
    if (m2) {
      const [, label, pct] = m2
      const value = Number(pct)
      if (!Number.isNaN(value)) listRows.push({ category: sanitizeLabel(label), value, unit: '%' })
      continue
    }
  }
  if (listRows.length >= 3) {
    const fields: FieldDef[] = [
      { name: 'category', type: 'categorical', role: 'x' },
      { name: 'value', type: 'quantitative', role: 'y' }
    ]
    candidates.push({
      title: inferTitle(text) || 'Category Breakdown',
      shape: hasPercentUnit(listRows) ? 'part_to_whole' : 'ranking',
      fields,
      rows: listRows,
      confidence: hasPercentUnit(listRows) ? 0.85 : 0.75
    })
  }

  // 2) Detect time series like "2019: 10, 2020: 12, 2021: 15" or lines with year and number
  const timeRows: { date: string; value: number }[] = []
  for (const line of lines) {
    const matches = [...line.matchAll(/(19\d{2}|20\d{2})\s*[:\-–]?\s*([+-]?[0-9]+(?:\.[0-9]+)?)/g)]
    for (const m of matches) {
      const year = m[1]
      const val = Number(m[2])
      if (!Number.isNaN(val)) timeRows.push({ date: `${year}-01-01`, value: val })
    }
  }
  if (timeRows.length >= 3) {
    const fields: FieldDef[] = [
      { name: 'date', type: 'temporal', role: 'x' },
      { name: 'value', type: 'quantitative', role: 'y' }
    ]
    candidates.push({
      title: inferTitle(text) || 'Trend over Time',
      shape: 'time_series',
      fields,
      rows: dedupTimeRows(timeRows),
      confidence: 0.8
    })
  }

  // 3) Detect two-number pairs on one line => correlation scatter chance
  const pairRows: { x: number; y: number; label?: string }[] = []
  for (const line of lines) {
    const pair = line.match(/^[-•*]?\s*([^:]+?)\s*[:\-–]\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*[;,]\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*$/)
    if (pair) {
      const [, label, a, b] = pair
      const x = Number(a), y = Number(b)
      if (!Number.isNaN(x) && !Number.isNaN(y)) pairRows.push({ x, y, label: sanitizeLabel(label) })
    }
  }
  if (pairRows.length >= 8) {
    const fields: FieldDef[] = [
      { name: 'x', type: 'quantitative', role: 'x' },
      { name: 'y', type: 'quantitative', role: 'y' }
    ]
    candidates.push({
      title: inferTitle(text) || 'Correlation',
      shape: 'correlation',
      fields,
      rows: pairRows,
      confidence: 0.65
    })
  }

  // 4) Tiers/hierarchy from bullet levels like "- Level 1", "  - Level 2" if no numbers
  if (candidates.length === 0) {
    const tiers = extractTiers(lines)
    if (tiers.length >= 3) {
      const fields: FieldDef[] = [
        { name: 'tier', type: 'categorical', role: 'y' },
        { name: 'width', type: 'quantitative', role: 'x' }
      ]
      const rows = tiers.map((t, i) => ({ tier: t, width: 100 - i * (70 / Math.max(1, tiers.length - 1)) }))
      candidates.push({
        title: 'Tiers',
        shape: 'tiers',
        fields,
        rows,
        confidence: 0.6
      })
    }
  }

  return candidates
}

function hasPercentUnit(rows: { unit?: string }[]) {
  return rows.some(r => r.unit === '%')
}

function sanitizeLabel(s: string) {
  return s.replace(/^[-•*]\s*/, '').replace(/\s{2,}/g, ' ').trim()
}

function inferTitle(text: string): string | undefined {
  const h = text.match(/^(#{1,3})\s*(.+)$/m)
  if (h) return h[2].trim()
  const firstLine = text.split('\n').map(s => s.trim()).find(Boolean)
  if (firstLine && firstLine.length <= 80) return firstLine
  return undefined
}

function dedupTimeRows(rows: { date: string; value: number }[]) {
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.date, r.value)
  return [...map.entries()].map(([date, value]) => ({ date, value }))
}

function extractTiers(lines: string[]): string[] {
  const tiers: { text: string; indent: number }[] = []
  for (const line of lines) {
    const m = line.match(/^(\s*)([-•*]|\d+\.)\s+(.+)$/)
    if (m) {
      tiers.push({ text: sanitizeLabel(m[3]), indent: m[1].length })
    }
  }
  // Prefer top-level bullets as tiers
  const topLevel = tiers.filter(t => t.indent === Math.min(...tiers.map(t => t.indent)))
  return topLevel.map(t => t.text)
}

// Parse fenced ```infographic blocks for Type: chart with Data
function extractFromInfographicBlocks(text: string): VisualizationCandidate[] {
  const candidates: VisualizationCandidate[] = []
  const blockRegex = /```\s*infographic\n([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = blockRegex.exec(text)) !== null) {
    const body = m[1]
    const typeMatch = body.match(/Type:\s*(.+)/i)
    const type = typeMatch?.[1]?.trim().toLowerCase()
    if (type !== 'chart') continue

    const title = body.match(/Title:\s*(.+)/i)?.[1]?.trim()

    // Try JSON Data: line
    const dataLine = body.match(/Data:\s*([\s\S]*)/i)?.[1] || ''
    let rows: any[] | null = null
    try {
      const jsonMatch = dataLine.match(/\[\s*{[\s\S]*}\s*\]/)
      if (jsonMatch) {
        rows = JSON.parse(jsonMatch[0])
      }
    } catch {
      // ignore
    }

    // Fallback: scan bullet pairs inside the block
    if (!rows) {
      const pairs: { category: string; value: number; unit?: string }[] = []
      const lines = body.split(/\n+/)
      for (const line of lines) {
        const l = line.trim()
        const p1 = l.match(/^[-•*]?\s*([^:()]+?)\s*[:\-–]\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*(%|[a-zA-Z]+)?\s*$/)
        const p2 = l.match(/^[-•*]?\s*([^:()]+?)\s*\((\d+(?:\.\d+)?)%\)\s*$/)
        if (p1) {
          const [, label, num, unit] = p1
          const value = Number(num)
          if (!Number.isNaN(value)) pairs.push({ category: sanitizeLabel(label), value, unit: unit === '%' ? '%' : unit })
        } else if (p2) {
          const [, label, pct] = p2
          const value = Number(pct)
          if (!Number.isNaN(value)) pairs.push({ category: sanitizeLabel(label), value, unit: '%' })
        }
      }
      if (pairs.length >= 3) rows = pairs
    }

    if (rows && rows.length) {
      const hasPct = Array.isArray(rows) && rows.some((r: any) => String(r.unit || '').includes('%'))
      const normalized = rows.map((r: any) => ({
        category: r.category ?? r.name ?? r.label,
        value: Number(r.value ?? r.count ?? r.y ?? r.v)
      })).filter((r: any) => r.category && !Number.isNaN(r.value))

      if (normalized.length >= 3) {
        candidates.push({
          title,
          shape: hasPct ? 'part_to_whole' : 'ranking',
          fields: [
            { name: 'category', type: 'categorical', role: 'x' },
            { name: 'value', type: 'quantitative', role: 'y' }
          ],
          rows: normalized,
          confidence: 0.9
        })
      }
    }
  }
  return candidates
}
