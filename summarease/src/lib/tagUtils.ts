export function sanitizeTagName(name: string): string {
  if (!name) return ''
  let s = String(name)
  // Remove code fence markers and language hints
  s = s.replace(/```\w*/g, '')
       .replace(/```/g, '')
  // Remove surrounding quotes and stray JSON punctuation
  s = s.replace(/[\[{\]}]/g, ' ')
       .replace(/"/g, '')
       .replace(/:\s*/g, ' ')
  // Collapse whitespace and trim
  s = s.replace(/\s+/g, ' ').trim()
  // Lowercase
  s = s.toLowerCase()
  // Keep only allowed characters: letters, numbers, spaces, hyphens, underscores
  s = s.replace(/[^a-z0-9 \-_]/g, '')
  // Normalize multiple spaces
  s = s.replace(/\s{2,}/g, ' ').trim()
  return s
}

export function isJunkTagName(name: string): boolean {
  if (!name) return true
  const s = String(name).toLowerCase().trim()
  if (!s) return true
  // Likely junk if it contains JSON structure keywords or braces heavily
  if (/[{}\[\]]/.test(s)) return true
  if (s.includes('"general"') || s.includes('"specific"')) return true
  if (s.startsWith('json') || s.startsWith('```')) return true
  // Very long single token is likely junk
  if (s.length > 40 && !s.includes(' ')) return true
  return false
}

export function uniqueTags(names: string[], limit?: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const clean = sanitizeTagName(raw)
    if (!clean || isJunkTagName(clean)) continue
    if (!seen.has(clean)) {
      seen.add(clean)
      out.push(clean)
      if (typeof limit === 'number' && out.length >= limit) break
    }
  }
  return out
}