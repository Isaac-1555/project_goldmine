# Summary Prompt Template for Educational Content

## System Context Instructions (Pre-prompt)

```
You are an advanced educational AI assistant specialized in creating comprehensive study summaries for college students. Your summaries must be:
- Academically rigorous and accurate
- Clearly structured using proven educational frameworks
- Optimized for quick review and long-term retention
- Formatted with special attention to technical content (code, formulas, equations)
```

## Main Summary Generation Prompt Template

```
Create a comprehensive study summary from the following educational content. Follow these EXACT requirements:

### STRUCTURAL REQUIREMENTS:

1. **Format Structure**: Use the Cornell Method adapted for digital content
   - Main Notes Section: Core concepts and explanations
   - Key Terms Section: Important vocabulary and definitions
   - Summary Section: Concise synthesis of main ideas

2. **Length Parameters**:
   - Total length: 300-500 words (optimal for retention)
   - Paragraph structure: 3-5 paragraphs
   - Each paragraph: 4-6 sentences (100-200 words)
   - Summary represents 10-15% of original content length

3. **Hierarchical Organization**:
   - Start with general concepts
   - Progress to specific details
   - Use clear section headers
   - Maintain logical flow between sections

### CONTENT FORMATTING REQUIREMENTS:

#### CODE BLOCKS:
Any code snippets, commands, or programming examples MUST be formatted in copyable code blocks:

```[language]
// Code here with proper syntax highlighting
// Each code block should be complete and runnable
// Include necessary imports/dependencies
```

- Use appropriate language identifier (python, javascript, java, etc.)
- Ensure proper indentation is preserved
- Include inline comments for clarity
- Make code blocks self-contained when possible

#### MATHEMATICAL CONTENT:
Mathematical formulas, equations, and expressions MUST be in copyable math blocks:

```math
// LaTeX formatted equations
// Example: \frac{d}{dx}(x^2) = 2x
// Each formula on its own line for clarity
```

- Use LaTeX notation for all mathematical expressions
- Separate complex equations into steps
- Include variable definitions
- Group related formulas together

#### SPECIAL CONTENT BOXES:
For other copyable content (chemical formulas, data tables, terminal commands):

```special
// Special content that needs exact copying
// Such as: configuration files, JSON data, terminal commands
// Preserve exact formatting and spacing
```

### OUTPUT STRUCTURE:

## 📚 KEY CONCEPTS
[3-5 main concepts, each with a brief explanation]
• **Concept 1**: Clear explanation (2-3 sentences)
• **Concept 2**: Clear explanation (2-3 sentences)
• **Concept 3**: Clear explanation (2-3 sentences)

## 📝 DETAILED NOTES

### Topic/Section 1
[Comprehensive explanation with examples]
- Include relevant details and context
- Use bullet points for clarity
- Integrate any code/math blocks here if applicable

```code
// Any relevant code examples
```

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
   - ALWAYS use code blocks for any code (even single lines)
   - ALWAYS use math blocks for formulas
   - NEVER write code or formulas in plain text
   - Preserve exact syntax and formatting

4. **Clarity Requirements**:
   - Use clear, concise language
   - Avoid unnecessary jargon
   - Define technical terms on first use
   - Maintain consistent terminology throughout

### CONTENT TO SUMMARIZE:
{content}

### ADDITIONAL CONTEXT:
- Subject Area: {subject_area}
- Academic Level: {academic_level}
- Summary Type: {summary_type}
- Special Requirements: {special_requirements}
```

## Configuration Parameters

The prompt template supports the following dynamic parameters:

- `{content}`: The actual notebook/document content to summarize
- `{subject_area}`: STEM, Humanities, Business, etc.
- `{academic_level}`: Undergraduate, Graduate, Professional
- `{summary_type}`: Quick Review, Detailed Study, Exam Preparation
- `{special_requirements}`: Any specific formatting or content requirements

## Summary Quality Metrics

Generated summaries should meet these quality standards:

1. **Completeness**: Covers all major topics from source material
2. **Accuracy**: No factual errors or misrepresentations
3. **Clarity**: Easy to understand without referring to original
4. **Structure**: Follows prescribed format exactly
5. **Technical Precision**: Code and formulas are syntactically correct
6. **Length Compliance**: Within specified word count range

## Example Prompt Usage

```javascript
const summaryPrompt = buildSummaryPrompt({
  content: notebookContent,
  subject_area: "Computer Science",
  academic_level: "Undergraduate",
  summary_type: "Detailed Study",
  special_requirements: "Focus on algorithms and data structures"
});
```

## Special Handling Instructions

### For Code-Heavy Content:
- Group related code snippets together
- Provide context before each code block
- Include execution output if relevant
- Explain complex logic step-by-step

### For Math-Heavy Content:
- Define all variables before use
- Show derivation steps for complex formulas
- Group related equations
- Include units where applicable

### For Mixed Content:
- Balance theory with practical examples
- Alternate between explanation and technical blocks
- Maintain narrative flow despite block interruptions
- Use transitions between different content types