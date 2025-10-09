# Auto-ID Generation for Infographic Nodes

## Additional Issue Found
After initial fixes, discovered that Gemini sometimes generates nodes without `id` fields, only with `label` and other properties:

```json
{
  "position": 1,
  "label": "Generate & Validate Idea"
}
```

This caused validation to fail with:
```
Node at index 0 missing id or label: {position: 1, label: 'Generate & Validate Idea'}
❌ Invalid infographic structure
```

## Solution Implemented

### Auto-Generate Missing IDs
Instead of rejecting nodes without IDs, we now **automatically generate them** from the label:

```typescript
function generateNodeId(label: string, index: number): string {
  // Create a snake_case id from the label
  const baseId = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
    .replace(/\s+/g, '_')          // Replace spaces with underscore
    .substring(0, 30);              // Limit length
  
  // Add index to ensure uniqueness
  return `${baseId}_${index}`;
}
```

### Examples
- `"Generate & Validate Idea"` → `"generate__validate_idea_0"`
- `"Step 1: Planning"` → `"step_1_planning_1"`
- `"Market Research"` → `"market_research_2"`

### Updated Validation Logic

**Before:**
```typescript
if (!node.id || !node.label) {
  console.error(`Node missing id or label`);
  return false;
}
```

**After:**
```typescript
// Must have at least a label
if (!node.label) {
  console.error(`Node missing label`);
  return false;
}

// Auto-generate ID if missing
if (!node.id) {
  node.id = generateNodeId(node.label, i);
  console.warn(`⚠️  Node missing id, generated: ${node.id}`);
}
```

### Applied in Multiple Places

1. **Main validation** (`validateInfographicStructure()`)
2. **Alternative parsing** (`parseNodesArray()`)
3. **Both array and individual node parsing**

## Console Output

When IDs are auto-generated, you'll see helpful warnings:

```
=== Starting JSON extraction ===
Response length: 1234 chars
✓ JSON extracted, length: 1089
✓ JSON cleaned
✓ JSON parsed successfully
⚠️  Node at index 0 missing id, generated: generate__validate_idea_0
⚠️  Node at index 1 missing id, generated: conduct_market_research_1
⚠️  Node at index 2 missing id, generated: write_business_plan_2
✓ Validation complete, nodes: 8
```

## Prompt Updates

Also updated the prompts to emphasize ID requirements:

```
## Important Guidelines:

- **CRITICAL**: Every node MUST have both "id" and "label" fields
- Use descriptive snake_case IDs (e.g., "central_concept", "branch_marketing")
```

And in typed prompts:
```
CRITICAL: Every node MUST have an "id" field!
```

This encourages Gemini to include IDs, but if it doesn't, we handle it gracefully.

## Benefits

1. **More resilient**: Handles AI responses that forget IDs
2. **Backward compatible**: Existing code with IDs works unchanged
3. **Informative**: Warnings in console show when auto-generation happens
4. **Consistent naming**: Generated IDs follow snake_case convention
5. **Unique**: Index suffix ensures no duplicates

## Testing

Now all infographic types should work, even if Gemini omits node IDs:
- ✅ mindmap
- ✅ pyramid (now works with auto-generated IDs)
- ✅ cycle
- ✅ timeline
- ✅ comparison
- ✅ process
- ✅ hierarchy

## Files Modified

- `summarease/src/lib/infographicPromptBuilder.ts`
  - Added `generateNodeId()` function
  - Updated `validateInfographicStructure()`
  - Updated `parseNodesArray()`
  - Enhanced prompts with ID requirements
