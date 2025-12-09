import { getTranscriptionProvider, type ProviderTranscriptionResult, type TranscriptionOptions } from './transcriptionProviders'
import { postprocessLectureTranscript, type LecturePostprocessOutput } from './lecturePostprocessor'

export interface TranscriptionResult {
  transcript: string
  success: boolean
  error?: string
}

export interface LectureTranscriptionResult {
  raw: ProviderTranscriptionResult
  processed: LecturePostprocessOutput
}

/**
 * Basic audio transcription using the default provider (Gemini).
 * Kept for backwards compatibility with the original API.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  try {
    const provider = getTranscriptionProvider('gemini')
    const raw = await provider.transcribeBlob(audioBlob, options)

    return {
      transcript: raw.text,
      success: true,
    }
  } catch (error) {
    console.error('Transcription error:', error)
    return {
      transcript: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Low-level helper returning the full provider result (including metadata).
 */
export async function transcribeAudioWithMetadata(
  audioBlob: Blob,
  options?: TranscriptionOptions
): Promise<ProviderTranscriptionResult> {
  const provider = getTranscriptionProvider('gemini')
  return provider.transcribeBlob(audioBlob, options)
}

/**
 * Jarvis-style lecture transcription: raw STT + LLM cleanup and structuring.
 */
export async function transcribeLecture(
  audioBlob: Blob,
  options?: TranscriptionOptions
): Promise<LectureTranscriptionResult> {
  const raw = await transcribeAudioWithMetadata(audioBlob, {
    ...(options || {}),
    isLecture: true,
  })

  const processed = await postprocessLectureTranscript({
    rawTranscript: raw.text,
    language: options?.language,
  })

  return { raw, processed }
}
