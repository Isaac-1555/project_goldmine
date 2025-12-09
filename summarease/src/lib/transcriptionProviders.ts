const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export interface TranscriptionOptions {
  language?: string
  model?: string
  prompt?: string
  isLecture?: boolean
}

export interface ProviderTranscriptionResult {
  text: string
  language?: string
  durationSeconds?: number
  rawResponse?: any
}

export interface TranscriptionProvider {
  transcribeBlob(blob: Blob, options?: TranscriptionOptions): Promise<ProviderTranscriptionResult>
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

class GeminiTranscriber implements TranscriptionProvider {
  async transcribeBlob(blob: Blob, options: TranscriptionOptions = {}): Promise<ProviderTranscriptionResult> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    const base64Audio = await blobToBase64(blob)
    const model = options.model || 'gemini-2.5-flash'
    const prompt =
      options.prompt ||
      'Please transcribe this audio file. Provide only the transcript text without any additional commentary or formatting.'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: blob.type || 'audio/webm',
                    data: base64Audio.split(',')[1],
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini transcription request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ||
      ''

    if (!text) {
      throw new Error('No transcript generated from Gemini')
    }

    return {
      text,
      language: options.language || 'en-US',
      rawResponse: data,
    }
  }
}

export function getTranscriptionProvider(name: string = 'gemini'): TranscriptionProvider {
  // For now we only support Gemini; name is reserved for future providers.
  switch (name) {
    case 'gemini':
    default:
      return new GeminiTranscriber()
  }
}
