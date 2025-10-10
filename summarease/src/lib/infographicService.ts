import { GoogleGenerativeAI } from '@google/generative-ai';
import type { InfographicSpec, InfographicType, InfographicGenerationResult } from './viz/types';
import { 
  buildInfographicExtractionPrompt, 
  buildMindMapPrompt,
  buildTypedInfographicPrompt,
  extractAndValidateJSON,
  generateFallbackInfographic
} from './infographicPromptBuilder';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generate an infographic from summary text using Gemini AI
 * @param summaryText - The text to analyze and convert to infographic
 * @param options - Optional configuration
 * @returns Promise with the generated infographic spec
 */
export async function generateInfographic(
  summaryText: string,
  options?: {
    preferredType?: InfographicType;
    summaryId?: string;
    temperature?: number;
  }
): Promise<InfographicGenerationResult> {
  try {
    if (!API_KEY) {
      return {
        success: false,
        error: 'Gemini API key not configured'
      };
    }

    if (!summaryText || summaryText.trim().length < 50) {
      return {
        success: false,
        error: 'Summary text too short for infographic generation (min 50 chars)'
      };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: options?.temperature ?? 0.3,  // Lower for more consistent structured output
        topP: 0.85,
        topK: 40,
        maxOutputTokens: 4096,
      }
    });

    // Build appropriate prompt
    const prompt = options?.preferredType 
      ? buildTypedInfographicPrompt(summaryText, options.preferredType)
      : buildInfographicExtractionPrompt(summaryText);

    console.log('Generating infographic with Gemini...');
    let parsed = null;
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts && !parsed) {
      attempt++;
      console.log(`Attempt ${attempt}/${maxAttempts}`);
      
      // Adjust prompt and config for retries
      const currentPrompt = attempt === 1 ? prompt : 
        `${prompt}\n\nCRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations. Just raw JSON starting with { and ending with }.`;
      
      const temperature = attempt === 1 ? (options?.temperature ?? 0.3) : 0.1;
      
      const retryModel = attempt === 1 ? model : genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature,
          topP: 0.85,
          topK: 40,
          maxOutputTokens: 4096,
        }
      });
      
      const result = await retryModel.generateContent(currentPrompt);
      const response = result.response.text();
      
      console.log(`Attempt ${attempt} - Response length:`, response.length, 'chars');
      console.log(`Attempt ${attempt} - Response preview:`, response.substring(0, 200));
      
      // Parse and validate JSON response
      parsed = extractAndValidateJSON(response);
      
      if (!parsed && attempt < maxAttempts) {
        console.warn(`⚠️  Attempt ${attempt} failed, retrying with stricter prompt...`);
      }
    }
    
    // If all parsing attempts failed, use fallback
    if (!parsed) {
      console.warn('⚠️  All parsing attempts failed, using fallback structure');
      parsed = generateFallbackInfographic(summaryText);
      
      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse infographic structure from AI response and fallback generation failed'
        };
      }
    }

    // Create the infographic spec
    const spec: InfographicSpec = {
      id: crypto.randomUUID(),
      summaryId: options?.summaryId || '',
      type: parsed.type,
      title: parsed.title || 'Untitled Infographic',
      subtitle: parsed.subtitle,
      nodes: parsed.nodes || [],
      connections: parsed.connections || [],
      metadata: {
        suggestedBy: 'ai',
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    // Validate node structure
    if (!validateInfographicSpec(spec)) {
      return {
        success: false,
        error: 'Generated infographic structure is invalid',
        spec
      };
    }

    return {
      success: true,
      spec
    };
  } catch (error: any) {
    console.error('Error generating infographic:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate infographic'
    };
  }
}

/**
 * Generate a mind map specifically from summary text
 * This is a convenience function for the most commonly used type
 */
export async function generateMindMap(
  summaryText: string,
  summaryId?: string
): Promise<InfographicGenerationResult> {
  try {
    if (!API_KEY) {
      return {
        success: false,
        error: 'Gemini API key not configured'
      };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topP: 0.85,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    const prompt = buildMindMapPrompt(summaryText);
    
    console.log('Generating mind map with Gemini...');
    let parsed = null;
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts && !parsed) {
      attempt++;
      console.log(`Mind map attempt ${attempt}/${maxAttempts}`);
      
      const currentPrompt = attempt === 1 ? prompt :
        `${prompt}\n\nCRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations. Just raw JSON.`;
      
      const temperature = attempt === 1 ? 0.3 : 0.1;
      
      const retryModel = attempt === 1 ? model : genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature,
          topP: 0.85,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });
      
      const result = await retryModel.generateContent(currentPrompt);
      const response = result.response.text();
      
      console.log(`Attempt ${attempt} - Response length:`, response.length, 'chars');
      console.log(`Attempt ${attempt} - Response preview:`, response.substring(0, 200));
      
      parsed = extractAndValidateJSON(response);
      
      if (!parsed && attempt < maxAttempts) {
        console.warn(`⚠️  Mind map attempt ${attempt} failed, retrying...`);
      }
    }
    
    // Use fallback if parsing failed
    if (!parsed) {
      console.warn('⚠️  All mind map parsing attempts failed, using fallback');
      parsed = generateFallbackInfographic(summaryText);
      parsed.type = 'mindmap'; // Ensure it's marked as mindmap
    }
    
    if (!parsed || parsed.type !== 'mindmap') {
      return {
        success: false,
        error: 'Failed to generate valid mind map structure'
      };
    }

    const spec: InfographicSpec = {
      id: crypto.randomUUID(),
      summaryId: summaryId || '',
      type: 'mindmap',
      title: parsed.title || 'Mind Map',
      subtitle: parsed.subtitle,
      nodes: parsed.nodes || [],
      connections: parsed.connections || [],
      metadata: {
        suggestedBy: 'ai',
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    return {
      success: true,
      spec
    };
  } catch (error: any) {
    console.error('Error generating mind map:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate mind map'
    };
  }
}

/**
 * Validate an infographic spec to ensure it has required structure
 */
function validateInfographicSpec(spec: InfographicSpec): boolean {
  // Must have at least one node
  if (!spec.nodes || spec.nodes.length === 0) {
    console.error('Infographic must have at least one node');
    return false;
  }

  // All nodes must have id and label
  for (const node of spec.nodes) {
    if (!node.id || !node.label) {
      console.error('All nodes must have id and label:', node);
      return false;
    }
  }

  // Type-specific validation
  switch (spec.type) {
    case 'mindmap':
      return validateMindMap(spec);
    case 'cycle':
      return validateCycle(spec);
    case 'pyramid':
      return validatePyramid(spec);
    case 'timeline':
      return validateTimeline(spec);
    default:
      // Basic validation passed
      return true;
  }
}

/**
 * Validate mind map structure
 */
function validateMindMap(spec: InfographicSpec): boolean {
  // Must have exactly one center node (level 0)
  const centerNodes = spec.nodes.filter(n => n.level === 0);
  if (centerNodes.length !== 1) {
    console.error('Mind map must have exactly one center node (level=0)');
    return false;
  }

  // Should have primary branches (level 1)
  const primaryBranches = spec.nodes.filter(n => n.level === 1);
  if (primaryBranches.length < 3 || primaryBranches.length > 10) {
    console.warn('Mind map should have 3-10 primary branches, got:', primaryBranches.length);
    // Don't fail, just warn
  }

  return true;
}

/**
 * Validate cycle structure
 */
function validateCycle(spec: InfographicSpec): boolean {
  // Must have connections
  if (!spec.connections || spec.connections.length === 0) {
    console.error('Cycle must have connections between nodes');
    return false;
  }

  // Should have 3-8 nodes
  if (spec.nodes.length < 3 || spec.nodes.length > 8) {
    console.warn('Cycle should have 3-8 nodes, got:', spec.nodes.length);
  }

  return true;
}

/**
 * Validate pyramid structure
 */
function validatePyramid(spec: InfographicSpec): boolean {
  // Must have nodes at different levels
  const levels = new Set(spec.nodes.map(n => n.level).filter(l => l !== undefined));
  if (levels.size < 3) {
    console.error('Pyramid must have at least 3 levels');
    return false;
  }

  return true;
}

/**
 * Validate timeline structure
 */
function validateTimeline(spec: InfographicSpec): boolean {
  // Must have position values for ordering
  const hasPositions = spec.nodes.every(n => n.position !== undefined);
  if (!hasPositions) {
    console.error('Timeline nodes must have position values');
    return false;
  }

  // Should have at least 3 events
  if (spec.nodes.length < 3) {
    console.warn('Timeline should have at least 3 events');
  }

  return true;
}

/**
 * Suggest infographic types based on content analysis
 * This is a simpler, faster check that doesn't use AI
 */
export function suggestInfographicTypes(summaryText: string): InfographicType[] {
  const suggestions: InfographicType[] = [];
  const text = summaryText.toLowerCase();

  // Check for temporal indicators
  if (/\b(19|20)\d{2}\b/.test(text) || /\b(timeline|history|evolution|development|phases?|stages?)\b/.test(text)) {
    suggestions.push('timeline');
  }

  // Check for process/step indicators
  if (/\b(step|stage|phase|first|second|third|next|then|finally|process|procedure|method)\b/.test(text)) {
    suggestions.push('process');
  }

  // Check for cycle indicators
  if (/\b(cycle|loop|recurring|iterative|continuous|feedback|circular)\b/.test(text)) {
    suggestions.push('cycle');
  }

  // Check for hierarchical indicators
  if (/\b(hierarchy|level|tier|pyramid|foundation|base|top|organization|structure)\b/.test(text)) {
    suggestions.push('pyramid');
  }

  // Check for comparison indicators
  if (/\b(versus|vs|compare|comparison|difference|contrast|alternative|option)\b/.test(text)) {
    suggestions.push('comparison');
  }

  // Mind map is always a good fallback for conceptual content
  if (suggestions.length === 0 || /\b(concept|idea|thought|relationship|connection|aspect)\b/.test(text)) {
    suggestions.push('mindmap');
  }

  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Batch generate multiple infographic types
 * Useful for showing user multiple options
 */
export async function generateInfographicVariants(
  summaryText: string,
  types: InfographicType[],
  summaryId?: string
): Promise<InfographicSpec[]> {
  const results = await Promise.all(
    types.map(type => 
      generateInfographic(summaryText, { 
        preferredType: type, 
        summaryId 
      })
    )
  );

  return results
    .filter(r => r.success && r.spec)
    .map(r => r.spec!);
}
