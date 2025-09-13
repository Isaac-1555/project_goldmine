// Placeholder RNNoise worklet. This currently passes audio through unchanged.
// Later, swap this for a real RNNoise WASM-backed worklet.
class RnnoisePassThrough extends AudioWorkletProcessor {
  constructor() { super() }
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || !input[0]) return true
    const x = input[0], y = output[0]
    for (let i = 0; i < x.length; i++) y[i] = x[i]
    return true
  }
}
registerProcessor('rnnoise-worklet', RnnoisePassThrough)