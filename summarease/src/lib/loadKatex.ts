import katex from 'katex';

// Make KaTeX available globally for the MathBlockRenderer
if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

export default katex;