import type { SummaryConfig } from '../types/summaryTypes'

export interface TagPromptOptions {
  contentType: string
  subjectArea: SummaryConfig['subjectArea'] | string
  academicLevel: SummaryConfig['academicLevel'] | string
}

// Builds a tag-generation prompt that places instructions before the context,
// mirroring the summary prompt flow.
export function buildTagGenerationPrompt(
  content: string,
  opts?: Partial<TagPromptOptions>
): string {
  const options: TagPromptOptions = {
    contentType: opts?.contentType || 'transcript',
    subjectArea: (opts?.subjectArea as any) || 'General',
    academicLevel: (opts?.academicLevel as any) || 'Undergraduate',
  }

  const prompt = `
You are an advanced educational AI assistant specialized in generating categorized tags for academic and professional content. Your tags must be:
- Hierarchically organized (general → specific)
- Academically accurate and relevant
- Optimized for search and categorization
- Consistently formatted and lowercase

Generate categorized tags for the following content. You must return EXACTLY the specified number of tags in each category, formatted as a JSON object.

### TAG CATEGORIZATION REQUIREMENTS:

#### GENERAL TAGS (3-5 tags required):
- Broad subject areas and disciplines
- High-level conceptual categories
- Academic fields and domains
- Universal themes that apply across contexts
- Examples: "computer science", "architecture", "business", "engineering", "healthcare"

#### SPECIFIC TAGS (6-8 tags required):
- Detailed technical terms and concepts
- Specific tools, technologies, or methodologies
- Named entities, brands, or proper nouns
- Implementation-specific details
- Examples: "react", "javascript", "tallest building", "machine learning", "financial analysis"

### FORMATTING REQUIREMENTS:

1. **Output Format**: Return tags as a valid JSON object with this exact structure:
\`\`\`json
{
  "general": ["tag1", "tag2", "tag3"],
  "specific": ["tag4", "tag5", "tag6", "tag7", "tag8", "tag9"]
}
\`\`\`

2. **Tag Format Rules**:
   - All tags must be lowercase
   - Use simple phrases (1-3 words maximum)
   - No special characters except hyphens and spaces
   - Be descriptive but concise
   - Avoid redundancy between categories

3. **Content Coverage**:
   - Tags should comprehensively represent the content
   - Cover main topics, subtopics, and key concepts
   - Include both theoretical and practical aspects
   - Balance breadth (general) with depth (specific)

### CLASSIFICATION GUIDELINES:

#### General Tags Should Be:
✅ **Domain-level**: "web development" vs "react component"
✅ **Field-wide**: "artificial intelligence" vs "neural networks" 
✅ **Conceptual**: "sustainability" vs "solar panels"
✅ **Transferable**: "project management" vs "scrum methodology"

#### Specific Tags Should Be:
✅ **Implementation-focused**: "react hooks" vs "web development"
✅ **Technology-specific**: "postgresql" vs "databases"
✅ **Detail-oriented**: "burj khalifa" vs "architecture"
✅ **Context-dependent**: "quarterly earnings" vs "business analysis"

### CONTENT TO ANALYZE:
${content}

### ADDITIONAL CONTEXT:
- Content Type: ${options.contentType}
- Subject Area: ${options.subjectArea}
- Academic Level: ${options.academicLevel}

### OUTPUT INSTRUCTIONS:
Return ONLY the JSON object with the categorized tags. Do not include any other text, explanations, or formatting. The JSON must be valid and parseable.

Expected output format:
\`\`\`json
{
  "general": ["tag1", "tag2", "tag3", "tag4"],
  "specific": ["tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11"]
}
\`\`\`
`;

  return prompt
}
