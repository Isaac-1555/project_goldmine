const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export interface TranscriptionResult {
  transcript: string
  success: boolean
  error?: string
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  if (!GEMINI_API_KEY) {
    return {
      transcript: '',
      success: false,
      error: 'Gemini API key not configured'
    }
  }

  try {
    // Convert audio blob to base64
    const base64Audio = await blobToBase64(audioBlob)
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Please transcribe this audio file. Provide only the transcript text without any additional commentary or formatting."
            },
            {
              inline_data: {
                mime_type: audioBlob.type,
                data: base64Audio.split(',')[1] // Remove data:audio/webm;base64, prefix
              }
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const transcript = data.candidates[0].content.parts[0].text.trim()
      return {
        transcript,
        success: true
      }
    } else {
      throw new Error('No transcript generated')
    }
    
  } catch (error) {
    console.error('Transcription error:', error)
    return {
      transcript: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
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
