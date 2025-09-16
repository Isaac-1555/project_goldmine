/**
 * Types and interfaces for the enhanced summary generation system
 * with support for copyable content blocks
 */

// Content block types
export type BlockType = 'code' | 'math' | 'special' | 'text';

// Language types for code highlighting
export type CodeLanguage = 
  | 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'c'
  | 'html' | 'css' | 'sql' | 'bash' | 'json' | 'xml' | 'yaml'
  | 'markdown' | 'plaintext';

// Special content types
export type SpecialContentType = 
  | 'terminal' | 'config' | 'data' | 'chemical' | 'other';

/**
 * Code block interface for programming code and snippets
 */
export interface CodeBlock {
  type: 'code';
  language: CodeLanguage;
  content: string;
  title?: string;
  description?: string;
  lineNumbers?: boolean;
  highlightLines?: number[];
}

/**
 * Math block interface for mathematical formulas and equations
 */
export interface MathBlock {
  type: 'math';
  latex: string;
  displayMode?: 'inline' | 'block';
  description?: string;
  variables?: Record<string, string>; // Variable definitions
}

/**
 * Special block for other copyable content
 */
export interface SpecialBlock {
  type: 'special';
  contentType: SpecialContentType;
  content: string;
  format?: 'plain' | 'structured';
  title?: string;
}

/**
 * Text block for regular content
 */
export interface TextBlock {
  type: 'text';
  content: string;
  isHeader?: boolean;
  headerLevel?: 1 | 2 | 3 | 4;
  isList?: boolean;
  listType?: 'bullet' | 'numbered';
}

// Union type for all content blocks
export type ContentBlock = CodeBlock | MathBlock | SpecialBlock | TextBlock;

/**
 * Summary configuration options
 */
export interface SummaryConfig {
  subjectArea: 'STEM' | 'Humanities' | 'Business' | 'Medical' | 'General';
  academicLevel: 'Undergraduate' | 'Graduate' | 'Professional' | 'General';
  summaryType: 'Quick Review' | 'Detailed Study' | 'Exam Preparation' | 'Reference';
  lengthPreference: 'short' | 'standard' | 'detailed';
  includeCodeExamples?: boolean;
  includeMathDerivations?: boolean;
  specialRequirements?: string;
}

/**
 * Structured summary interface
 */
export interface StructuredSummary {
  title: string;
  keyConcepts: KeyConcept[];
  detailedNotes: Section[];
  keyTerms: KeyTerm[];
  practicalApplications: string[];
  summary: string;
  keyTakeaway: string;
  metadata: SummaryMetadata;
  blocks: ContentBlock[];
}

/**
 * Key concept structure
 */
export interface KeyConcept {
  concept: string;
  explanation: string;
  relatedBlocks?: number[]; // Indices of related content blocks
}

/**
 * Section structure for detailed notes
 */
export interface Section {
  title: string;
  content: string;
  blocks: ContentBlock[];
}

/**
 * Key term definition
 */
export interface KeyTerm {
  term: string;
  definition: string;
  context?: string;
}

/**
 * Summary metadata
 */
export interface SummaryMetadata {
  wordCount: number;
  paragraphCount: number;
  codeBlockCount: number;
  mathBlockCount: number;
  generatedAt: string;
  config: SummaryConfig;
}

/**
 * Summary generation request
 */
export interface SummaryGenerationRequest {
  content: string;
  config: SummaryConfig;
  previousSummaryId?: string; // For regeneration
}

/**
 * Summary generation response
 */
export interface SummaryGenerationResponse {
  success: boolean;
  summary?: StructuredSummary;
  rawText?: string;
  error?: string;
  processingTime?: number;
}

/**
 * Copy event tracking
 */
export interface CopyEvent {
  blockType: BlockType;
  content: string;
  timestamp: string;
  userId?: string;
}

/**
 * Summary quality metrics
 */
export interface SummaryQualityMetrics {
  completeness: number; // 0-100
  accuracy: number; // 0-100
  clarity: number; // 0-100
  structure: number; // 0-100
  technicalPrecision: number; // 0-100
  lengthCompliance: boolean;
  overallScore: number; // 0-100
}

/**
 * User preferences for summary display
 */
export interface SummaryDisplayPreferences {
  codeTheme: 'dark' | 'light' | 'auto';
  mathRenderer: 'katex' | 'mathjax';
  fontSize: 'small' | 'medium' | 'large';
  copyButtonBehavior: 'always' | 'hover';
  showLineNumbers: boolean;
  enableSyntaxHighlighting: boolean;
}