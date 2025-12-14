const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export interface LecturePostprocessInput {
  rawTranscript: string
  approximateDurationSeconds?: number
  language?: string
}

export interface LecturePostprocessOutput {
  cleanTranscript: string
  studyNotes: string
  summary: string
}

function buildLecturePrompt(input: LecturePostprocessInput): string {
  const minutes = input.approximateDurationSeconds
    ? Math.round(input.approximateDurationSeconds / 60)
    : undefined

  const durationLine = minutes ? `Approximate lecture length: ~${minutes} minutes.\n` : ''

  return `You are a meticulous note-cleaning engine for lecture transcripts.\n${durationLine}
Take the raw transcript text below and produce a JSON object with THREE fields: "clean_transcript", "study_notes", and "summary".\n

Requirements:\n- Do NOT add any fields besides these three keys.\n- Do NOT invent content that is not clearly implied by the transcript.\n- Keep technical terminology intact.\n\n1) clean_transcript:\n- Fix punctuation, casing, and obvious recognition mistakes.\n- Remove filler words (um, uh, like, you know, etc.) and false starts when they don't change meaning.\n- Keep speaker order and meaning intact.\n- Keep it as a readable paragraph-style transcript, not bullet points.\n\n2) study_notes:\n- Turn the lecture into study-friendly notes.\n- Use section headings in ALL CAPS (e.g. "INTRODUCTION", "KEY CONCEPTS").\n- Under each heading, use bullet points starting with "• ".\n- Focus on definitions, relationships, examples, and key takeaways.\n- Keep the length reasonable for quick review (roughly 300-600 words).\n\n3) summary:\n- Provide a concise 1-3 paragraph summary of the lecture.\n- Focus on the main ideas and how they connect.\n- Avoid bullet points.\n\nReturn ONLY a single JSON object, no code fences, no explanations.\n
RAW_TRANSCRIPT:\n${input.rawTranscript}\n`
}

export async function postprocessLectureTranscript(
  input: LecturePostprocessInput
): Promise<LecturePostprocessOutput> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const prompt = buildLecturePrompt(input)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini lecture post-processing failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ||
    ''

  if (!rawText) {
    // Fallback: return the original transcript as cleanTranscript
    return {
      cleanTranscript: input.rawTranscript,
      studyNotes: '',
      summary: '',
    }
  }

  let parsed: any

  const tryParse = (text: string) => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  parsed = tryParse(rawText)

  if (!parsed) {
    // Sometimes models wrap JSON in extra text; try to extract object substring
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = tryParse(jsonMatch[0])
    }
  }

  if (!parsed) {
    // As a last resort, fall back to original transcript
    return {
      cleanTranscript: input.rawTranscript,
      studyNotes: '',
      summary: '',
    }
  }

  const cleanTranscript = (parsed.clean_transcript || parsed.cleanTranscript || '').toString().trim()
  const studyNotes = (parsed.study_notes || parsed.studyNotes || '').toString().trim()
  const summary = (parsed.summary || '').toString().trim()

  return {
    cleanTranscript: cleanTranscript || input.rawTranscript,
    studyNotes,
    summary,
  }
}
