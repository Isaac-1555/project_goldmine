// Web Speech API Transcription Service
// This provides real-time transcription during recording

export interface WebSpeechTranscriber {
  start: () => void
  stop: () => string
  pause: () => void
  resume: () => void
  isSupported: () => boolean
  getTranscript: () => string
}

export class LiveTranscriber implements WebSpeechTranscriber {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private isPaused = false
  private finalTranscript = ''
  private interimTranscript = ''
  private onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void
  private onError?: (error: string) => void

  constructor(
    onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ) {
    this.onTranscriptUpdate = onTranscriptUpdate
    this.onError = onError
    
    // Check for browser support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.setupRecognition()
      console.log('SpeechRecognition initialized successfully')
    } else {
      console.warn('SpeechRecognition API not available in this browser')
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    // Configure recognition
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'
    this.recognition.maxAlternatives = 1

    // Handle results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' '
          // Send final transcript update
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate(this.finalTranscript + interim, false)
          }
        } else {
          interim += transcript
        }
      }

      this.interimTranscript = interim

      // Send combined transcript update (final + interim)
      const fullTranscript = this.finalTranscript + interim
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(fullTranscript, false)
      }
    }

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      
      let errorMessage = 'Speech recognition error'
      
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error occurred during speech recognition'
          break
        case 'not-allowed':
          errorMessage = 'Microphone permission denied'
          break
        case 'no-speech':
          errorMessage = 'No speech detected'
          break
        case 'audio-capture':
          errorMessage = 'No microphone found'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }
      
      if (this.onError) {
        this.onError(errorMessage)
      }
    }

    // Handle end
    this.recognition.onend = () => {
      this.isListening = false
      console.log('Speech recognition ended')
    }

    // Handle start
    this.recognition.onstart = () => {
      console.log('Speech recognition started')
    }
  }

  start() {
    if (!this.recognition) {
      console.error('Recognition not initialized')
      throw new Error('Speech recognition not supported in this browser')
    }

    if (this.isListening) {
      console.log('Already listening')
      return
    }

    // Reset transcripts
    this.finalTranscript = ''
    this.interimTranscript = ''
    this.isListening = true
    this.isPaused = false

    try {
      console.log('Starting speech recognition...')
      this.recognition.start()
      console.log('Speech recognition start() called successfully')
    } catch (error) {
      console.error('Failed to start recognition:', error)
      this.isListening = false
      // Provide more detail about the error
      if ((error as any).message?.includes('not-allowed')) {
        throw new Error('Microphone permission denied. Please allow microphone access and try again.')
      }
      throw error
    }
  }

  stop(): string {
    if (!this.recognition || !this.isListening) {
      return this.finalTranscript.trim()
    }

    this.recognition.stop()
    this.isListening = false
    this.isPaused = false

    // Return the final transcript
    const transcript = this.finalTranscript.trim()
    console.log('Final transcript:', transcript)
    return transcript
  }

  pause() {
    if (!this.recognition || !this.isListening || this.isPaused) return
    
    this.recognition.stop()
    this.isPaused = true
  }

  resume() {
    if (!this.recognition || !this.isPaused) return
    
    try {
      this.recognition.start()
      this.isPaused = false
    } catch (error) {
      console.error('Failed to resume recognition:', error)
    }
  }

  isSupported(): boolean {
    const hasSpeechRecognition = !!(window as any).SpeechRecognition
    const hasWebkitSpeechRecognition = !!(window as any).webkitSpeechRecognition
    
    console.log('Web Speech API Support Check:', {
      hasSpeechRecognition,
      hasWebkitSpeechRecognition,
      userAgent: navigator.userAgent,
      browser: this.detectBrowser()
    })
    
    return hasSpeechRecognition || hasWebkitSpeechRecognition
  }
  
  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('chrome')) return 'Chrome'
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari'
    if (userAgent.includes('firefox')) return 'Firefox'
    if (userAgent.includes('edge')) return 'Edge'
    return 'Unknown'
  }

  getTranscript(): string {
    return (this.finalTranscript + this.interimTranscript).trim()
  }
}

// Fallback transcription for when Web Speech API is not available
export function getFallbackTranscript(): string {
  return ''
}
