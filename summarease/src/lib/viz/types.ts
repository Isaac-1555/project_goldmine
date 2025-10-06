// Visualization core types

export type FieldType = 'quantitative' | 'temporal' | 'categorical';
export type FieldRole = 'x' | 'y' | 'size' | 'color' | 'series' | 'theta' | 'radius';

export interface FieldDef {
  name: string;
  type: FieldType;
  role?: FieldRole;
  unit?: string;
}

export type VisualizationShape =
  | 'time_series'
  | 'ranking'
  | 'part_to_whole'
  | 'correlation'
  | 'distribution'
  | 'hierarchy'
  | 'timeline'
  | 'tiers';

export interface VisualizationCandidate {
  title?: string;
  subtitle?: string;
  shape: VisualizationShape;
  fields: FieldDef[];
  rows: Record<string, any>[];
  confidence: number; // 0..1
}

export interface ChartSpec {
  id: string; // uuid
  summaryId: string; // supabase summaries.id or synthetic id for local notebooks
  recommendedType: string;
  chosenType: string;
  vegaLiteSpec: any; // JSON object
  dataset: { columns: string[]; rows: Record<string, any>[] };
  theme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartSuggestion {
  key: string; // unique key/type id
  label: string;
  spec: any; // Vega-Lite spec
}