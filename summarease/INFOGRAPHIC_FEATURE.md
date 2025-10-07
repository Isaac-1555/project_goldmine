# 🎨 Napkin.ai-Style Infographic Feature

## Overview

This feature adds automatic infographic generation to SummarEase, transforming summary text into beautiful, interactive visualizations similar to Napkin.ai. Using Google Gemini AI and D3.js, the system analyzes summary content and generates appropriate visual representations.

## ✨ Features

### Supported Infographic Types

1. **Mind Map** ⭐ (Primary Focus)
   - Central concept with branching ideas
   - 3-level hierarchy (center, primary branches, secondary nodes)
   - Color-coded for visual organization
   - Interactive hover effects with descriptions

2. **Pyramid/Hierarchy**
   - Hierarchical levels from apex to base
   - Perfect for showing priorities, foundations, or organizational structures
   - Progressive color gradient from light (important) to dark (foundational)

3. **Cycle Diagram**
   - Circular flow showing cyclical processes
   - Numbered steps with directional arrows
   - Ideal for feedback loops, iterative processes

4. **Timeline** (Coming Soon)
   - Chronological sequence of events
   - Date-based ordering

5. **Comparison** (Coming Soon)
   - Side-by-side feature/concept comparison

6. **Process** (Coming Soon)
   - Step-by-step sequential workflows

## 🏗️ Architecture

### Core Components

```
src/
├── lib/
│   ├── viz/types.ts                    # Type definitions for infographics
│   ├── infographicPromptBuilder.ts     # Prompt engineering for Gemini
│   ├── infographicService.ts           # Gemini integration & generation
│   └── infographicStorage.ts           # LocalStorage persistence
│
├── components/Infographics/
│   ├── InfographicRenderer.tsx         # Main unified renderer
│   ├── MindMapRenderer.tsx             # Mind map visualization (D3.js)
│   ├── PyramidRenderer.tsx             # Pyramid/hierarchy visualization
│   ├── CycleDiagramRenderer.tsx        # Cycle diagram visualization
│   └── Infographics.css                # Styling with dark mode support
│
└── types/
    └── summaryTypes.ts                 # Updated with infographic fields
```

### Data Flow

```
Summary Text
    ↓
infographicPromptBuilder.ts (Builds specialized prompt)
    ↓
Gemini AI 1.5 Pro (Analyzes & extracts structure)
    ↓
infographicService.ts (Validates & creates InfographicSpec)
    ↓
infographicStorage.ts (Persists to localStorage)
    ↓
InfographicRenderer.tsx (Routes to appropriate renderer)
    ↓
[MindMapRenderer | PyramidRenderer | CycleDiagramRenderer]
    ↓
Interactive SVG Visualization
```

## 🚀 Usage

### Generating an Infographic

```typescript
import { generateInfographic, generateMindMap } from '@/lib/infographicService';
import { saveInfographicSpec } from '@/lib/infographicStorage';

// Auto-detect best type
const result = await generateInfographic(summaryText, {
  summaryId: 'summary-123'
});

if (result.success && result.spec) {
  saveInfographicSpec(result.spec);
}

// Or generate specific type (e.g., mind map)
const mindMapResult = await generateMindMap(summaryText, 'summary-123');
```

### Rendering an Infographic

```typescript
import { InfographicRenderer, InfographicErrorBoundary } from '@/components/Infographics/InfographicRenderer';
import '@/components/Infographics/Infographics.css';

function MyComponent() {
  return (
    <InfographicErrorBoundary>
      <InfographicRenderer
        spec={infographicSpec}
        width={900}
        height={700}
        showControls={true}
        onExport={(format) => console.log(`Exported as ${format}`)}
      />
    </InfographicErrorBoundary>
  );
}
```

### Checking for Existing Infographics

```typescript
import { getInfographicSpec, hasInfographic } from '@/lib/infographicStorage';

if (hasInfographic(summaryId)) {
  const spec = getInfographicSpec(summaryId);
  // Render existing infographic
}
```

## 🎯 Prompt Engineering Strategy

### Key Principles

1. **Structured Output**: All prompts request pure JSON output matching exact schemas
2. **Type-Specific Instructions**: Detailed rules for each infographic type
3. **Label Constraints**: Max 40 characters for readability
4. **Validation**: Server-side validation ensures structural integrity

### Example Prompt Structure

```
You are an expert data visualization AI...

## Available Infographic Types:
1. mindmap - Central concept with branching ideas
   - Use when: Multiple interconnected concepts
   - Structure: 1 center, 4-8 primary, 2-4 secondary per primary

## Output Format:
{
  "type": "mindmap",
  "title": "Brief title (max 60 chars)",
  "nodes": [...],
  "confidence": 0.85
}

## Type-Specific Rules:
For MINDMAP:
- Exactly 1 central node (level=0)
- 4-8 primary branches (level=1)
- Colors: #3b82f6, #10b981, #f59e0b, etc.

## Summary Text:
[User's summary text here]
```

### Temperature & Model Settings

- **Model**: `gemini-1.5-pro`
- **Temperature**: `0.3` (Lower for consistent structure)
- **Top-P**: `0.85`
- **Max Tokens**: `4096`

## 📊 Type Selection Logic

The system uses two approaches:

### 1. AI-Powered Selection (Recommended)
```typescript
const result = await generateInfographic(summaryText);
// Gemini analyzes content and chooses optimal type
```

### 2. Heuristic Suggestions (Fast)
```typescript
import { suggestInfographicTypes } from '@/lib/infographicService';

const suggested = suggestInfographicTypes(summaryText);
// Returns: ['timeline', 'process', 'mindmap']
```

**Heuristic Rules:**
- Timeline: Contains years (e.g., 2020), or words like "history", "evolution"
- Process: Contains "step", "phase", "procedure"
- Cycle: Contains "cycle", "loop", "iterative", "feedback"
- Pyramid: Contains "hierarchy", "level", "foundation"
- Comparison: Contains "versus", "compare", "contrast"
- Mindmap: Default fallback for conceptual content

## 🎨 Styling & Theming

### Color Palette

**Mind Map:**
- Center: `#3b82f6` (blue)
- Branches: `#10b981` (green), `#f59e0b` (amber), `#ef4444` (red), `#8b5cf6` (purple), `#ec4899` (pink)
- Secondary: `#f1f5f9` (light gray) with colored borders

**Pyramid:**
- Progressive: `#fbbf24` → `#f59e0b` → `#d97706` → `#b45309` → `#92400e`

**Cycle:**
- Nodes: `#e0f2fe` (light cyan) with `#0ea5e9` borders

### Dark Mode

Automatically adjusts using CSS variables:
```css
@media (prefers-color-scheme: dark) {
  --bg-primary: #1e293b;
  --text-primary: #f1f5f9;
  --border-color: #334155;
}
```

## 📦 Export Capabilities

Supports two formats:

1. **PNG** - High-resolution (2x scale) bitmap
2. **SVG** - Scalable vector graphics

```typescript
<InfographicRenderer
  spec={spec}
  onExport={(format) => {
    if (format === 'png') {
      // PNG exported
    } else {
      // SVG exported
    }
  }}
/>
```

## 🔧 Configuration

### Summary Config Integration

```typescript
const config: Partial<SummaryConfig> = {
  includeInfographics: true,
  autoGenerateInfographic: true,
  preferredInfographicType: 'mindmap'
};
```

### Display Preferences

```typescript
const prefs: SummaryDisplayPreferences = {
  showInfographics: true,
  infographicSize: 'large',
  autoGenerateInfographics: true
};
```

## 🧪 Testing Examples

### Test Mind Map Generation

```typescript
const testSummary = `
Machine Learning encompasses several key approaches:

Supervised Learning uses labeled data for training. Common algorithms include 
decision trees and neural networks.

Unsupervised Learning finds patterns in unlabeled data. Clustering and 
dimensionality reduction are primary techniques.

Reinforcement Learning learns through trial and error, receiving rewards 
for correct actions.
`;

const result = await generateMindMap(testSummary);
// Expected: Center node "Machine Learning" with 3 primary branches
```

### Test Pyramid Generation

```typescript
const testSummary = `
Maslow's Hierarchy of Needs progresses from foundational to aspirational:

Physiological Needs form the base - food, water, shelter.
Safety Needs include security and stability.
Love and Belonging involve relationships and connection.
Esteem encompasses achievement and respect.
Self-Actualization represents reaching one's full potential.
`;

const result = await generateInfographic(testSummary, {
  preferredType: 'pyramid'
});
// Expected: 5-level pyramid structure
```

## 🚧 Known Limitations

1. **Timeline, Comparison, Process renderers** are placeholders
2. **Complex nested structures** (>3 levels) may not render optimally
3. **Very short summaries** (<50 chars) will fail validation
4. **Gemini API errors** require fallback handling
5. **Export quality** depends on browser's canvas implementation

## 🔮 Future Enhancements

### Short Term
- [ ] Implement Timeline renderer with date parsing
- [ ] Add Comparison table/matrix renderer
- [ ] Add Process flow diagram renderer
- [ ] Support custom color schemes
- [ ] Add zoom/pan for large infographics

### Long Term
- [ ] Supabase persistence (replace localStorage)
- [ ] Collaborative editing
- [ ] Animation & transitions
- [ ] AI-powered layout optimization
- [ ] Template library
- [ ] Integration with presentation mode

## 📚 API Reference

### InfographicService

```typescript
// Generate infographic (auto-detect type)
generateInfographic(
  summaryText: string,
  options?: {
    preferredType?: InfographicType;
    summaryId?: string;
    temperature?: number;
  }
): Promise<InfographicGenerationResult>

// Generate specific mind map
generateMindMap(
  summaryText: string,
  summaryId?: string
): Promise<InfographicGenerationResult>

// Suggest types based on content
suggestInfographicTypes(
  summaryText: string
): InfographicType[]

// Generate multiple variants
generateInfographicVariants(
  summaryText: string,
  types: InfographicType[],
  summaryId?: string
): Promise<InfographicSpec[]>
```

### InfographicStorage

```typescript
// Get infographic for summary
getInfographicSpec(summaryId: string): InfographicSpec | null

// Save infographic
saveInfographicSpec(spec: InfographicSpec): void

// Check existence
hasInfographic(summaryId: string): boolean

// Update existing
updateInfographicSpec(
  summaryId: string,
  updates: Partial<InfographicSpec>
): InfographicSpec | null

// Delete infographic
deleteInfographicSpec(summaryId: string): boolean

// Get all infographics
getAllInfographicSpecs(): InfographicSpec[]
```

## 🤝 Contributing

When adding new infographic types:

1. Create renderer component in `src/components/Infographics/`
2. Add type to `InfographicType` union in `types.ts`
3. Update `InfographicRenderer.tsx` router
4. Add type-specific validation to `infographicService.ts`
5. Update prompt builder with new type instructions
6. Add styling to `Infographics.css`

## 📄 License

Part of SummarEase project. See main repository for license details.

---

**Built with:** React, TypeScript, D3.js, Google Gemini AI

**Inspired by:** Napkin.ai's brilliant visual storytelling approach
