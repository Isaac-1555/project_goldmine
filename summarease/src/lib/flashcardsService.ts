import { supabase } from './supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export type FlashcardType = 'term-definition' | 'qa' | 'cloze'

export interface Flashcard {
  id: string
  summary_id: string
  front: string
  back: string
  type: FlashcardType
  created_at?: string
}

export interface FlashcardSet {
  id: string // use first card id (consistent with quiz simplification)
  title: string
  cards: Flashcard[]
  created_at: string
  summary_id: string
}

export interface LeitnerReviewRecord {
  id: string
  card_id: string
  user_id: string
  box: number // 1..5
  last_reviewed_at: string
  next_review_at: string
  lapses: number
  successes: number
}

export interface GenerateFlashcardsOptions {
  types: FlashcardType[]
  perSourceDefault: number // default requested by user (10)
  perSourceMax: number // computed from length
  includeImages?: boolean
}

function estimateMaxCardsForText(len: number): number {
  // Heuristic: ~1 card per 140-180 chars, cap 50 per source
  if (len <= 400) return 5
  if (len <= 1200) return 10
  if (len <= 3000) return 20
  if (len <= 6000) return 30
  return 50
}

export function computePerSourceMax(summaryText: string): number {
  return estimateMaxCardsForText(summaryText.length)
}

export async function generateFlashcardsWithAI(
  combinedText: string,
  types: FlashcardType[],
  targetCount: number
): Promise<Pick<Flashcard, 'front' | 'back' | 'type'>[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY')
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const typeList = types.join(', ')
  const prompt = `You are an expert study coach. Generate high-quality flashcards from the provided content.

Types requested: ${typeList}
Target card count: about ${targetCount} (prioritize quality and uniqueness; do NOT fabricate).

Rules:
- Return ONLY a valid JSON array of objects.
- Each object MUST have: "front" (string), "back" (string), "type" (one of ["term-definition","qa","cloze"]).
- Keep fronts concise. For cloze, use a single gap wrapped in {{...}} in the front, and place the removed text on the back.
- Avoid duplicates and trivial cards; avoid meta phrases like "according to the lecture".

Content:
${combinedText}
`
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim()
  let cards: any
  try {
    cards = JSON.parse(text)
  } catch {
    throw new Error('AI returned malformed JSON for flashcards')
  }
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('No flashcards generated')
  }
  const sanitized = cards.map((c, i) => {
    const front = String(c.front ?? '').trim()
    const back = String(c.back ?? '').trim()
    const type = (c.type ?? 'qa') as FlashcardType
    if (!front || !back) {
      throw new Error(`Flashcard ${i + 1} missing front/back`)
    }
    return { front, back, type }
  })
  // Basic de-dup by front text
  const seen = new Set<string>()
  return sanitized.filter(c => {
    const key = c.front.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function createFlashcardSet(
  summaryTexts: string[],
  fileIds: string[],
  title: string,
  options: GenerateFlashcardsOptions
): Promise<FlashcardSet> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('User not authenticated')

  // Use first summary for storage key (simple grouping, mirrors quiz)
  const { data: summaries, error: summariesError } = await supabase
    .from('summaries')
    .select('id')
    .in('file_id', fileIds)
    .limit(1)
  if (summariesError) throw summariesError
  if (!summaries || summaries.length === 0) throw new Error('No summaries found for selected files')
  const summaryId = summaries[0].id

  const combinedText = summaryTexts.join('\n\n--- --- ---\n\n')
  const target = Math.min(options.perSourceDefault, options.perSourceMax)
  const generated = await generateFlashcardsWithAI(combinedText, options.types, target)

  const inserted: Flashcard[] = []
  for (const g of generated) {
    const { data: row, error } = await supabase
      .from('flashcards')
      .insert({
        summary_id: summaryId,
        front: g.front,
        back: g.back,
        type: g.type,
      })
      .select()
      .single()
    if (error) throw error
    inserted.push(row as Flashcard)
  }

  return {
    id: inserted[0].id,
    title,
    cards: inserted,
    created_at: inserted[0].created_at || new Date().toISOString(),
    summary_id: summaryId
  }
}

export async function getUserFlashcardSets(): Promise<FlashcardSet[]> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('User not authenticated')

  const { data: cards, error } = await supabase
    .from('flashcards')
    .select(`*, summaries!inner(file_id, created_at, files!inner(id, user_id, title))`)
    .eq('summaries.files.user_id', user.user.id)
  if (error) throw error
  if (!cards || cards.length === 0) return []

  const groups: Record<string, Flashcard[]> = {}
  const info: Record<string, { title: string; created_at: string }> = {}
  for (const c of cards as any[]) {
    const sid = c.summary_id
    if (!groups[sid]) groups[sid] = []
    groups[sid].push(c)
    if (!info[sid]) {
      const file = c.summaries.files
      const created_at = c.created_at || c.summaries.created_at
      info[sid] = { title: `Flashcards: ${file.title}`, created_at }
    }
  }
  const sets: FlashcardSet[] = Object.entries(groups).map(([sid, list]) => ({
    id: list[0].id,
    title: info[sid]?.title || 'Flashcards',
    cards: list,
    created_at: info[sid]?.created_at || new Date().toISOString(),
    summary_id: sid
  }))
  return sets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getFlashcardSetById(cardId: string): Promise<FlashcardSet | null> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('User not authenticated')

  const { data: card, error: cardErr } = await supabase
    .from('flashcards')
    .select('summary_id')
    .eq('id', cardId)
    .single()
  if (cardErr) throw cardErr

  const { data: list, error } = await supabase
    .from('flashcards')
    .select(`*, summaries!inner(file_id, created_at, files!inner(user_id, title))`)
    .eq('summary_id', (card as any).summary_id)
    .eq('summaries.files.user_id', user.user.id)
  if (error) throw error
  if (!list || list.length === 0) return null
  const file = (list[0] as any).summaries.files
  const summary = (list[0] as any).summaries
  return {
    id: list[0].id,
    title: `Flashcards: ${file.title}`,
    cards: list as any,
    created_at: summary.created_at,
    summary_id: (card as any).summary_id
  }
}

export async function submitFlashcardReviews(batch: { card_id: string; ease: 'again' | 'good' }[]): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('User not authenticated')

  // Simple Leitner box progression in DB; create/advance records
  for (const item of batch) {
    // Fetch existing record
    const { data: rec, error: recErr } = await supabase
      .from('flashcard_reviews')
      .select('*')
      .eq('card_id', item.card_id)
      .eq('user_id', user.user.id)
      .single()
    if (recErr && recErr.code !== 'PGRST116') {
      throw recErr
    }
    const now = new Date()
    let box = rec?.box ?? 1
    let lapses = rec?.lapses ?? 0
    let successes = rec?.successes ?? 0
    if (item.ease === 'good') {
      box = Math.min(5, box + 1)
      successes += 1
    } else {
      box = Math.max(1, box - 1)
      lapses += 1
    }
    // Next review intervals (minutes for simplicity; could be days)
    const minutes = [0, 10, 60, 12 * 60, 2 * 24 * 60, 7 * 24 * 60][box]
    const next = new Date(now.getTime() + minutes * 60 * 1000)

    if (!rec) {
      const { error } = await supabase.from('flashcard_reviews').insert({
        card_id: item.card_id,
        user_id: user.user.id,
        box,
        last_reviewed_at: now.toISOString(),
        next_review_at: next.toISOString(),
        lapses,
        successes
      })
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('flashcard_reviews')
        .update({
          box,
          last_reviewed_at: now.toISOString(),
          next_review_at: next.toISOString(),
          lapses,
          successes
        })
        .eq('id', rec.id)
      if (error) throw error
    }
  }
}

export async function deleteFlashcardSet(summaryId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('User not authenticated')

  const { data: cards, error: verifyError } = await supabase
    .from('flashcards')
    .select('id, summaries!inner(files!inner(user_id))')
    .eq('summary_id', summaryId)
    .eq('summaries.files.user_id', user.user.id)
  if (verifyError) throw verifyError
  if (!cards || cards.length === 0) throw new Error('Flashcards not found or not owned')
  const ids = (cards as any[]).map(c => c.id)
  const { error: delRev } = await supabase.from('flashcard_reviews').delete().in('card_id', ids)
  if (delRev) throw delRev
  const { error } = await supabase.from('flashcards').delete().eq('summary_id', summaryId)
  if (error) throw error
}
