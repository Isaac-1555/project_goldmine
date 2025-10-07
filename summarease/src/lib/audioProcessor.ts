// Client-side audio processing using Web Speech API and Gemini
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildEnhancedSummaryPrompt } from './summaryPromptBuilder'
import { buildTagGenerationPrompt } from './tagPromptBuilder'
import { uniqueTags } from './tagUtils'
import type { SummaryConfig } from '../types/summaryTypes'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

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

// Helper function to remove duplicate sentences and clean up summary while preserving blocks
function cleanAndDeduplicateSummary(summary: string): string {
  // First, preserve code, math, and special blocks
  const blockRegex = /```[\s\S]*?```/g;
  const blocks: string[] = [];
  let blockIndex = 0;
  
  // Extract and replace blocks with placeholders
  let processedSummary = summary.replace(blockRegex, (match) => {
    blocks.push(match);
    return `__BLOCK_${blockIndex++}__`;
  });
  
  // Split into sentences for non-block content, clean whitespace
  const sentences = processedSummary.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)
  
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
  
  // Restore the blocks
  blocks.forEach((block, index) => {
    cleanSummary = cleanSummary.replace(`__BLOCK_${index}__`, block);
  });
  
  // Ensure proper block formatting
  cleanSummary = cleanSummary
    .replace(/```\s*([a-zA-Z]+)\s*/g, '```$1\n') // Ensure language identifier is on same line
    .replace(/```$/gm, '```\n') // Ensure blocks are properly closed with newline
    .replace(/(```[^\n]*\n)([^`]+)(```)/g, '$1$2\n$3'); // Ensure content ends with newline before closing
  
  return cleanSummary
}

export async function processAudioTranscript(
  transcript: string,
  config?: Partial<SummaryConfig>
): Promise<{
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // Generate summary using enhanced prompt builder
  const summaryPrompt = buildEnhancedSummaryPrompt(transcript, config)

  const summaryResult = await model.generateContent(summaryPrompt)
  const rawSummary = summaryResult.response.text()
  
  // Clean and deduplicate the summary to prevent repetitive content
  const summary = cleanAndDeduplicateSummary(rawSummary)

  // Extract tags (only if autoTags is enabled)
  let tags: string[] = []
  if (config?.autoTags !== false) {
    const tagPrompt = buildTagGenerationPrompt(transcript, {
      contentType: 'transcript',
      subjectArea: config?.subjectArea || 'General',
      academicLevel: config?.academicLevel || 'Undergraduate',
    })

    const tagsResult = await model.generateContent(tagPrompt)
    let tagsText = tagsResult.response.text().trim()

    // If response is code-fenced, strip the fences
    const fenceMatch = tagsText.match(/```(?:json)?\n([\s\S]*?)```/)
    if (fenceMatch) {
      tagsText = fenceMatch[1].trim()
    }

    // Try JSON parse; if it fails, try to extract JSON object substring
    let combined: string[] | null = null
    const tryParse = (text: string) => {
      try {
        const parsed = JSON.parse(text)
        const general: string[] = Array.isArray(parsed?.general) ? parsed.general : []
        const specific: string[] = Array.isArray(parsed?.specific) ? parsed.specific : []
        return [...general, ...specific]
      } catch {
        return null
      }
    }

    combined = tryParse(tagsText)

    if (!combined) {
      const jsonObjMatch = tagsText.match(/\{[\s\S]*\}/)
      if (jsonObjMatch) {
        combined = tryParse(jsonObjMatch[0])
      }
    }

    const MAX_TAGS = 12
    if (combined) {
      tags = uniqueTags(combined, MAX_TAGS)
    } else {
      // Fallback: accept comma/newline-separated list
      const rough = tagsText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean)
      tags = uniqueTags(rough, MAX_TAGS)
    }
  }

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