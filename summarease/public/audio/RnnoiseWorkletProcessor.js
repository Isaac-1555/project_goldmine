// RNNoise AudioWorkletProcessor loader.
// This tries to load /audio/rnnoise.wasm and run real-time denoising.
// If anything fails, it falls back to pass-through automatically.

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.ready = false
    this.statePtr = 0
    this.inputPtr = 0
    this.outputPtr = 0
    this.frameSize = 480 // RNNoise expects 480 samples at 48kHz
    this.memory = null
    this.exports = null
    this._buffer = new Float32Array(this.frameSize)
    this._init()
  }

  async _init() {
    try {
      // Try instantiateStreaming first
      const resp = await fetch('/audio/rnnoise.wasm')
      let result
      if ('instantiateStreaming' in WebAssembly && resp.headers.get('content-type')?.includes('application/wasm')) {
        result = await WebAssembly.instantiateStreaming(resp, {})
      } else {
        const bytes = await resp.arrayBuffer()
        result = await WebAssembly.instantiate(bytes, {})
      }
      const instance = result.instance
      this.exports = instance.exports
      this.memory = this.exports.memory
      // Allocate buffers if malloc is available, else use linear memory offsets if provided
      const malloc = this.exports.malloc || null
      if (!malloc || !this.exports.rnnoise_create || !this.exports.rnnoise_process_frame || !this.exports.rnnoise_destroy) {
        // Missing expected exports; fallback
        console.warn('RNNoise wasm missing expected exports; falling back to pass-through')
        return
      }
      const bytesPerSample = 4
      this.inputPtr = malloc(this.frameSize * bytesPerSample)
      this.outputPtr = malloc(this.frameSize * bytesPerSample)
      this.statePtr = this.exports.rnnoise_create(0)
      if (!this.statePtr) {
        console.warn('RNNoise state create failed; pass-through')
        return
      }
      this.ready = true
      console.log('RNNoise worklet ready')
    } catch (e) {
      console.warn('Failed to init RNNoise wasm; pass-through', e)
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || !input[0]) return true
    const x = input[0]
    const y = output[0]

    if (!this.ready) {
      // pass-through until ready
      for (let i = 0; i < x.length; i++) y[i] = x[i]
      return true
    }

    const memF32 = new Float32Array(this.memory.buffer)
    let idx = 0
    while (idx < x.length) {
      const n = Math.min(this.frameSize, x.length - idx)
      // Copy frame to wasm memory
      memF32.set(x.subarray(idx, idx + n), this.inputPtr >> 2)
      // Process
      this.exports.rnnoise_process_frame(this.statePtr, this.outputPtr, this.inputPtr)
      // Copy back
      y.set(memF32.subarray(this.outputPtr >> 2, (this.outputPtr >> 2) + n), idx)
      idx += n
    }
    return true
  }

  static get parameterDescriptors() { return [] }
}

registerProcessor('rnnoise-worklet', RNNoiseProcessor)