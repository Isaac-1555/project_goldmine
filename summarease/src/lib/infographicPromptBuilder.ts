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

Return ONLY valid JSON matching this schema:

{
  "type": "mindmap" | "cycle" | "pyramid" | "timeline" | "comparison" | "process" | "hierarchy",
  "title": "Brief descriptive title (max 60 chars)",
  "subtitle": "Optional clarification (max 100 chars)",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why you chose this type",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Node text (max 40 chars)",
      "description": "Optional description",
      "level": 0,
      "position": 0,
      "parentId": "optional_parent_id_for_easier_linking",
      "children": ["optional_child_id1", "optional_child_id2"],
      "color": "#3b82f6"
    }
  ],
  "connections": [
    {
      "from": "node_id_1",
      "to": "node_id_2",
      "type": "arrow"
    }
  ]
}

## Important Guidelines:

- **NO EMOJIS**: Do NOT use emojis in any labels or descriptions.
- **NO DUPLICATES**: Ensure all concepts are unique.
- **Relationships**: You can use EITHER "children" array on parent nodes OR "parentId" on child nodes. You don't need both.
- **Root Node**: For mindmaps/hierarchies, ensure there is ONE central node (level=0).
- **Structure**: Create a rich, deep structure. Don't just list top-level items. Dive into details (level 2).
- **IDs**: Use simple, unique IDs (e.g., "node_1", "node_2", "center").

## Summary Text to Analyze:

${summaryText}

## Response:

IMPORTANT: Return ONLY valid, well-formed JSON. 
- No markdown code blocks
- No trailing commas
- All strings must use double quotes

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
      "id": "branch_1",
      "label": "Main Branch Label",
      "level": 1,
      "parentId": "center",
      "color": "#10b981"
    },
    {
      "id": "sub_1",
      "label": "Sub Concept",
      "level": 2,
      "parentId": "branch_1",
      "description": "Optional description"
    }
  ]
}

Key Rules:
1. Use "parentId" to link nodes (e.g. sub-node points to branch ID, branch points to center ID).
2. Ensure there is EXACTLY ONE Level 0 node.
3. Keep labels concise (under 40 chars).

Summary Text:
${summaryText}

IMPORTANT: Return ONLY valid JSON. No markdown.`;
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
      "position": 0,
      "parentId": "optional_parent_id"
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

Guidelines:
- Use "parentId" to establish hierarchy where applicable.
- Ensure every node has a unique "id".
- Keep labels concise.

Summary Text:
${summaryText}

IMPORTANT: Return ONLY valid JSON. No markdown.`;
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
  console.log('Response preview (first 500 chars):', responseText.substring(0, 500));
  
  try {
    // Step 0: Preprocess the response
    const preprocessed = preprocessGeminiResponse(responseText);
    console.log('✓ Response preprocessed, length:', preprocessed.length);
    
    // Step 1: Extract JSON from markdown or plain text
    let cleaned = extractJsonFromResponse(preprocessed);
    
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
    
  // Step 5: Repair and Normalize data
    // This is the critical fix for "bad" infographics - we accept imperfect AI output
    // and algorithmically fix it (linking orphans, supporting parentId, etc)
    repairInfographicData(parsed);

    // Step 6: Final validation
    if (!validateInfographicStructure(parsed)) {
      console.error('❌ Invalid infographic structure even after repair');
      return tryAlternativeParsing(responseText);
    }
    
    console.log('✓ Validation complete, nodes:', parsed.nodes?.length);
    return parsed;
    
  } catch (error: any) {
    console.error('❌ Unexpected error in extractAndValidateJSON:', error);
    return tryAlternativeParsing(responseText);
  }
}

/**
 * Preprocess Gemini response to handle common formatting issues
 */
function preprocessGeminiResponse(responseText: string): string {
  let processed = responseText.trim();
  
  // Remove common explanatory phrases that Gemini adds
  const phrasesToRemove = [
    /^Here is the JSON:?\s*/i,
    /^Here's the JSON:?\s*/i,
    /^Here is the requested JSON:?\s*/i,
    /^Here's the infographic structure:?\s*/i,
    /^The JSON response:?\s*/i,
    /^JSON:?\s*/i,
    /^Output:?\s*/i,
    /^Response:?\s*/i
  ];
  
  for (const phrase of phrasesToRemove) {
    processed = processed.replace(phrase, '');
  }
  
  // Remove any trailing explanatory text after the JSON
  // Look for common endings
  const endPatterns = [
    /\n\n.*This (structure|infographic|mindmap)/i,
    /\n\nNote:/i,
    /\n\nThe above/i
  ];
  
  for (const pattern of endPatterns) {
    const match = processed.search(pattern);
    if (match > 0) {
      processed = processed.substring(0, match);
    }
  }
  
  return processed.trim();
}

/**
 * Extract JSON from response, handling markdown and extra text
 */
function extractJsonFromResponse(responseText: string): string | null {
  let cleaned = responseText.trim();
  
  // Try to extract from markdown code blocks first with enhanced patterns
  const codeBlockPatterns = [
    /```json\s*\n([\s\S]*?)\n?```/,  // Standard json block
    /```javascript\s*\n([\s\S]*?)\n?```/,  // Sometimes labeled as javascript
    /```\s*\n([\s\S]*?)\n?```/,  // Generic code block
    /```([\s\S]*?)```/,  // Without newlines
    /`{3,}json\s*([\s\S]*?)`{3,}/,  // Multiple backticks
    /`{3,}\s*([\s\S]*?)`{3,}/,  // Multiple backticks, any language
    /`([^`]+)`/  // Single backtick inline (less preferred)
  ];
  
  let extractionMethod = 'none';
  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = match[1].trim();
      extractionMethod = 'markdown';
      console.log('✓ Extracted from markdown code block');
      break;
    }
  }
  
  if (extractionMethod === 'none') {
    console.log('⚠️  No markdown code block found, attempting direct extraction');
  }
  
  // Find JSON object boundaries using enhanced bracket matching
  const startIdx = cleaned.indexOf('{');
  if (startIdx === -1) {
    console.error('❌ No opening brace found in response');
    return null;
  }
  
  console.log('✓ Found opening brace at position', startIdx);
  
  // Find matching closing bracket with improved algorithm
  let bracketCount = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;
  let lastValidClosing = -1; // Track last valid closing for fallback
  
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
    
    // Track both single and double quotes for string boundaries
    if (char === '"' && !inString) {
      inString = true;
      continue;
    } else if (char === '"' && inString) {
      inString = false;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        bracketCount++;
      } else if (char === '}') {
        bracketCount--;
        if (bracketCount === 0) {
          endIdx = i;
          console.log('✓ Found matching closing brace at position', i);
          break;
        } else if (bracketCount > 0) {
          // Track this as a potentially valid closing point
          lastValidClosing = i;
        }
      }
    }
  }
  
  if (endIdx === -1) {
    console.warn('⚠️  Could not find perfectly matching closing bracket');
    console.warn('Final bracket count:', bracketCount);
    console.warn('Last valid closing at:', lastValidClosing);
    
    // Fallback: if we found at least one closing bracket, try using the last one
    if (lastValidClosing > startIdx) {
      console.log('⚠️  Using fallback: last valid closing bracket at', lastValidClosing);
      endIdx = lastValidClosing;
    } else {
      // Last resort: try to find ANY closing bracket after start
      endIdx = cleaned.lastIndexOf('}');
      if (endIdx > startIdx) {
        console.log('⚠️  Using last resort: any closing bracket at', endIdx);
      } else {
        console.error('❌ No closing bracket found at all');
        return null;
      }
    }
  }
  
  const extracted = cleaned.substring(startIdx, endIdx + 1);
  console.log('✓ Extracted JSON length:', extracted.length, 'chars');
  return extracted;
}

/**
 * Clean common JSON formatting issues that Gemini might produce
 */
function cleanJsonString(jsonStr: string): string {
  let cleaned = jsonStr;
  
  // Step 1: Remove comments more carefully
  // Only remove // comments that are not inside strings
  // Simple heuristic: if line has quotes before //, it's likely in a string
  cleaned = cleaned.split('\n').map(line => {
    const firstQuote = line.indexOf('"');
    const commentIdx = line.indexOf('//');
    // Only remove comment if it appears before any quotes or no quotes exist
    if (commentIdx !== -1 && (firstQuote === -1 || commentIdx < firstQuote)) {
      return line.substring(0, commentIdx);
    }
    return line;
  }).join('\n');
  
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Step 2: Remove trailing commas before closing brackets/braces
  // Handle multiple consecutive trailing commas
  cleaned = cleaned.replace(/,+\s*([\]}])/g, '$1');
  
  // Step 3: Fix unquoted keys (but be more careful)
  // Only fix keys that look like identifiers and are not already quoted
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, (match, prefix, key) => {
    // Don't quote if already quoted
    if (prefix.includes('"')) return match;
    return `${prefix}"${key}":`;
  });
  
  // Step 4: Handle single quotes more carefully
  // Replace single quotes with double quotes for property names
  cleaned = cleaned.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
  
  // Step 5: Fix common value formatting issues
  // Replace single-quoted values with double quotes (but preserve escaped content)
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, (match, value) => {
    // Escape any internal double quotes
    const escaped = value.replace(/"/g, '\\"');
    return `: "${escaped}"`;
  });
  
  // Step 6: Remove any null bytes or other problematic characters
  cleaned = cleaned.replace(/\0/g, '');
  
  // Step 7: Normalize whitespace but preserve structure
  cleaned = cleaned.replace(/[\r\n]+/g, '\n');
  
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
 * Repair and normalize infographic data
 * This is the "secret sauce" that makes AI generation robust
 */
function repairInfographicData(parsed: any): void {
  // 1. Ensure basic fields
  if (!parsed.title) parsed.title = 'Untitled Infographic';
  if (!parsed.confidence) parsed.confidence = 0.7;
  if (!parsed.connections) parsed.connections = [];
  if (!parsed.subtitle) parsed.subtitle = '';
  if (!parsed.reasoning) parsed.reasoning = '';
  
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    parsed.nodes = [];
    return;
  }

  // 2. Ensure all nodes have IDs and Labels, and clean them
  const labelMap = new Map<string, any>(); // For deduplication
  const uniqueNodes: any[] = [];

  parsed.nodes.forEach((node: any, i: number) => {
    if (!node.label) node.label = `Node ${i + 1}`;
    
    // Clean label: Remove emojis, markdown, and extra whitespace
    // Remove emojis (ranges for common emojis)
    node.label = node.label.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    // Remove markdown bold/italic
    node.label = node.label.replace(/[*_#`~]/g, '');
    // Trim
    node.label = node.label.trim();
    
    // Check for duplicates
    const normalizedLabel = node.label.toLowerCase();
    if (labelMap.has(normalizedLabel)) {
      // Merge logic: If this duplicate has children/connections, move them to the original
      const original = labelMap.get(normalizedLabel);
      
      // Merge children
      if (node.children && Array.isArray(node.children)) {
        if (!original.children) original.children = [];
        original.children.push(...node.children);
      }
      
      // Don't add to uniqueNodes
      console.log(`🔧 Repair: Merged duplicate node "${node.label}"`);
      return;
    }
    
    labelMap.set(normalizedLabel, node);
    
    if (!node.id) node.id = generateNodeId(node.label, i);
    // Ensure level is a number
    if (typeof node.level !== 'number') node.level = 1;
    
    uniqueNodes.push(node);
  });
  
  parsed.nodes = uniqueNodes;

  // 3. Ensure distinct IDs (re-check after deduplication)
  const idSet = new Set();
  parsed.nodes.forEach((node: any, i: number) => {
    if (idSet.has(node.id)) {
      node.id = `${node.id}_${i}`; // Make unique
    }
    idSet.add(node.id);
  });

  // 4. Ensure EXACTLY ONE Level 0 (Center) node
  const level0 = parsed.nodes.filter((n: any) => n.level === 0);
  
  if (level0.length === 0) {
    // Promote first node to center
    if (parsed.nodes.length > 0) {
      console.log('🔧 Repair: Promoting first node to Level 0 (Center)');
      parsed.nodes[0].level = 0;
      parsed.nodes[0].color = '#3b82f6'; // Standard center color
    }
  } else if (level0.length > 1) {
    // Demote extras to Level 1
    console.log('🔧 Repair: Demoting extra Level 0 nodes to Level 1');
    for (let i = 1; i < level0.length; i++) {
      level0[i].level = 1;
    }
  }

  // 5. Build relationships (The most critical part)
  // We support both 'children' arrays AND 'parentId' references
  
  // First, index all nodes by ID for fast lookup
  const nodeMap = new Map<string, any>(parsed.nodes.map((n: any) => [n.id, n]));
  
  // Track valid IDs to filter non-existent children
  const validIds = new Set(parsed.nodes.map((n: any) => n.id));

  // 5a. Handle 'parentId' if present (AI often prefers this)
  parsed.nodes.forEach((node: any) => {
    if (node.parentId && validIds.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId) as any
      if (parent) {
        if (!Array.isArray(parent.children)) parent.children = []
        if (!parent.children.includes(node.id)) {
          parent.children.push(node.id)
        }
      }
    }
  });

  // 5b. Fix orphan nodes (Nodes with Level > 0 but no parent claiming them)
  // This fixes the "no sub-branches" issue where AI makes Level 2 nodes but forgets to link them
  
  // Find all nodes that are NOT claimed as children by anyone
  const claimedChildren = new Set<string>();
  parsed.nodes.forEach((node: any) => {
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((childId: string) => {
        if (validIds.has(childId)) {
          claimedChildren.add(childId);
        }
      });
    } else {
      node.children = []; // Ensure array exists
    }
  });

  // Link orphans to the nearest valid parent of (level - 1)
  // We iterate through nodes to maintain "context" (assuming AI outputs in logical order)
  let lastLevel0: any = parsed.nodes.find((n: any) => n.level === 0);
  let lastLevel1: any = null;
  let lastLevel2: any = null;

  parsed.nodes.forEach((node: any) => {
    // Update context
    if (node.level === 0) lastLevel0 = node;
    if (node.level === 1) lastLevel1 = node;
    if (node.level === 2) lastLevel2 = node;

    // Skip center node
    if (node.level === 0) return;

    // If node is already claimed, we're good
    if (claimedChildren.has(node.id)) return;

    // ORPHAN DETECTED - Let's adopt it
    console.log(`🔧 Repair: Linking orphan node "${node.label}" (Level ${node.level})`);

    if (node.level === 1) {
      // Level 1 nodes attach to Center
      if (lastLevel0) {
        lastLevel0.children.push(node.id);
        claimedChildren.add(node.id);
      }
    } else if (node.level === 2) {
      // Level 2 nodes attach to last Level 1
      if (lastLevel1) {
        lastLevel1.children.push(node.id);
        claimedChildren.add(node.id);
      } else if (lastLevel0) {
        // Fallback to center if no level 1 seen yet
        node.level = 1; // Demote to level 1
        lastLevel0.children.push(node.id);
        claimedChildren.add(node.id);
      }
    } else if (node.level >= 3) {
      // Deeper nodes attach to last Level 2
      if (lastLevel2) {
        lastLevel2.children.push(node.id);
        claimedChildren.add(node.id);
      } else if (lastLevel1) {
        node.level = 2;
        lastLevel1.children.push(node.id);
        claimedChildren.add(node.id);
      }
    }
  });
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
  console.log('=== Attempting alternative parsing (Strategy-based) ===');
  
  // Strategy 1: Regex-based field extraction
  try {
    console.log('Strategy 1: Regex-based field extraction');
    
    const typeMatch = responseText.match(/"type"\s*:\s*"([^"]+)"/);
    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
    
    if (!typeMatch) {
      console.warn('⚠️  Strategy 1: Could not extract type field');
    } else {
      console.log('✓ Strategy 1: Found type:', typeMatch[1]);
      
      // Try to extract nodes array with better bracket matching
      const nodesArrayMatch = extractNodesArray(responseText);
      
      if (nodesArrayMatch) {
        console.log('✓ Strategy 1: Found nodes array');
        
        // Parse the nodes array
        const nodeObjects = parseNodesArray(nodesArrayMatch);
        
        if (nodeObjects.length > 0) {
          console.log('✓ Strategy 1 succeeded: extracted', nodeObjects.length, 'nodes');
          
          // Build minimal valid infographic
          return {
            type: typeMatch[1],
            title: titleMatch ? titleMatch[1] : 'Untitled Infographic',
            nodes: nodeObjects,
            connections: [],
            confidence: 0.5,
            reasoning: 'Recovered via alternative parsing'
          };
        } else {
          console.warn('⚠️  Strategy 1: No valid nodes could be extracted');
        }
      } else {
        console.warn('⚠️  Strategy 1: Could not extract nodes array');
      }
    }
  } catch (error) {
    console.error('❌ Strategy 1 failed:', error);
  }
  
  // Strategy 2: Try to parse individual node objects scattered in text
  try {
    console.log('Strategy 2: Extract individual node objects from text');
    
    const allObjects = extractNestedObjects(responseText);
    console.log(`Found ${allObjects.length} potential objects in response`);
    
    const validNodes: any[] = [];
    
    for (let i = 0; i < allObjects.length; i++) {
      try {
        const cleaned = cleanJsonString(allObjects[i]);
        const obj = JSON.parse(cleaned);
        
        // Check if this looks like a node (has label or id)
        if (obj.label || obj.id) {
          if (!obj.id) obj.id = generateNodeId(obj.label || `node_${i}`, i);
          if (!obj.label) obj.label = obj.id;
          validNodes.push(obj);
        }
      } catch {
        // Skip invalid objects
      }
    }
    
    if (validNodes.length >= 2) {
      console.log('✓ Strategy 2 succeeded: extracted', validNodes.length, 'nodes');
      
      // Try to extract type, or default to mindmap
      const typeMatch = responseText.match(/"type"\s*:\s*"([^"]+)"/);
      const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
      
      return {
        type: typeMatch ? typeMatch[1] : 'mindmap',
        title: titleMatch ? titleMatch[1] : 'Untitled Infographic',
        nodes: validNodes,
        connections: [],
        confidence: 0.4,
        reasoning: 'Recovered via object extraction'
      };
    } else {
      console.warn('⚠️  Strategy 2: Not enough valid nodes found:', validNodes.length);
    }
  } catch (error) {
    console.error('❌ Strategy 2 failed:', error);
  }
  
  console.error('❌ All alternative parsing strategies failed');
  return null;
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
  } catch {
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
    } catch {
      console.warn('⚠️  Failed to parse node:', nodeStr.substring(0, 100));
    }
  }
  
  return nodes;
}

/**
 * Generate a minimal valid infographic structure as a last resort fallback
 */
export function generateFallbackInfographic(summaryText: string): any {
  console.log('=== Generating fallback infographic structure ===');
  
  // Extract clean sentences
  const sentences = summaryText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5 && s.length < 200); // Filter out noise
    
  // Need at least a few sentences
  if (sentences.length < 3) {
    const words = summaryText.split(/\s+/).filter(w => w.length > 4);
    // If really short, just use words
    sentences.push(...words.slice(0, 8));
  }
  
  const nodes: any[] = [];
  
  // 1. Center Node (First sentence or title)
  const centerText = sentences[0] || 'Summary Overview';
  const centerLabel = centerText.length > 35 ? centerText.substring(0, 35) + '...' : centerText;
  
  nodes.push({
    id: 'center',
    label: centerLabel,
    level: 0,
    color: '#3b82f6',
    description: centerText.length > 35 ? centerText : undefined,
    children: []
  });

  // 2. Identify Branches (Level 1)
  // We'll take the next 3-5 sentences as main branches
  const branchCount = Math.min(5, Math.max(3, Math.floor(sentences.length / 3)));
  const branchSentences = sentences.slice(1, 1 + branchCount);
  
  const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  branchSentences.forEach((text, i) => {
    const id = `branch_${i}`;
    const label = text.length > 30 ? text.substring(0, 30) + '...' : text;
    
    nodes.push({
      id,
      label,
      level: 1,
      color: colors[i % colors.length],
      description: text.length > 30 ? text : undefined,
      children: []
    });
    
    // Link to center
    nodes[0].children.push(id);
  });

  // 3. Create Sub-branches (Level 2)
  // Distribute remaining sentences among branches
  const remainingSentences = sentences.slice(1 + branchCount);
  
  remainingSentences.forEach((text, i) => {
    // Round-robin assignment to branches
    const branchIndex = i % branchSentences.length;
    const branchId = `branch_${branchIndex}`;
    const parent = nodes.find(n => n.id === branchId);
    
    if (parent) {
      const id = `sub_${i}`;
      const label = text.length > 25 ? text.substring(0, 25) + '...' : text;
      
      nodes.push({
        id,
        label,
        level: 2,
        description: text.length > 25 ? text : undefined
      });
      
      parent.children.push(id);
    }
  });

  // If we have very few nodes, try to extract keywords from branches to make sub-nodes
  if (remainingSentences.length === 0 && branchSentences.length > 0) {
    branchSentences.forEach((text, i) => {
      const parent = nodes.find(n => n.id === `branch_${i}`);
      if (!parent) return;
      
      // Extract comma-separated parts or long words
      const parts = text.split(/,|;/).map(p => p.trim()).filter(p => p.length > 4);
      if (parts.length > 1) {
        // Use parts as sub-nodes
        parts.slice(1).forEach((part, j) => {
          const id = `sub_extracted_${i}_${j}`;
          nodes.push({
            id,
            label: part.substring(0, 25),
            level: 2
          });
          parent.children.push(id);
        });
      }
    });
  }
  
  return {
    type: 'mindmap',
    title: 'Summary Overview',
    subtitle: 'Generated from key points',
    confidence: 0.5,
    reasoning: 'Fallback structure with hierarchy',
    nodes: nodes
  };
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
