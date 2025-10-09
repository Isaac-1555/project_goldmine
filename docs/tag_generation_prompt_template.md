# Tag Generation Prompt Template for Educational Content

## System Context Instructions (Pre-prompt)

```
You are an advanced educational AI assistant specialized in generating categorized tags for academic and professional content. Your tags must be:
- Hierarchically organized (general → specific)
- Academically accurate and relevant
- Optimized for search and categorization
- Consistently formatted and lowercase
```

## Main Tag Generation Prompt Template

```
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
```json
{
  "general": ["tag1", "tag2", "tag3"],
  "specific": ["tag4", "tag5", "tag6", "tag7", "tag8", "tag9"]
}
```

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

### EXAMPLES BY CONTENT TYPE:

#### Software Development Content:
```json
{
  "general": ["web development", "software engineering", "computer science"],
  "specific": ["react", "typescript", "api integration", "responsive design", "webpack", "testing frameworks"]
}
```

#### Architecture Content:
```json
{
  "general": ["architecture", "construction", "engineering", "design"],
  "specific": ["skyscraper", "steel framework", "foundation systems", "building codes", "sustainable design", "urban planning"]
}
```

#### Business Content:
```json
{
  "general": ["business analysis", "finance", "strategy"],
  "specific": ["market research", "competitive analysis", "roi calculation", "swot analysis", "stakeholder management", "budget forecasting"]
}
```

### QUALITY STANDARDS:

1. **Relevance**: All tags must directly relate to the content
2. **Accuracy**: Use correct terminology and spelling
3. **Completeness**: Cover all major themes in the content
4. **Hierarchy**: Maintain clear distinction between general and specific
5. **Searchability**: Choose terms users would likely search for
6. **Consistency**: Use standard academic and professional vocabulary

### CONTENT TO ANALYZE:

{content}

### ADDITIONAL CONTEXT:
- Content Type: {content_type}
- Subject Area: {subject_area}
- Academic Level: {academic_level}

### OUTPUT INSTRUCTIONS:

Return ONLY the JSON object with the categorized tags. Do not include any other text, explanations, or formatting. The JSON must be valid and parseable.

Expected output format:
```json
{
  "general": ["tag1", "tag2", "tag3", "tag4"],
  "specific": ["tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11"]
}
```
```

## Configuration Parameters

The prompt template supports the following dynamic parameters:

- `{content}`: The actual text content to analyze for tag generation
- `{content_type}`: Document type (pdf, docx, transcript, etc.)
- `{subject_area}`: STEM, Humanities, Business, etc.
- `{academic_level}`: Undergraduate, Graduate, Professional

## Tag Quality Metrics

Generated tags should meet these quality standards:

1. **Accuracy**: Correct terminology and conceptual understanding
2. **Relevance**: Direct relationship to the content themes
3. **Hierarchy**: Clear distinction between general and specific levels
4. **Completeness**: Comprehensive coverage of content topics
5. **Searchability**: Terms users would naturally search for
6. **Consistency**: Standard academic/professional vocabulary

## Example Prompt Usage

```javascript
const tagPrompt = buildTagPrompt({
  content: extractedText,
  content_type: "pdf",
  subject_area: "Computer Science", 
  academic_level: "Undergraduate"
});
```

## Special Content Handling

### Code-Heavy Content:
- General: Programming languages, frameworks, concepts
- Specific: Libraries, functions, design patterns, tools

### Research Papers:
- General: Research field, methodology type, academic discipline
- Specific: Algorithms, datasets, experimental methods, findings

### Business Documents:
- General: Business function, industry sector, analysis type
- Specific: Metrics, tools, processes, market segments

### Mixed Content:
- Balance theoretical concepts with practical implementations
- Ensure both abstract and concrete terms are represented
- Maintain subject matter expertise across different domains