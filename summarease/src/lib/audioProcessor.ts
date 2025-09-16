// Client-side audio processing using Web Speech API and Gemini
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'your-gemini-api-key'

export interface AudioProcessingResult {
  transcript: string
  summary: string
  tags: string[]
}

export class AudioTranscriber {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private onTranscriptUpdate?: (transcript: string) => void
  private finalTranscript = ''
  private interimTranscript = ''

  constructor() {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.setupRecognition()
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'

    this.recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript + ' '
        } else {
          interim += transcript
        }
      }

      if (final) {
        this.finalTranscript += final
      }
      this.interimTranscript = interim

      const fullTranscript = this.finalTranscript + interim
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(fullTranscript)
      }
    }

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
    }

    this.recognition.onend = () => {
      this.isListening = false
    }
  }

  startListening(onTranscriptUpdate: (transcript: string) => void) {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser')
    }

    this.onTranscriptUpdate = onTranscriptUpdate
    this.finalTranscript = ''
    this.interimTranscript = ''
    this.isListening = true
    this.recognition.start()
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
    return this.finalTranscript.trim()
  }

  isSupported(): boolean {
    return !!this.recognition
  }
}

// Helper function to remove duplicate sentences and clean up summary
function cleanAndDeduplicateSummary(summary: string): string {
  // Split into sentences, clean whitespace
  const sentences = summary.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
  
  // Remove duplicate sentences (case-insensitive)
  const uniqueSentences: string[] = []
  const seenSentences = new Set<string>()
  
  for (const sentence of sentences) {
    const normalizedSentence = sentence.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!seenSentences.has(normalizedSentence) && normalizedSentence.length > 10) {
      uniqueSentences.push(sentence)
      seenSentences.add(normalizedSentence)
    }
  }
  
  // Rebuild the summary
  let cleanSummary = uniqueSentences.join('. ').trim()
  if (cleanSummary && !cleanSummary.endsWith('.') && !cleanSummary.endsWith('!') && !cleanSummary.endsWith('?')) {
    cleanSummary += '.'
  }
  
  return cleanSummary
}

export async function processAudioTranscript(transcript: string): Promise<{
  summary: string
  tags: string[]
}> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file')
  }

  if (!transcript.trim()) {
    throw new Error('No transcript provided for processing')
  }

  console.log(`Processing transcript: ${transcript.length} characters`)

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Generate summary
  const summaryPrompt = `
    Create a study-friendly summary for college students from the following transcript. Use clear sections and bullet points that will display properly as formatted text.
    
    Requirements:
    - Use EXACTLY this structure with plain text formatting
    - Each bullet point must start on its own new line with "• "
    - Each bullet point should be unique (no repetition)
    - Focus on understanding and practical insight (no exam language)
    - Keep language clear and concise
    - Limit to 250-350 words total
    - Use line breaks to separate sections
    - Do NOT include headings like "Study Notes" or any mention of exams
    
    Format:
    
    KEY CONCEPTS:
    • [Most important concept/topic 1]
    • [Most important concept/topic 2]
    • [Most important concept/topic 3]
    
    DETAILS & EXAMPLES:
    • [Critical facts, data, or evidence]
    • [Supporting information that deepens understanding]
    • [Specific examples or case studies mentioned]
    
    APPLICATIONS & REFLECTIONS:
    • [How to apply these ideas in real life or projects]
    • [Connections to broader topics or personal growth]
    • [Implications or takeaways]
    
    Transcript to summarize:
    ${transcript}
  `

  const summaryResult = await model.generateContent(summaryPrompt)
  const rawSummary = summaryResult.response.text()
  
  // Clean and deduplicate the summary to prevent repetitive content
  const summary = cleanAndDeduplicateSummary(rawSummary)

  // Extract tags
  const tagsPrompt = `
    Extract 3-7 relevant keywords or tags from the following transcript. 
    These should be:
    - Single words or short phrases (2-3 words max)
    - Relevant to the main topics and themes
    - Useful for categorization and search
    - Lowercase
    
    Return only the tags separated by commas, nothing else.
    
    Transcript: ${transcript}
  `

  const tagsResult = await model.generateContent(tagsPrompt)
  const tagsText = tagsResult.response.text().trim()
  const tags = tagsText.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)

  return {
    summary,
    tags
  }
}

// For processing uploaded audio files (fallback when live transcription isn't available)
export async function processUploadedAudio(audioBlob: Blob): Promise<AudioProcessingResult> {
  // For now, return a placeholder since browser-based audio file transcription
  // requires more complex setup. This could be enhanced with services like
  // Web Speech API for file processing or integration with external APIs
  
  const placeholder = "Audio file uploaded. Please use live transcription during recording for best results."
  
  return {
    transcript: placeholder,
    summary: "Summary will be generated when transcript is available.",
    tags: ["audio", "uploaded"]
  }
}