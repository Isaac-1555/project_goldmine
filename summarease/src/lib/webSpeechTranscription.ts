// Stub file for testing state management
export class LiveTranscriber {
  constructor() {}
  start() {}
  stop() {}
  onTranscription(callback: (transcript: string, isFinal: boolean) => void) {}
  onError(callback: (error: any) => void) {}
}

export const getFallbackTranscript = () => ''