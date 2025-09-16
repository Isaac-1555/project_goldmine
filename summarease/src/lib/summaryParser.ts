import type { ContentBlock, CodeBlock, MathBlock, SpecialBlock, TextBlock } from '../types/summaryTypes';

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
  
  return blocks;
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