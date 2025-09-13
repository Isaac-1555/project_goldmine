class ExpanderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'thresholdDb', defaultValue: -50 },
      { name: 'ratio', defaultValue: 2.0, minValue: 1.0, maxValue: 8.0 },
      { name: 'attackMs', defaultValue: 5, minValue: 0.1, maxValue: 50 },
      { name: 'releaseMs', defaultValue: 120, minValue: 10, maxValue: 1000 }
    ]
  }
  constructor(options) {
    super()
    this.thresholdDb = (options?.processorOptions?.thresholdDb) ?? -50
    this.ratio = (options?.processorOptions?.ratio) ?? 2.0
    this.attack = ((options?.processorOptions?.attackMs) ?? 5) / 1000
    this.release = ((options?.processorOptions?.releaseMs) ?? 120) / 1000
    this.env = 0
    this.port.onmessage = (e) => {
      const { type, thresholdDb, ratio, attackMs, releaseMs } = e.data || {}
      if (type === 'set') {
        if (typeof thresholdDb === 'number') this.thresholdDb = thresholdDb
        if (typeof ratio === 'number') this.ratio = ratio
        if (typeof attackMs === 'number') this.attack = attackMs / 1000
        if (typeof releaseMs === 'number') this.release = releaseMs / 1000
      }
    }
  }
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || !input[0]) return true
    const x = input[0], y = output[0]
    const sr = sampleRate
    const atk = Math.exp(-1 / (this.attack * sr))
    const rel = Math.exp(-1 / (this.release * sr))
    const thrLin = Math.pow(10, this.thresholdDb / 20)

    for (let i = 0; i < x.length; i++) {
      const abs = Math.abs(x[i]) + 1e-8
      const envTarget = abs
      this.env = envTarget > this.env ? envTarget + (this.env - envTarget) * atk : envTarget + (this.env - envTarget) * rel

      let gain = 1.0
      if (this.env < thrLin) {
        const below = thrLin / Math.max(this.env, 1e-8)
        const dbBelow = 20 * Math.log10(below)
        const expandedDb = dbBelow * (this.ratio - 1.0)
        gain = Math.pow(10, -expandedDb / 20)
      }
      y[i] = x[i] * gain
    }
    return true
  }
}
registerProcessor('expander-worklet', ExpanderProcessor)