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

// ============================================
// INFOGRAPHIC TYPES (Napkin.ai-style visuals)
// ============================================

export type InfographicType = 
  | 'mindmap'      // Central idea with branching concepts
  | 'cycle'        // Circular flow diagram with arrows
  | 'pyramid'      // Hierarchical levels (base to apex)
  | 'timeline'     // Chronological sequence of events
  | 'comparison'   // Side-by-side feature comparison
  | 'process'      // Sequential steps in a workflow
  | 'hierarchy';   // Tree-like organizational structure

export interface InfographicNode {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  level?: number;        // For hierarchical structures (0=center/top, 1=primary, etc.)
  position?: number;     // For ordered sequences (timeline, process)
  children?: string[];   // IDs of child nodes (for tree structures)
  metadata?: Record<string, any>; // Additional custom data
}

export interface InfographicConnection {
  from: string;
  to: string;
  label?: string;
  type?: 'arrow' | 'line' | 'dotted' | 'dashed';
  bidirectional?: boolean;
  style?: Record<string, any>; // Custom styling
}

export interface InfographicSpec {
  id: string;
  summaryId: string;
  type: InfographicType;
  title: string;
  subtitle?: string;
  nodes: InfographicNode[];
  connections?: InfographicConnection[];
  layout?: {
    width?: number;
    height?: number;
    orientation?: 'horizontal' | 'vertical' | 'radial';
  };
  style?: {
    theme?: 'light' | 'dark' | 'auto';
    colorScheme?: string[];
    fontSize?: number;
  };
  metadata: {
    suggestedBy: 'ai' | 'user';
    confidence: number; // 0..1
    reasoning?: string; // Why this type was chosen
    createdAt: string;
    updatedAt: string;
  };
}

export interface InfographicGenerationResult {
  success: boolean;
  spec?: InfographicSpec;
  error?: string;
  suggestions?: InfographicType[]; // Alternative types that might work
}
