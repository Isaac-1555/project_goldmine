import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { defaultIceServers, createSignalingChannel } from '../lib/rtcSignaling'

export const RemoteMicClient: React.FC = () => {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [state, setState] = useState<'init' | 'ready' | 'connected'>('init')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let pc: RTCPeerConnection
    let active = true
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
        const channel = await createSignalingChannel(sessionId)
        pc = new RTCPeerConnection({ iceServers: defaultIceServers() })
        for (const track of stream.getTracks()) pc.addTrack(track, stream)
        pc.onicecandidate = (e) => { if (e.candidate) channel.send({ type: 'ice', payload: e.candidate }) }

        channel.onMessage(async (msg) => {
          if (!active) return
          try {
            if (msg.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await channel.send({ type: 'answer', payload: answer })
              setState('connected')
            } else if (msg.type === 'ice') {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload))
            }
          } catch (e) { setError(String(e)) }
        })

        await channel.send({ type: 'client-ready' })
        setState('ready')
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize microphone')
      }
    })()

    return () => { active = false; try { pc?.close() } catch {} }
  }, [sessionId])

  return (
    <div style={{ padding: 20 }}>
      <h2>Remote Mic - Phone</h2>
      <p>Session: <b>{sessionId}</b></p>
      {error ? (<div style={{ color: 'red' }}>{error}</div>) : (
        <p>{state === 'init' ? 'Requesting mic...' : state === 'ready' ? 'Ready. Waiting for host...' : 'Connected. Keep this page open.'}</p>
      )}
      <p>Tip: Lock your screen brightness to keep the page awake during long recordings.</p>
    </div>
  )
}