import type { SummaryConfig } from '../types/summaryTypes';

/**
 * Builds an enhanced summary prompt using the template and configuration
 */
export function buildEnhancedSummaryPrompt(
  content: string, 
  config?: Partial<SummaryConfig>
): string {
  // Default configuration
  const defaultConfig: SummaryConfig = {
    subjectArea: 'General',
    academicLevel: 'Undergraduate',
    summaryType: 'Detailed Study',
    lengthPreference: 'standard',
    includeCodeExamples: true,
    includeMathDerivations: true,
    includeInfographics: false,
    llmProvider: 'gemini',
    specialRequirements: ''
  };

  // Merge with provided config
  const finalConfig = { ...defaultConfig, ...config };

  // Build the main prompt
  const prompt = `
You are an advanced educational AI assistant specialized in creating comprehensive study summaries for college students. Your summaries must be:
- Academically rigorous and accurate
- Clearly structured using proven educational frameworks
- Optimized for quick review and long-term retention
- Formatted with special attention to technical content (code, formulas, equations)

Create a comprehensive study summary from the following educational content. Follow these EXACT requirements:

### STRUCTURAL REQUIREMENTS:

1. **Format Structure**: Use the Cornell Method adapted for digital content
   - Main Notes Section: Core concepts and explanations
   - Key Terms Section: Important vocabulary and definitions
   - Summary Section: Concise synthesis of main ideas

2. **Length Parameters**:
   ${getLengthParameters(finalConfig.lengthPreference)}

3. **Hierarchical Organization**:
   - Start with general concepts
   - Progress to specific details
   - Use clear section headers
   - Maintain logical flow between sections

### CONTENT FORMATTING REQUIREMENTS:

#### CODE BLOCKS:
${finalConfig.includeCodeExamples ? `
Any programming code snippets or shell commands should be formatted in copyable fenced code blocks. Do NOT use code blocks for non-code content.

Example format:

\`\`\`[language]
// Code here with proper syntax highlighting
\`\`\`

- Use an appropriate language identifier (python, javascript, bash, etc.)
- Ensure proper indentation is preserved
- Include inline comments for clarity when helpful
- Make code blocks self-contained when possible
` : 'Minimize code examples and focus on conceptual understanding.'}

#### MATHEMATICAL CONTENT:
${finalConfig.includeMathDerivations ? `
Use LaTeX for mathematical expressions. Prefer inline $...$ or display $$...$$ blocks. Do NOT use fenced code blocks for math.

Guidelines:
- Use LaTeX notation for all mathematical expressions
- Use inline $a^2 + b^2 = c^2$ for short expressions
- Use display math with $$ ... $$ for multi-line derivations
- Separate complex equations into steps and define variables
` : 'Include only essential formulas without detailed derivations.'}

#### SPECIAL CONTENT:
Only use fenced code blocks when content truly requires exact copying (e.g., shell commands, JSON, YAML, config files). Use an appropriate language tag like bash, json, or yaml. Do NOT wrap ordinary prose or lists in code fences.

${finalConfig.includeInfographics ? `#### INFOGRAPHICS AND VISUAL CONTENT:
When the content would benefit from visual representation, add a plain-text Infographic Specification section (no code block):

Infographic Spec:
- Type: [flowchart|mindmap|timeline|comparison|hierarchy|process|chart]
- Title: <brief title>
- Description: <what the graphic should show>
- Elements: <bullet list of key components or data points>
- Relationships: <how elements connect or relate>
- Data: <for charts only, provide either bullet pairs like "Label: 12" or a JSON array such as [{ "name": "Label", "value": 12 }]>

Examples of when to include infographics:
- Process flows or algorithms (use flowchart)
- Concept relationships (use mindmap)
- Historical sequences or project timelines (use timeline)
- Comparing multiple items or concepts (use comparison)
- Organizational structures or taxonomies (use hierarchy)
- Step-by-step procedures (use process diagram)
- Numerical data or trends (use chart; prefer bars/lines unless part-to-whole → donut)

Ensure infographics are:
- Directly relevant to the content
- Enhance understanding rather than duplicate text
- Include clear labels and descriptions
- Specify colors or visual emphasis where important
` : ''}

### OUTPUT STRUCTURE:

## 📚 KEY CONCEPTS
[3-5 main concepts based on content length]
• **Concept 1**: Clear explanation (2-3 sentences)
• **Concept 2**: Clear explanation (2-3 sentences)
• **Concept 3**: Clear explanation (2-3 sentences)

## 📝 DETAILED NOTES

### Topic/Section 1
[Comprehensive explanation with examples]
- Include relevant details and context
- Use bullet points for clarity
${finalConfig.includeCodeExamples ? '- Integrate any code/math blocks here if applicable' : ''}

### Topic/Section 2
[Continue with structured content]

## 🔑 KEY TERMS & DEFINITIONS
• **Term 1**: Precise definition
• **Term 2**: Precise definition
• **Term 3**: Precise definition
[Include 5-10 most important terms]

## 💡 PRACTICAL APPLICATIONS
• Real-world use cases
• How concepts connect to broader topics
• Implementation considerations
• Common pitfalls to avoid

## 📋 SUMMARY
[2-3 sentence synthesis capturing the essence of all content]
Key takeaway: [One sentence capturing the most important point]

### FORMATTING RULES:

1. **Visual Enhancement**:
   - Bold all key terms on first mention: **term**
   - Use emoji headers for visual navigation
   - Maintain consistent bullet point format (•)
   - Add line breaks between major sections

2. **Content Prioritization**:
   - Focus on understanding over memorization
   - Include concrete examples
   - Connect concepts to practical applications
   - Highlight relationships between ideas

3. **Technical Content Handling**:
   ${finalConfig.includeCodeExamples || finalConfig.includeMathDerivations ? `
   - Use fenced code blocks ONLY for actual programming code or shell commands
   - For math, use inline $...$ or display $$...$$ LaTeX (no fenced code blocks)
   - Do NOT place non-code content (e.g., outlines, infographic specs) inside code fences
   - Preserve exact syntax and formatting when code blocks are used
   ` : '- Focus on conceptual understanding of technical content'}

4. **Clarity Requirements**:
   - Use clear, concise language
   - Avoid unnecessary jargon
   - Define technical terms on first use
   - Maintain consistent terminology throughout

### CONTENT TO SUMMARIZE:
${content}

### ADDITIONAL CONTEXT:
- Subject Area: ${finalConfig.subjectArea}
- Academic Level: ${finalConfig.academicLevel}
- Summary Type: ${finalConfig.summaryType}
${finalConfig.specialRequirements ? `- Special Requirements: ${finalConfig.specialRequirements}` : ''}
`;

  return prompt;
}

/**
 * Get length parameters based on preference
 */
function getLengthParameters(preference: 'short' | 'standard' | 'detailed'): string {
  switch (preference) {
    case 'short':
      return `
   - Total length: 200-300 words (quick review)
   - Paragraph structure: 2-3 paragraphs
   - Each paragraph: 3-4 sentences (75-100 words)
   - Summary represents 5-10% of original content length`;
    
    case 'detailed':
      return `
   - Total length: 500-700 words (comprehensive study)
   - Paragraph structure: 4-6 paragraphs
   - Each paragraph: 5-7 sentences (100-150 words)
   - Summary represents 15-20% of original content length`;
    
    case 'standard':
    default:
      return `
   - Total length: 300-500 words (optimal for retention)
   - Paragraph structure: 3-5 paragraphs
   - Each paragraph: 4-6 sentences (100-200 words)
   - Summary represents 10-15% of original content length`;
  }
}

/**
 * Build a simplified prompt for quick summaries
 */
export function buildQuickSummaryPrompt(content: string): string {
  return buildEnhancedSummaryPrompt(content, {
    lengthPreference: 'short',
    includeCodeExamples: false,
    includeMathDerivations: false,
    summaryType: 'Quick Review'
  });
}

/**
 * Build a technical-focused prompt with emphasis on code and math
 */
export function buildTechnicalSummaryPrompt(content: string, subjectArea: 'STEM' | 'General' = 'STEM'): string {
  return buildEnhancedSummaryPrompt(content, {
    subjectArea,
    lengthPreference: 'detailed',
    includeCodeExamples: true,
    includeMathDerivations: true,
    summaryType: 'Reference',
    specialRequirements: 'Emphasize technical implementation details, code examples, and mathematical derivations'
  });
}