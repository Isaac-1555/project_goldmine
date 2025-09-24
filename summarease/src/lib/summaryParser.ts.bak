import type { ContentBlock, CodeBlock, MathBlock, SpecialBlock, TextBlock } from '../types/summaryTypes';

/**
 * Enhanced content detection utilities
 */
class ContentDetector {
  // Common programming keywords and patterns
  private static readonly CODE_KEYWORDS = [
    'def ', 'function ', 'class ', 'import ', 'from ', 'const ', 'let ', 'var ',
    'public ', 'private ', 'protected ', 'static ', 'async ', 'await ',
    'if ', 'else ', 'for ', 'while ', 'return ', 'yield ', 'break ', 'continue ',
    'try ', 'catch ', 'except ', 'finally ', 'throw ', 'raise ',
    '#!/', '<?php', '<!DOCTYPE', '<html', '<script', '<style'
  ];

  private static readonly CODE_PATTERNS = [
    /^\s*def\s+\w+\s*\(/,           // Python function
    /^\s*function\s+\w+\s*\(/,     // JavaScript function
    /^\s*class\s+\w+/,            // Class definition
    /^\s*import\s+/,              // Import statement
    /^\s*from\s+\w+\s+import/,    // Python import
    /^\s*const\s+\w+\s*=/,        // JavaScript const
    /^\s*let\s+\w+\s*=/,          // JavaScript let
    /^\s*var\s+\w+\s*=/,          // JavaScript var
    /^\s*public\s+\w+/,           // Java/C# public
    /^\s*private\s+\w+/,          // Java/C# private
    /^\s*\w+\s*\([^)]*\)\s*{/,   // Function with braces
    /^\s*if\s*\([^)]*\)\s*{/,    // If statement with braces
    /^\s*for\s*\([^)]*\)\s*{/,   // For loop with braces
    /^\s*while\s*\([^)]*\)\s*{/, // While loop with braces
    /\{[^}]*\}/,                   // Object/block syntax
    /\[[^\]]*\]/,                 // Array syntax
    /=>\s*{/,                     // Arrow function
    /^\s*#include\s*</,           // C/C++ include
    /^\s*using\s+\w+/,            // C# using
    /^\s*package\s+\w+/           // Java package
  ];

  // Mathematical expression patterns
  private static readonly MATH_PATTERNS = [
    /\\frac\{[^}]*\}\{[^}]*\}/,    // LaTeX fractions
    /\\int(_\{[^}]*\})?\^?\{[^}]*\}/, // LaTeX integrals
    /\\sum(_\{[^}]*\})?\^?\{[^}]*\}/, // LaTeX summations
    /\\lim_\{[^}]*\}/,             // LaTeX limits
    /\\sqrt\{[^}]*\}/,             // LaTeX square roots
    /\\[a-zA-Z]+\{[^}]*\}/,       // General LaTeX commands
    /[a-zA-Z]\^\{?[^}\s]+\}?/,    // Exponents
    /[a-zA-Z]_\{?[^}\s]+\}?/,     // Subscripts
    /∫|∑|∏|∆|∇|∂|≤|≥|≠|≈|±/,     // Mathematical symbols
    /α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω/, // Greek letters
    /\b\d+\/\d+\b/,                // Fractions like 1/2
    /\b[f|g|h]\([x|y|z|t]\)/,      // Function notation
    /\bd\/dx\b|\bdy\/dx\b/,         // Derivative notation
    /lim\s*\([^)]*→[^)]*\)/        // Limit notation
  ];

  /**
   * Detect if a text block contains code-like content
   */
  static isCodeLike(text: string): boolean {
    const lines = text.split('\n');
    let codeScore = 0;
    
    // Check for indentation patterns (common in code)
    const indentedLines = lines.filter(line => line.match(/^\s{2,}/));
    if (indentedLines.length > lines.length * 0.3) {
      codeScore += 2;
    }
    
    // Check for code keywords
    const textLower = text.toLowerCase();
    for (const keyword of this.CODE_KEYWORDS) {
      if (textLower.includes(keyword)) {
        codeScore += 1;
      }
    }
    
    // Check for code patterns
    for (const pattern of this.CODE_PATTERNS) {
      if (pattern.test(text)) {
        codeScore += 2;
      }
    }
    
    // Check for typical code syntax
    if (text.includes('{') && text.includes('}')) codeScore += 1;
    if (text.includes('[') && text.includes(']')) codeScore += 1;
    if (text.includes('(') && text.includes(')')) codeScore += 0.5;
    if (text.includes(';')) codeScore += 1;
    if (text.includes('//') || text.includes('#')) codeScore += 1;
    
    return codeScore >= 3;
  }
  
  /**
   * Detect if a text block contains mathematical expressions
   */
  static isMathLike(text: string): boolean {
    let mathScore = 0;
    
    for (const pattern of this.MATH_PATTERNS) {
      if (pattern.test(text)) {
        mathScore += 2;
      }
    }
    
    // Check for equation-like patterns
    if (text.includes('=') && text.match(/[a-zA-Z]\s*=\s*[^a-zA-Z\s]/)) {
      mathScore += 1;
    }
    
    return mathScore >= 2;
  }
  
  /**
   * Determine the programming language from code content
   */
  static detectLanguage(text: string): string {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('def ') && textLower.includes(':')) return 'python';
    if (textLower.includes('function ') || textLower.includes('=>')) return 'javascript';
    if (textLower.includes('public class') || textLower.includes('import java')) return 'java';
    if (textLower.includes('#include') || textLower.includes('std::')) return 'cpp';
    if (textLower.includes('using namespace') || textLower.includes('cout <<')) return 'cpp';
    if (textLower.includes('<html') || textLower.includes('<!doctype')) return 'html';
    if (textLower.includes('select ') || textLower.includes('from ')) return 'sql';
    if (textLower.includes('#!/bin/bash') || textLower.includes('$ ')) return 'bash';
    if (text.includes('{') && text.includes('}') && text.includes('"')) return 'json';
    
    return 'plaintext';
  }
}

/**
 * Post-processes blocks to consolidate code and math content
 */
function postProcessBlocks(blocks: ContentBlock[]): ContentBlock[] {
  const processedBlocks: ContentBlock[] = [];
  let i = 0;
  
  while (i < blocks.length) {
    const currentBlock = blocks[i];
    
    if (currentBlock.type === 'text' && !currentBlock.isHeader) {
      // Check if this text block should be converted to code or math
      if (ContentDetector.isCodeLike(currentBlock.content)) {
        // Look ahead for consecutive code-like blocks
        const codeBlocks = [currentBlock];
        let j = i + 1;
        
        while (j < blocks.length && 
               blocks[j].type === 'text' && 
               !blocks[j].isHeader && 
               ContentDetector.isCodeLike(blocks[j].content)) {
          codeBlocks.push(blocks[j] as TextBlock);
          j++;
        }
        
        // Consolidate into a single code block
        const combinedContent = codeBlocks.map(block => block.content).join('\n');
        const language = ContentDetector.detectLanguage(combinedContent);
        
        const consolidatedCodeBlock: CodeBlock = {
          type: 'code',
          language: language as any,
          content: combinedContent,
          lineNumbers: combinedContent.split('\n').length > 5
        };
        
        processedBlocks.push(consolidatedCodeBlock);
        i = j; // Skip the consolidated blocks
        continue;
      } else if (ContentDetector.isMathLike(currentBlock.content)) {
        // Look ahead for consecutive math-like blocks
        const mathBlocks = [currentBlock];
        let j = i + 1;
        
        while (j < blocks.length && 
               blocks[j].type === 'text' && 
               !blocks[j].isHeader && 
               ContentDetector.isMathLike(blocks[j].content)) {
          mathBlocks.push(blocks[j] as TextBlock);
          j++;
        }
        
        // Consolidate into a single math block
        const combinedContent = mathBlocks.map(block => block.content).join('\n');
        
        const consolidatedMathBlock: MathBlock = {
          type: 'math',
          latex: combinedContent,
          displayMode: 'block'
        };
        
        processedBlocks.push(consolidatedMathBlock);
        i = j; // Skip the consolidated blocks
        continue;
      }
    }
    
    // Keep the block as is
    processedBlocks.push(currentBlock);
    i++;
  }
  
  return processedBlocks;
}

/**
 * Parses a summary text and extracts different types of content blocks
 */
export function parseSummaryContent(summaryText: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  
  // Regular expressions for different block types
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const mathBlockRegex = /```math\n([\s\S]*?)```/g;
  const specialBlockRegex = /```special\n([\s\S]*?)```/g;
  
  // Track positions of all blocks
  const blockPositions: Array<{ start: number; end: number; block: ContentBlock }> = [];
  
  // Extract code blocks
  let match;
  while ((match = codeBlockRegex.exec(summaryText)) !== null) {
    const language = match[1] || 'plaintext';
    const content = match[2].trim();
    
    // Skip if it's actually a math or special block
    if (language === 'math' || language === 'special') continue;
    
    const codeBlock: CodeBlock = {
      type: 'code',
      language: language as any,
      content,
      lineNumbers: content.split('\n').length > 5 // Show line numbers for longer code
    };
    
    blockPositions.push({
      start: match.index,
      end: match.index + match[0].length,
      block: codeBlock
    });
  }
  
  // Reset regex lastIndex
  mathBlockRegex.lastIndex = 0;
  
  // Extract math blocks
  while ((match = mathBlockRegex.exec(summaryText)) !== null) {
    const latex = match[1].trim();
    
    // Parse any variable definitions if they exist
    const variableMatch = latex.match(/where:\s*([\s\S]*?)$/i);
    let variables: Record<string, string> | undefined;
    let cleanLatex = latex;
    
    if (variableMatch) {
      cleanLatex = latex.substring(0, variableMatch.index).trim();
      const varDefs = variableMatch[1].trim().split(/[,;]\s*/);
      variables = {};
      
      varDefs.forEach(def => {
        const [key, value] = def.split('=').map(s => s.trim());
        if (key && value) {
          variables![key] = value;
        }
      });
    }
    
    const mathBlock: MathBlock = {
      type: 'math',
      latex: cleanLatex,
      displayMode: cleanLatex.includes('\\frac') || cleanLatex.includes('\\int') ? 'block' : 'inline',
      variables
    };
    
    blockPositions.push({
      start: match.index,
      end: match.index + match[0].length,
      block: mathBlock
    });
  }
  
  // Reset regex lastIndex
  specialBlockRegex.lastIndex = 0;
  
  // Extract special blocks
  while ((match = specialBlockRegex.exec(summaryText)) !== null) {
    const content = match[1].trim();
    
    // Determine the type of special content
    let contentType: 'terminal' | 'config' | 'data' | 'chemical' | 'other' = 'other';
    
    if (content.startsWith('$') || content.startsWith('>') || content.includes('npm ') || content.includes('git ')) {
      contentType = 'terminal';
    } else if (content.includes('{') && content.includes('}')) {
      contentType = 'data';
    } else if (content.includes('=') && (content.includes('[') || content.includes('.'))) {
      contentType = 'config';
    } else if (content.match(/[A-Z][a-z]?\d*|H2O|CO2|C\d+H\d+/)) {
      contentType = 'chemical';
    }
    
    const specialBlock: SpecialBlock = {
      type: 'special',
      contentType,
      content,
      format: 'plain'
    };
    
    blockPositions.push({
      start: match.index,
      end: match.index + match[0].length,
      block: specialBlock
    });
  }
  
  // Sort blocks by position
  blockPositions.sort((a, b) => a.start - b.start);
  
  // Extract text blocks between code/math/special blocks
  let lastEnd = 0;
  
  blockPositions.forEach(({ start, end, block }) => {
    if (start > lastEnd) {
      const textContent = summaryText.substring(lastEnd, start).trim();
      if (textContent) {
        blocks.push(...parseTextContent(textContent));
      }
    }
    blocks.push(block);
    lastEnd = end;
  });
  
  // Add any remaining text after the last block
  if (lastEnd < summaryText.length) {
    const textContent = summaryText.substring(lastEnd).trim();
    if (textContent) {
      blocks.push(...parseTextContent(textContent));
    }
  }
  
  // If no blocks were found, treat entire content as text
  if (blocks.length === 0 && summaryText.trim()) {
    blocks.push(...parseTextContent(summaryText));
  }
  
  // Post-process blocks to consolidate code and math content
  return postProcessBlocks(blocks);
}

/**
 * Parse text content into structured text blocks
 */
function parseTextContent(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const lines = text.split('\n');
  
  let currentBlock = '';
  let isInList = false;
  let currentHeaderLevel: 1 | 2 | 3 | 4 | undefined;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Check for headers
    if (trimmedLine.startsWith('####')) {
      if (currentBlock) {
        blocks.push(createTextBlock(currentBlock, isInList, currentHeaderLevel));
        currentBlock = '';
      }
      blocks.push({
        type: 'text',
        content: trimmedLine.substring(4).trim(),
        isHeader: true,
        headerLevel: 4
      });
    } else if (trimmedLine.startsWith('###')) {
      if (currentBlock) {
        blocks.push(createTextBlock(currentBlock, isInList, currentHeaderLevel));
        currentBlock = '';
      }
      blocks.push({
        type: 'text',
        content: trimmedLine.substring(3).trim(),
        isHeader: true,
        headerLevel: 3
      });
    } else if (trimmedLine.startsWith('##')) {
      if (currentBlock) {
        blocks.push(createTextBlock(currentBlock, isInList, currentHeaderLevel));
        currentBlock = '';
      }
      blocks.push({
        type: 'text',
        content: trimmedLine.substring(2).trim(),
        isHeader: true,
        headerLevel: 2
      });
    } else if (trimmedLine.startsWith('#')) {
      if (currentBlock) {
        blocks.push(createTextBlock(currentBlock, isInList, currentHeaderLevel));
        currentBlock = '';
      }
      blocks.push({
        type: 'text',
        content: trimmedLine.substring(1).trim(),
        isHeader: true,
        headerLevel: 1
      });
    }
    // Check for bullet points
    else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      if (!isInList && currentBlock) {
        blocks.push(createTextBlock(currentBlock, false, currentHeaderLevel));
        currentBlock = '';
      }
      isInList = true;
      currentBlock += (currentBlock ? '\n' : '') + trimmedLine;
    }
    // Regular text
    else if (trimmedLine) {
      if (isInList && currentBlock) {
        blocks.push(createTextBlock(currentBlock, true, currentHeaderLevel));
        currentBlock = '';
        isInList = false;
      }
      currentBlock += (currentBlock ? '\n' : '') + trimmedLine;
    }
    // Empty line - end current block
    else if (currentBlock) {
      blocks.push(createTextBlock(currentBlock, isInList, currentHeaderLevel));
      currentBlock = '';
      isInList = false;
    }
  });
  
  // Add any remaining content
  if (currentBlock) {
    blocks.push(createTextBlock(currentBlock, isInList, currentHeaderLevel));
  }
  
  return blocks;
}

/**
 * Helper to create a text block
 */
function createTextBlock(
  content: string, 
  isList: boolean, 
  headerLevel?: 1 | 2 | 3 | 4
): TextBlock {
  return {
    type: 'text',
    content: content.trim(),
    isList,
    listType: isList ? 'bullet' : undefined,
    isHeader: !!headerLevel,
    headerLevel
  };
}

/**
 * Render blocks back to markdown format
 */
export function renderBlocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'code':
        return `\`\`\`${block.language}\n${block.content}\n\`\`\``;
      
      case 'math':
        let mathContent = block.latex;
        if (block.variables && Object.keys(block.variables).length > 0) {
          const varDefs = Object.entries(block.variables)
            .map(([k, v]) => `${k} = ${v}`)
            .join(', ');
          mathContent += `\nwhere: ${varDefs}`;
        }
        return `\`\`\`math\n${mathContent}\n\`\`\``;
      
      case 'special':
        return `\`\`\`special\n${block.content}\n\`\`\``;
      
      case 'text':
        if (block.isHeader) {
          const prefix = '#'.repeat(block.headerLevel || 2);
          return `${prefix} ${block.content}`;
        }
        return block.content;
      
      default:
        return '';
    }
  }).join('\n\n');
}