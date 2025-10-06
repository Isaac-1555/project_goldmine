import type { VisualizationCandidate, ChartSuggestion } from './types'

export function specsForCandidate(c: VisualizationCandidate): ChartSuggestion[] {
  switch (c.shape) {
    case 'time_series':
      return [
        { key: 'line', label: 'Line', spec: lineSpec(c) },
        { key: 'area', label: 'Area', spec: areaSpec(c) }
      ]
    case 'ranking':
      return [
        { key: 'bar', label: 'Bar', spec: barSpec(c, { horizontal: true }) },
        { key: 'column', label: 'Column', spec: barSpec(c, { horizontal: false }) }
      ]
    case 'part_to_whole':
      return [
        { key: 'donut', label: 'Donut', spec: donutSpec(c) },
        { key: 'stacked_bar', label: 'Stacked', spec: stackedBarSpec(c) }
      ]
    case 'correlation':
      return [
        { key: 'scatter', label: 'Scatter', spec: scatterSpec(c) }
      ]
    case 'distribution':
      return [
        { key: 'histogram', label: 'Histogram', spec: histogramSpec(c) }
      ]
    case 'tiers':
      return [
        { key: 'pyramid', label: 'Pyramid', spec: pyramidSpec(c) }
      ]
    default:
      return []
  }
}

function lineSpec(c: VisualizationCandidate) {
  const x = c.fields.find(f => f.role === 'x')!.name
  const y = c.fields.find(f => f.role === 'y')!.name
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: c.title || 'Time Series',
    data: { values: c.rows },
    mark: { type: 'line', interpolate: 'monotone', point: true },
    encoding: {
      x: { field: x, type: 'temporal', title: null },
      y: { field: y, type: 'quantitative', title: null }
    },
    width: 'container',
    height: 240
  }
}

function areaSpec(c: VisualizationCandidate) {
  const spec: any = lineSpec(c)
  spec.mark = { type: 'area', interpolate: 'monotone' }
  return spec
}

function barSpec(c: VisualizationCandidate, opts: { horizontal: boolean }) {
  const x = c.fields.find(f => f.role === 'x' || f.type === 'categorical')!.name
  const y = c.fields.find(f => f.role === 'y' || f.type === 'quantitative')!.name
  const cat = x
  const val = y
  const base = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: c.title || 'Ranking',
    data: { values: c.rows },
    mark: { type: 'bar', cornerRadius: 4 },
    encoding: {
      x: { field: opts.horizontal ? val : cat, type: opts.horizontal ? 'quantitative' : 'nominal', title: null, sort: opts.horizontal ? undefined : '-y' },
      y: { field: opts.horizontal ? cat : val, type: opts.horizontal ? 'nominal' : 'quantitative', title: null, sort: opts.horizontal ? '-x' : undefined },
      color: { value: '#60a5fa' }
    },
    width: 'container',
    height: Math.min(320, 28 * Math.max(3, c.rows.length))
  } as any
  return base
}

function stackedBarSpec(c: VisualizationCandidate) {
  const cat = c.fields.find(f => f.type === 'categorical')!.name
  const val = c.fields.find(f => f.type === 'quantitative')!.name
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: c.title || 'Part to Whole',
    data: { values: c.rows },
    transform: [
      { calculate: 'datum["' + val + '"]', as: 'value' },
      { calculate: 'datum["' + cat + '"]', as: 'category' }
    ],
    mark: { type: 'bar' },
    encoding: {
      x: { aggregate: 'sum', field: 'value', type: 'quantitative', stack: 'normalize', axis: { format: '%' }, title: null },
      y: { field: 'category', type: 'nominal', title: null },
      color: { field: 'category', type: 'nominal' }
    },
    width: 'container',
    height: Math.min(280, 28 * Math.max(3, c.rows.length))
  }
}

function donutSpec(c: VisualizationCandidate) {
  const cat = c.fields.find(f => f.type === 'categorical')!.name
  const val = c.fields.find(f => f.type === 'quantitative')!.name
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: c.title || 'Part to Whole',
    data: { values: c.rows },
    mark: { type: 'arc', innerRadius: 60, outerRadius: 120, cornerRadius: 4 },
    encoding: {
      theta: { field: val, type: 'quantitative' },
      color: { field: cat, type: 'nominal' },
      tooltip: [ { field: cat, type: 'nominal' }, { field: val, type: 'quantitative' } ]
    },
    view: { stroke: null },
    width: 320,
    height: 260
  }
}

function scatterSpec(c: VisualizationCandidate) {
  const x = c.fields.find(f => f.role === 'x')!.name
  const y = c.fields.find(f => f.role === 'y')!.name
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: c.title || 'Correlation',
    data: { values: c.rows },
    mark: { type: 'point', filled: true, size: 80 },
    encoding: {
      x: { field: x, type: 'quantitative', title: null },
      y: { field: y, type: 'quantitative', title: null },
      color: { value: '#34d399' }
    },
    width: 'container',
    height: 280
  }
}

function histogramSpec(c: VisualizationCandidate) {
  const val = c.fields.find(f => f.type === 'quantitative')!.name
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: c.rows },
    mark: 'bar',
    encoding: {
      x: { bin: true, field: val, type: 'quantitative' },
      y: { aggregate: 'count', type: 'quantitative' }
    },
    width: 'container',
    height: 240
  }
}

// Pyramid-like tiers using horizontal bars with decreasing width and layered separators
function pyramidSpec(c: VisualizationCandidate) {
  const tierField = c.fields.find(f => f.role === 'y' || f.type === 'categorical')!.name
  const widthField = c.fields.find(f => f.role === 'x' || f.type === 'quantitative')!.name
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: c.rows },
    layer: [
      {
        mark: { type: 'bar', cornerRadiusEnd: 6 },
        encoding: {
          x: { field: widthField, type: 'quantitative', title: null, axis: null },
          y: { field: tierField, type: 'nominal', sort: 'descending', title: null },
          color: { field: tierField, type: 'nominal', legend: null }
        }
      },
      {
        mark: { type: 'text', align: 'left', dx: 6, color: '#0f172a' },
        encoding: {
          y: { field: tierField, type: 'nominal', sort: 'descending' },
          text: { field: tierField, type: 'nominal' }
        }
      }
    ],
    width: 'container',
    height: Math.min(320, 40 * Math.max(3, c.rows.length)),
    config: {
      view: { stroke: null }
    }
  }
}