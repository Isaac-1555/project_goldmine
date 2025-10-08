import type { InfographicType } from './viz/types';
import { jsonrepair } from 'jsonrepair';

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

- **CRITICAL**: Every node MUST have both "id" and "label" fields
- Keep all labels concise and readable (max 40 chars)
- Use descriptive snake_case IDs (e.g., "central_concept", "branch_marketing", "step_planning")
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
  "nodes": [
    {
      "id": "node_1",
      "label": "Node Label",
      "level": 0,
      "position": 0
    }
  ],
  "connections": [
    {
      "from": "node_1",
      "to": "node_2",
      "type": "arrow"
    }
  ]
}

CRITICAL: Every node MUST have an "id" field!

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
  console.log('=== Starting JSON extraction ===');
  console.log('Response length:', responseText.length, 'chars');
  
  try {
    // Step 1: Extract JSON from markdown or plain text
    let cleaned = extractJsonFromResponse(responseText);
    
    if (!cleaned) {
      console.error('❌ No JSON object found in response');
      return tryAlternativeParsing(responseText);
    }
    
    console.log('✓ JSON extracted, length:', cleaned.length);
    
    // Step 2: Clean common formatting issues
    cleaned = cleanJsonString(cleaned);
    console.log('✓ JSON cleaned');
    
    // Step 3: Try to parse
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
      console.log('✓ JSON parsed successfully');
    } catch (parseError: any) {
      console.warn('⚠️  Initial parse failed:', parseError.message);
      console.log('Attempting JSON repair...');
      
      // Try to repair the JSON
      try {
        const repaired = jsonrepair(cleaned);
        parsed = JSON.parse(repaired);
        console.log('✓ JSON repaired and parsed successfully');
      } catch (repairError) {
        console.error('❌ JSON repair failed:', repairError);
        logDetailedParseError(parseError, cleaned);
        return tryAlternativeParsing(responseText);
      }
    }
    
    // Step 4: Validate structure
    if (!validateInfographicStructure(parsed)) {
      console.error('❌ Invalid infographic structure');
      return tryAlternativeParsing(responseText);
    }
    
    // Step 5: Ensure required fields
    normalizeInfographicData(parsed);
    
    console.log('✓ Validation complete, nodes:', parsed.nodes?.length);
    return parsed;
    
  } catch (error: any) {
    console.error('❌ Unexpected error in extractAndValidateJSON:', error);
    return tryAlternativeParsing(responseText);
  }
}

/**
 * Extract JSON from response, handling markdown and extra text
 */
function extractJsonFromResponse(responseText: string): string | null {
  let cleaned = responseText.trim();
  
  // Try to extract from markdown code blocks first
  const codeBlockPatterns = [
    /```json\s*\n([\s\S]*?)\n```/,
    /```\s*\n([\s\S]*?)\n```/,
    /`([\s\S]*?)`/
  ];
  
  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = match[1].trim();
      break;
    }
  }
  
  // Find JSON object boundaries using bracket matching
  const startIdx = cleaned.indexOf('{');
  if (startIdx === -1) return null;
  
  // Find matching closing bracket
  let bracketCount = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') bracketCount++;
      if (char === '}') {
        bracketCount--;
        if (bracketCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }
  
  if (endIdx === -1) {
    console.warn('⚠️  Could not find matching closing bracket');
    return null;
  }
  
  return cleaned.substring(startIdx, endIdx + 1);
}

/**
 * Clean common JSON formatting issues that Gemini might produce
 */
function cleanJsonString(jsonStr: string): string {
  let cleaned = jsonStr;
  
  // Remove comments (but be careful not to remove them from strings)
  // Remove single-line comments
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove trailing commas before closing brackets/braces
  // This handles multiple trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  // Fix unquoted keys (but preserve strings)
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes for property names and values
  // This is tricky - we need to be careful with apostrophes
  cleaned = cleaned.replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
  
  // Normalize line breaks within strings (they should be escaped)
  // This is a simple approach - more robust would parse properly
  
  return cleaned.trim();
}

/**
 * Validate infographic structure
 */
function validateInfographicStructure(parsed: any): boolean {
  if (!parsed.type) {
    console.error('Missing type field');
    return false;
  }
  
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    console.error('Missing or invalid nodes array');
    return false;
  }
  
  if (parsed.nodes.length === 0) {
    console.error('Empty nodes array');
    return false;
  }
  
  // Validate and fix nodes
  for (let i = 0; i < parsed.nodes.length; i++) {
    const node = parsed.nodes[i];
    
    // Must have at least a label
    if (!node.label) {
      console.error(`Node at index ${i} missing label:`, node);
      return false;
    }
    
    // Auto-generate ID if missing
    if (!node.id) {
      node.id = generateNodeId(node.label, i);
      console.warn(`⚠️  Node at index ${i} missing id, generated: ${node.id}`);
    }
  }
  
  return true;
}

/**
 * Generate a node ID from label
 */
function generateNodeId(label: string, index: number): string {
  // Create a snake_case id from the label
  const baseId = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .substring(0, 30); // Limit length
  
  // Add index to ensure uniqueness
  return `${baseId}_${index}`;
}

/**
 * Normalize infographic data, adding missing fields
 */
function normalizeInfographicData(parsed: any): void {
  if (!parsed.title) parsed.title = 'Untitled Infographic';
  if (!parsed.confidence) parsed.confidence = 0.7;
  if (!parsed.connections) parsed.connections = [];
  if (!parsed.subtitle) parsed.subtitle = '';
  if (!parsed.reasoning) parsed.reasoning = '';
}

/**
 * Log detailed parse error for debugging
 */
function logDetailedParseError(error: any, jsonStr: string): void {
  console.error('=== Detailed Parse Error ===');
  console.error('Error message:', error.message);
  
  // Try to extract position from error message
  const posMatch = error.message.match(/position (\d+)/);
  if (posMatch) {
    const pos = parseInt(posMatch[1]);
    const start = Math.max(0, pos - 50);
    const end = Math.min(jsonStr.length, pos + 50);
    const context = jsonStr.substring(start, end);
    const pointer = ' '.repeat(Math.min(50, pos - start)) + '^';
    
    console.error('Context around error position:');
    console.error(context);
    console.error(pointer);
  }
  
  // Log the first and last parts of the JSON
  console.error('\nJSON start (200 chars):', jsonStr.substring(0, 200));
  console.error('\nJSON end (200 chars):', jsonStr.substring(Math.max(0, jsonStr.length - 200)));
}

/**
 * Try alternative parsing methods when standard JSON.parse fails
 */
function tryAlternativeParsing(responseText: string): any | null {
  console.log('=== Attempting alternative parsing ===');
  
  try {
    // Try to find and extract just the essential parts using regex
    const typeMatch = responseText.match(/"type"\s*:\s*"([^"]+)"/);
    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
    
    if (!typeMatch) {
      console.error('❌ Could not extract type field');
      return null;
    }
    
    // Try to extract nodes array with better bracket matching
    const nodesArrayMatch = extractNodesArray(responseText);
    
    if (!nodesArrayMatch) {
      console.error('❌ Could not extract nodes array');
      return null;
    }
    
    // Parse the nodes array
    const nodeObjects = parseNodesArray(nodesArrayMatch);
    
    if (nodeObjects.length === 0) {
      console.error('❌ No valid nodes could be extracted');
      return null;
    }
    
    console.log('✓ Alternative parsing succeeded, extracted', nodeObjects.length, 'nodes');
    
    // Build minimal valid infographic
    return {
      type: typeMatch[1],
      title: titleMatch ? titleMatch[1] : 'Untitled Infographic',
      nodes: nodeObjects,
      connections: [],
      confidence: 0.5
    };
  } catch (error) {
    console.error('❌ Alternative parsing failed:', error);
    return null;
  }
}

/**
 * Extract nodes array from response using bracket matching
 */
function extractNodesArray(text: string): string | null {
  const nodesStart = text.indexOf('"nodes"');
  if (nodesStart === -1) return null;
  
  const arrayStart = text.indexOf('[', nodesStart);
  if (arrayStart === -1) return null;
  
  // Find matching closing bracket
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = arrayStart; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '[') bracketCount++;
      if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          return text.substring(arrayStart, i + 1);
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse nodes array string into node objects
 */
function parseNodesArray(arrayStr: string): any[] {
  const nodes: any[] = [];
  
  try {
    // Try to parse the whole array first
    const cleaned = cleanJsonString(arrayStr);
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      // Filter to nodes with at least a label
      const validNodes = parsed.filter(node => node.label);
      // Auto-generate IDs if missing
      validNodes.forEach((node, i) => {
        if (!node.id) {
          node.id = generateNodeId(node.label, i);
        }
      });
      return validNodes;
    }
  } catch (e) {
    console.warn('⚠️  Could not parse nodes array as a whole, trying individual nodes');
  }
  
  // Extract individual node objects
  const nodeObjects = extractNestedObjects(arrayStr);
  
  for (let i = 0; i < nodeObjects.length; i++) {
    const nodeStr = nodeObjects[i];
    try {
      const cleaned = cleanJsonString(nodeStr);
      const node = JSON.parse(cleaned);
      if (node.label) {
        // Auto-generate ID if missing
        if (!node.id) {
          node.id = generateNodeId(node.label, i);
        }
        nodes.push(node);
      }
    } catch (e) {
      console.warn('⚠️  Failed to parse node:', nodeStr.substring(0, 100));
    }
  }
  
  return nodes;
}

/**
 * Extract nested objects from a string using bracket matching
 */
function extractNestedObjects(text: string): string[] {
  const objects: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    const objStart = text.indexOf('{', i);
    if (objStart === -1) break;
    
    // Find matching closing brace
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let objEnd = -1;
    
    for (let j = objStart; j < text.length; j++) {
      const char = text[j];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            objEnd = j;
            break;
          }
        }
      }
    }
    
    if (objEnd !== -1) {
      objects.push(text.substring(objStart, objEnd + 1));
      i = objEnd + 1;
    } else {
      break;
    }
  }
  
  return objects;
}
