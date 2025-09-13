import { useEffect, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error'

export type StartOptions = {
  deviceId?: string
  externalStream?: MediaStream
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  sampleRate?: number
  highpassHz?: number
  enableExpander?: boolean
  enableCompressor?: boolean
  enableRnnoise?: boolean
}

export type LectureRecorder = {
  status: RecorderStatus
  levelDb: number
  supportedMimeType: string | null
  start: (opts?: StartOptions) => Promise<void>
  stop: () => Promise<Blob | null>
  pause: () => void
  resume: () => void
  listInputDevices: () => Promise<MediaDeviceInfo[]>
  getRecordedChunks: () => Blob[]
}

export function useLectureRecorder(): LectureRecorder {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [levelDb, setLevelDb] = useState<number>(-90)
  const [supportedMimeType, setSupportedMimeType] = useState<string | null>(null)

  // media + recorder
  const mediaStreamRef = useRef<MediaStream | null>(null)
const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const snapshotChunksRef = useRef<Blob[] | null>(null)
  const levelTimerRef = useRef<number | null>(null)

  // audio graph
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const hpfRef = useRef<BiquadFilterNode | null>(null)
  const rnnoiseRef = useRef<AudioWorkletNode | null>(null)
  const expanderRef = useRef<AudioWorkletNode | DynamicsCompressorNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const limiterRef = useRef<DynamicsCompressorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  const pickMime = (hint?: string): string | null => {
    const candidates = [
      hint,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4'
    ].filter(Boolean) as string[]
    for (const m of candidates) {
      if (MediaRecorder.isTypeSupported(m)) return m
    }
    return null
  }

  const listInputDevices = async () => {
    // Request once so device labels populate
    try { await navigator.mediaDevices.getUserMedia({ audio: true }) } catch {}
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === 'audioinput')
  }

  const ensureWorklet = async (ctx: AudioContext, url: string, name: 'expander-worklet' | 'rnnoise-worklet') => {
    try {
      const key = `__loaded_${name}` as const
      if (!(ctx as any)[key]) {
        await ctx.audioWorklet.addModule(url)
        ;(ctx as any)[key] = true
      }
      return true
    } catch (e) {
      console.warn(`Failed to load worklet ${name} from ${url}:`, e)
      return false
    }
  }

  const measureNoiseFloor = async (ctx: AudioContext, node: AudioNode, seconds = 1.0): Promise<number> => {
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    node.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const start = performance.now()
    let accum = 0, n = 0
    while ((performance.now() - start) < seconds * 1000) {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length)
      const db = 20 * Math.log10(rms + 1e-9)
      accum += db; n++
      await new Promise(r => setTimeout(r, 50))
    }
    try { node.disconnect(analyser) } catch {}
    return accum / Math.max(1, n)
  }

const start: LectureRecorder['start'] = async (opts) => {
    if (status === 'recording' || status === 'paused') return
    setStatus('idle')
    const {
      deviceId,
      externalStream,
      echoCancellation = false,
      noiseSuppression = true,
      autoGainControl = true,
      sampleRate = 48000,
      highpassHz = 90,
      enableExpander = true,
      enableCompressor = true,
      enableRnnoise = false,
    } = (opts || {})

    // Constraints
    let constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: sampleRate },
        echoCancellation,
        noiseSuppression,
        autoGainControl,
      },
      video: false,
    }

let stream: MediaStream
    if (externalStream) {
      stream = externalStream
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (e) {
        // fallback
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
    }
    mediaStreamRef.current = stream

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate })
    audioCtxRef.current = audioCtx

    // Nodes
    const source = audioCtx.createMediaStreamSource(stream)
    sourceRef.current = source

    const hpf = audioCtx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = highpassHz
    hpf.Q.value = 0.707
    hpfRef.current = hpf

    // optional RNNoise (placeholder worklet)
let rnnoiseNode: AudioWorkletNode | null = null
    if (enableRnnoise) {
      // Try real RNNoise processor first, then fallback to pass-through
      let ok = await ensureWorklet(audioCtx, '/audio/RnnoiseWorkletProcessor.js', 'rnnoise-worklet')
      if (!ok) ok = await ensureWorklet(audioCtx, '/audio/RnnoiseWorklet.js', 'rnnoise-worklet')
      if (ok) rnnoiseNode = new AudioWorkletNode(audioCtx, 'rnnoise-worklet', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] })
    }
    rnnoiseRef.current = rnnoiseNode

    // Expander worklet (or mild compressor fallback)
    let expanderNode: AudioWorkletNode | DynamicsCompressorNode
    if (enableExpander) {
      const ok = await ensureWorklet(audioCtx, '/audio/ExpanderWorklet.js', 'expander-worklet')
      if (ok) {
        expanderNode = new AudioWorkletNode(audioCtx, 'expander-worklet', {
          numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
          processorOptions: { thresholdDb: -50, ratio: 2.0, attackMs: 5, releaseMs: 120 }
        })
      } else {
        const gate = audioCtx.createDynamicsCompressor()
        gate.threshold.value = -60
        gate.ratio.value = 1.5
        gate.attack.value = 0.005
        gate.release.value = 0.12
        expanderNode = gate
      }
    } else {
      const bypass = audioCtx.createDynamicsCompressor()
      bypass.threshold.value = 0
      bypass.ratio.value = 1
      expanderNode = bypass
    }
    expanderRef.current = expanderNode

    const compressor = audioCtx.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.ratio.value = enableCompressor ? 4.0 : 1.0
    compressor.attack.value = 0.005
    compressor.release.value = 0.15
    compressor.knee.value = 12
    compressorRef.current = compressor

    const limiter = audioCtx.createDynamicsCompressor()
    limiter.threshold.value = -1.0
    limiter.ratio.value = 20.0
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    limiter.knee.value = 0
    limiterRef.current = limiter

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1024
    analyserRef.current = analyser

    const dest = audioCtx.createMediaStreamDestination()
    destRef.current = dest

    // Connect graph: source -> hpf -> rnnoise? -> expander -> compressor -> limiter -> analyser -> dest
    source.connect(hpf)
    if (rnnoiseNode) {
      hpf.connect(rnnoiseNode)
      rnnoiseNode.connect(expanderNode as any)
    } else {
      hpf.connect(expanderNode as any)
    }
    ;(expanderNode as any).connect(compressor)
    compressor.connect(limiter)
    limiter.connect(analyser)
    analyser.connect(dest)

    // Auto-calibrate expander threshold near noise floor
    try {
      const noiseFloorDb = await measureNoiseFloor(audioCtx, limiter, 1.0)
      const thresholdDb = Math.min(-30, noiseFloorDb + 6)
      if (expanderNode instanceof AudioWorkletNode) expanderNode.port.postMessage({ type: 'set', thresholdDb })
      if (expanderNode instanceof DynamicsCompressorNode) expanderNode.threshold.value = thresholdDb
    } catch {}

    // Metering
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length)
      const db = 20 * Math.log10(rms + 1e-9)
      setLevelDb(db)
      levelTimerRef.current = window.setTimeout(tick, 100) as unknown as number
    }
    tick()

    // MediaRecorder with MIME fallback
    const mime = pickMime(undefined)
    setSupportedMimeType(mime)
    const mr = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined)
    mediaRecorderRef.current = mr
    chunksRef.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) as any }
    mr.onstop = () => {}
    mr.start(1000) // 1s chunks buffered internally

    setStatus('recording')
  }

  const stop: LectureRecorder['stop'] = async () => {
    if (status !== 'recording' && status !== 'paused') return null
    return new Promise<Blob | null>((resolve) => {
      const mr = mediaRecorderRef.current
      if (levelTimerRef.current) { clearTimeout(levelTimerRef.current); levelTimerRef.current = null }
      if (mr && mr.state !== 'inactive') {
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: (supportedMimeType || 'audio/webm') })
          // Snapshot chunks before cleanup so callers can fetch them
          snapshotChunksRef.current = [...chunksRef.current]
          cleanup()
          setStatus('stopped')
          resolve(blob)
        }
        mr.stop()
      } else {
        snapshotChunksRef.current = [...chunksRef.current]
        cleanup()
        setStatus('stopped')
        resolve(null)
      }
    })
  }

  const pause = () => {
    const mr = mediaRecorderRef.current
    if (mr?.state === 'recording') { mr.pause(); setStatus('paused') }
  }

  const resume = () => {
    const mr = mediaRecorderRef.current
    if (mr?.state === 'paused') { mr.resume(); setStatus('recording') }
  }

  const cleanup = () => {
    try { sourceRef.current?.disconnect() } catch {}
    try { hpfRef.current?.disconnect() } catch {}
    try { rnnoiseRef.current?.disconnect() } catch {}
    try { (expanderRef.current as any)?.disconnect?.() } catch {}
    try { compressorRef.current?.disconnect() } catch {}
    try { limiterRef.current?.disconnect() } catch {}
    try { analyserRef.current?.disconnect() } catch {}
    try { destRef.current?.disconnect() } catch {}

    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close()

    mediaStreamRef.current = null
    mediaRecorderRef.current = null
    audioCtxRef.current = null
    sourceRef.current = null
    hpfRef.current = null
    rnnoiseRef.current = null
    expanderRef.current = null
    compressorRef.current = null
    limiterRef.current = null
    analyserRef.current = null
    destRef.current = null
    chunksRef.current = []
  }

  useEffect(() => {
    return () => {
      if (levelTimerRef.current) { clearTimeout(levelTimerRef.current) }
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getRecordedChunks = () => snapshotChunksRef.current ? [...snapshotChunksRef.current] : [...chunksRef.current]

  return {
    status,
    levelDb,
    supportedMimeType,
    start,
    stop,
    pause,
    resume,
    listInputDevices,
    getRecordedChunks,
  }
}
