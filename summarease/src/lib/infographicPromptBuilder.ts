import type { InfographicType } from './viz/types';

/**
 * Builds a prompt for Gemini to extract the best infographic structure from summary text
 */
export function buildInfographicExtractionPrompt(summaryText: string): string {
  return `You are an expert data visualization AI specialized in converting text content into structured visual representations.

Analyze the following summary text and determine the BEST infographic type to represent the key concepts visually.

## Available Infographic Types:

1. **mindmap** - Central concept with branching related ideas
   - Use when: Multiple interconnected concepts around a central theme
   - Example structure: Central node → 5-8 main branches → 2-4 sub-branches each
   - Best for: Exploring relationships between ideas, brainstorming concepts

2. **cycle** - Circular flow showing cyclical processes
   - Use when: Steps that loop back or continuous processes
   - Example: Communication cycle, feedback loops, iterative processes
   - Best for: Recurring patterns, circular workflows

3. **pyramid** - Hierarchical levels from base to apex
   - Use when: Showing levels, priorities, or building blocks
   - Example: Maslow's hierarchy, organizational structure, foundation concepts
   - Best for: Showing importance, priority, or foundational relationships

4. **timeline** - Chronological sequence of events
   - Use when: Historical events, project phases, evolution over time
   - Example: Product development stages, historical milestones, growth phases
   - Best for: Temporal data, historical context, sequential developments

5. **comparison** - Side-by-side feature or concept comparison
   - Use when: Comparing 2-4 items across multiple dimensions
   - Example: Product features, methodology differences, pros/cons
   - Best for: Decision-making, contrasting approaches

6. **process** - Sequential steps in a workflow
   - Use when: Procedures, algorithms, step-by-step guides
   - Example: Scientific method, onboarding process, manufacturing steps
   - Best for: Instructional content, procedures, methodologies

7. **hierarchy** - Tree-like organizational structure
   - Use when: Showing organizational relationships or taxonomies
   - Example: Corporate structure, classification systems, decision trees
   - Best for: Organizational charts, categorization systems

## Your Task:

1. Read the summary carefully and identify key concepts, relationships, and patterns
2. Determine which infographic type BEST represents the content structure
3. Extract the most important concepts that should be visualized
4. Create clear, concise node labels (max 40 characters each)
5. Define relationships between nodes where applicable

## Output Format:

Return ONLY valid JSON matching this exact schema:

{
  "type": "mindmap" | "cycle" | "pyramid" | "timeline" | "comparison" | "process" | "hierarchy",
  "title": "Brief descriptive title (max 60 chars)",
  "subtitle": "Optional clarification (max 100 chars)",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why you chose this type (max 100 chars)",
  "nodes": [
    {
      "id": "unique_snake_case_id",
      "label": "Node text (max 40 chars)",
      "description": "Optional longer description (max 150 chars)",
      "level": 0,
      "position": 0,
      "children": ["child_id1", "child_id2"],
      "color": "#3b82f6"
    }
  ],
  "connections": [
    {
      "from": "node_id_1",
      "to": "node_id_2",
      "label": "Relationship label (optional, max 30 chars)",
      "type": "arrow",
      "bidirectional": false
    }
  ]
}

## Type-Specific Rules:

### For MINDMAP:
- Exactly 1 central node (level=0)
- 4-8 primary branches (level=1), each with meaningful color
- 2-4 secondary nodes per primary branch (level=2)
- Use children array to link primary nodes to their secondaries
- Colors should be distinct and visually appealing (#3b82f6, #10b981, #f59e0b, #ef4444, #8b5cf6, #ec4899)

### For CYCLE:
- 3-6 nodes in circular arrangement (use position: 0, 1, 2... for ordering)
- Each node connects to the next, last connects back to first
- Include descriptive connection labels showing the flow
- All connections should be type: "arrow"

### For PYRAMID:
- 3-5 hierarchical levels
- Top level (level=0): 1 node
- Each subsequent level should have more nodes than the one above
- Use colors to differentiate levels (lighter at top, darker at base)

### For TIMELINE:
- Use position field for chronological ordering (0, 1, 2, ...)
- Include dates or time periods in descriptions when available
- Keep to 4-8 major events/milestones

### For COMPARISON:
- 2-4 items being compared (these are your main nodes at level=0)
- 3-6 comparison attributes (level=1 nodes)
- Link attributes to the items being compared using connections

### For PROCESS:
- 4-8 sequential steps (use position: 0, 1, 2... for ordering)
- Each step connects to the next with arrow connections
- Include brief action-oriented labels

### For HIERARCHY:
- Clear parent-child relationships using children array
- Root node at level=0
- Maximum 4 levels deep
- Each node can have multiple children

## Important Guidelines:

- Keep all labels concise and readable (max 40 chars)
- Use descriptive IDs (e.g., "central_concept", "branch_marketing", "step_planning")
- Only include connections array when relationships need explicit definition (cycle, process, comparison)
- Colors should be hex codes and visually harmonious
- Confidence should reflect how well the content fits the chosen type (0.6-1.0)
- If content fits multiple types, choose the one with highest clarity and impact
- Avoid overly complex structures - simplicity is key for visual understanding

## Summary Text to Analyze:

${summaryText}

## Response:

IMPORTANT: Return ONLY valid, well-formed JSON. 
- No markdown code blocks (no \`\`\`)
- No trailing commas
- No comments
- All strings must use double quotes
- Ensure all arrays and objects are properly closed
- Test that your JSON is valid before responding

Return the JSON now:`;
}

/**
 * Builds a prompt specifically for generating a mind map
 */
export function buildMindMapPrompt(summaryText: string): string {
  return `Extract a mind map structure from the following summary text.

A mind map has:
- ONE central concept (the main idea) - level 0
- 5-8 main branches (key topics) - level 1
- 2-4 sub-concepts per main branch - level 2

Rules:
- Use clear, concise labels (max 40 characters)
- Suggest distinct colors for visual grouping
- Use descriptive snake_case IDs
- Link sub-concepts to their parent branches using the children array

Output ONLY this JSON format:

{
  "type": "mindmap",
  "title": "Title (max 60 chars)",
  "subtitle": "Optional subtitle",
  "confidence": 0.9,
  "reasoning": "Why this is a good mind map structure",
  "nodes": [
    {
      "id": "center",
      "label": "Central Concept",
      "level": 0,
      "color": "#3b82f6"
    },
    {
      "id": "branch_name",
      "label": "Main Branch Label",
      "level": 1,
      "children": ["sub_1", "sub_2"],
      "color": "#10b981"
    },
    {
      "id": "sub_1",
      "label": "Sub Concept",
      "level": 2,
      "description": "Optional longer description"
    }
  ]
}

Summary Text:
${summaryText}

IMPORTANT: Return ONLY valid JSON with:
- No markdown code blocks
- No trailing commas
- Double quotes for all strings
- Properly closed brackets

Return the JSON now:`;
}

/**
 * Builds a prompt for a specific infographic type
 */
export function buildTypedInfographicPrompt(
  summaryText: string,
  type: InfographicType
): string {
  const typeInstructions = getTypeSpecificInstructions(type);
  
  return `Generate a ${type} infographic structure from the following summary text.

${typeInstructions}

Return ONLY valid JSON in this format:

{
  "type": "${type}",
  "title": "Brief title (max 60 chars)",
  "subtitle": "Optional subtitle",
  "confidence": 0.8,
  "reasoning": "Why this structure works",
  "nodes": [...],
  "connections": [...]
}

Summary Text:
${summaryText}

IMPORTANT: Return ONLY valid JSON with:
- No markdown code blocks (no \`\`\`)
- No trailing commas
- Double quotes for all strings
- All arrays and objects properly closed

Return the JSON now:`;
}

/**
 * Get type-specific instructions for the prompt
 */
function getTypeSpecificInstructions(type: InfographicType): string {
  const instructions: Record<InfographicType, string> = {
    mindmap: `
A mind map structure with:
- 1 central node (level=0)
- 5-8 main branches (level=1) with distinct colors
- 2-4 sub-nodes per branch (level=2)
- Use children array to link nodes`,

    cycle: `
A circular flow with:
- 3-6 nodes in a cycle (use position: 0,1,2... for ordering)
- Arrow connections from each node to the next
- Last node connects back to first
- Include connection labels describing the flow`,

    pyramid: `
A hierarchical pyramid with:
- 3-5 levels (level=0 at top, increasing downward)
- Fewer nodes at top, more at base
- Use progressively darker colors from top to bottom`,

    timeline: `
A chronological sequence with:
- 4-8 key events/milestones
- Use position field for ordering (0,1,2...)
- Include dates or time periods in descriptions
- Sequential connections between events`,

    comparison: `
A comparison structure with:
- 2-4 items being compared (main nodes at level=0)
- 3-6 attributes for comparison (level=1)
- Connections linking attributes to compared items`,

    process: `
A step-by-step process with:
- 4-8 sequential steps
- Use position field for ordering
- Arrow connections between consecutive steps
- Action-oriented labels (e.g., "Plan", "Execute", "Review")`,

    hierarchy: `
A tree-like hierarchy with:
- 1 root node (level=0)
- Parent-child relationships using children array
- Maximum 4 levels deep
- Clear organizational structure`
  };

  return instructions[type] || instructions.mindmap;
}

/**
 * Validate and clean extracted JSON from Gemini response
 */
export function extractAndValidateJSON(responseText: string): any | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = responseText.trim();
    
    // Remove ```json or ``` wrappers
    const jsonMatch = cleaned.match(/```json?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }
    
    // Find JSON object boundaries
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      console.error('No JSON object found in response');
      return null;
    }
    
    cleaned = cleaned.substring(startIdx, endIdx + 1);
    
    // Clean common JSON formatting issues
    cleaned = cleanJsonString(cleaned);
    
    // Parse and validate
    const parsed = JSON.parse(cleaned);
    
    // Basic validation
    if (!parsed.type || !parsed.nodes || !Array.isArray(parsed.nodes)) {
      console.error('Invalid infographic structure:', parsed);
      return null;
    }
    
    // Ensure required fields
    if (!parsed.title) parsed.title = 'Untitled Infographic';
    if (!parsed.confidence) parsed.confidence = 0.7;
    if (!parsed.nodes.length) {
      console.error('Infographic has no nodes');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse infographic JSON:', error);
    console.error('Response text (first 500 chars):', responseText.substring(0, 500));
    
    // Try alternative parsing methods
    return tryAlternativeParsing(responseText);
  }
}

/**
 * Clean common JSON formatting issues that Gemini might produce
 */
function cleanJsonString(jsonStr: string): string {
  return jsonStr
    // Remove trailing commas before closing brackets
    .replace(/,\s*([\]}])/g, '$1')
    // Remove comments (// or /* */)
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Fix single quotes to double quotes (but be careful with apostrophes)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Normalize whitespace
    .trim();
}

/**
 * Try alternative parsing methods when standard JSON.parse fails
 */
function tryAlternativeParsing(responseText: string): any | null {
  try {
    console.log('Attempting alternative JSON parsing...');
    
    // Try to find and extract just the essential parts
    const typeMatch = responseText.match(/"type"\s*:\s*"([^"]+)"/);
    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
    const nodesMatch = responseText.match(/"nodes"\s*:\s*\[([\s\S]*?)\](?:\s*,\s*"connections"|\s*,\s*"confidence"|\s*\})/);
    
    if (!typeMatch || !nodesMatch) {
      console.error('Could not extract essential infographic data');
      return null;
    }
    
    // Try to parse individual nodes
    const nodeText = nodesMatch[1];
    const nodeObjects: any[] = [];
    
    // Match individual node objects
    const nodeMatches = nodeText.matchAll(/\{([^{}]*?)\}/gs);
    for (const match of nodeMatches) {
      try {
        const nodeJson = '{' + match[1] + '}';
        const cleaned = cleanJsonString(nodeJson);
        const node = JSON.parse(cleaned);
        if (node.id && node.label) {
          nodeObjects.push(node);
        }
      } catch (e) {
        console.warn('Failed to parse node, skipping:', match[0]);
      }
    }
    
    if (nodeObjects.length === 0) {
      console.error('No valid nodes could be extracted');
      return null;
    }
    
    // Build minimal valid infographic
    return {
      type: typeMatch[1],
      title: titleMatch ? titleMatch[1] : 'Untitled Infographic',
      nodes: nodeObjects,
      connections: [],
      confidence: 0.5
    };
  } catch (error) {
    console.error('Alternative parsing also failed:', error);
    return null;
  }
}
