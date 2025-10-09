# Infographic JSON Parsing Improvements

## Problem
Gemini AI was returning malformed JSON that couldn't be parsed, resulting in errors like:
```
SyntaxError: Expected ',' or ']' after array element in JSON at position 3270
```

This happened because:
1. LLMs sometimes include trailing commas in arrays/objects
2. Response might include markdown code blocks (```json)
3. Comments or improperly quoted fields
4. Unbalanced brackets

## Solutions Implemented

### 1. Enhanced JSON Cleaning Function
**Location:** `src/lib/infographicPromptBuilder.ts` - `cleanJsonString()`

**Features:**
- Removes trailing commas before closing brackets (`,]` → `]`)
- Strips JavaScript comments (`//` and `/* */`)
- Fixes unquoted object keys
- Normalizes whitespace
- Removes markdown code fences

**Example:**
```javascript
// Before:
{
  "nodes": [
    {"id": "a", "label": "A"},  // trailing comma
  ],
  color: "#fff"  // unquoted key
}

// After:
{
  "nodes": [
    {"id": "a", "label": "A"}
  ],
  "color": "#fff"
}
```

### 2. Fallback Alternative Parsing
**Location:** `src/lib/infographicPromptBuilder.ts` - `tryAlternativeParsing()`

When standard JSON.parse fails, this function:
- Uses regex to extract essential fields (type, title, nodes)
- Parses individual node objects separately
- Skips malformed nodes but saves valid ones
- Builds a minimal valid infographic structure
- Returns with reduced confidence (0.5)

This ensures that even if the JSON is partially malformed, we can still extract useful data.

### 3. Improved Prompts
**Location:** All prompt builder functions in `src/lib/infographicPromptBuilder.ts`

**Added explicit instructions:**
```
IMPORTANT: Return ONLY valid, well-formed JSON. 
- No markdown code blocks (no ```)
- No trailing commas
- No comments
- All strings must use double quotes
- Ensure all arrays and objects are properly closed
- Test that your JSON is valid before responding
```

This instructs Gemini to be more careful about JSON formatting.

### 4. Enhanced Logging
**Location:** `src/lib/infographicService.ts`

**Added debug logging:**
- Response length
- Response preview (first 200 chars)
- Detailed error messages showing what failed
- Logs from alternative parsing attempts

This helps diagnose issues when they occur.

## How It Works

### Normal Flow:
1. Gemini generates JSON response
2. `extractAndValidateJSON()` cleans markdown wrappers
3. `cleanJsonString()` fixes common formatting issues
4. `JSON.parse()` parses the cleaned string
5. Validation ensures required fields exist
6. Returns valid infographic spec

### Fallback Flow (when parsing fails):
1. Normal parsing fails with SyntaxError
2. `tryAlternativeParsing()` is called
3. Extract essential fields with regex
4. Parse individual nodes separately
5. Build minimal valid structure
6. Return with lower confidence

## Testing

To test the improvements:

1. **Generate an infographic** from the gallery
2. **Check console logs** for:
   ```
   Generating infographic with Gemini...
   Gemini response length: XXX chars
   Response preview: {...
   ```

3. **If parsing fails:**
   ```
   Failed to parse infographic JSON: SyntaxError...
   Response text (first 500 chars): ...
   Attempting alternative JSON parsing...
   ```

4. **Success indicators:**
   - No parse errors in console
   - Infographic renders correctly
   - All nodes have labels and IDs

## Common Issues and Solutions

### Issue: "Expected ',' or ']'"
**Cause:** Trailing comma in array  
**Solution:** `cleanJsonString()` removes trailing commas automatically

### Issue: "Unexpected token '/'"
**Cause:** Comments in JSON  
**Solution:** `cleanJsonString()` strips all comments

### Issue: "No JSON object found"
**Cause:** Response is plain text or incomplete  
**Solution:** Alternative parser extracts key fields with regex

### Issue: "Infographic has no nodes"
**Cause:** Invalid node structure  
**Solution:** Validation catches this, alternative parser tries to salvage nodes

## Model Configuration

**Current model:** `gemini-2.5-flash`

**Generation config:**
```javascript
{
  temperature: 0.3,     // Lower = more consistent
  topP: 0.85,
  topK: 40,
  maxOutputTokens: 4096
}
```

Lower temperature helps with structured output consistency.

## Future Improvements

1. **JSON Schema Validation:** Use a proper JSON schema validator
2. **Retry Logic:** Automatically retry with simplified prompt if parsing fails
3. **Prompt Tuning:** Further refine prompts based on failure patterns
4. **Model Comparison:** Test different Gemini models for JSON reliability
5. **Structured Output Mode:** Use Gemini's structured output feature if available

## Related Files

- `src/lib/infographicPromptBuilder.ts` - Prompt generation and JSON parsing
- `src/lib/infographicService.ts` - Gemini API integration
- `src/components/Infographics/InfographicGallery.tsx` - UI that triggers generation
- `INFOGRAPHIC_TYPESCRIPT_FIXES.md` - TypeScript and model version fixes

## Summary

These improvements make the infographic generation much more resilient to JSON formatting issues from Gemini. The combination of:
- Better prompts
- Aggressive JSON cleaning
- Alternative parsing fallback
- Detailed logging

...ensures that most responses can be successfully parsed, and when they can't, we get useful debugging information.
