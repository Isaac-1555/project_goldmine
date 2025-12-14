import React, { useEffect, useRef, useState } from 'react'
import { defaultIceServers, createSignalingChannel } from '../lib/rtcSignaling'
import { useLectureRecorder } from '../hooks/useLectureRecorder'

function randomSessionId() {
  return Math.random().toString(36).slice(2, 8)
}

export const RemoteMicHost: React.FC = () => {
  const [sessionId] = useState(randomSessionId())
  const [status, setStatus] = useState<'waiting' | 'connected' | 'recording'>('waiting')
  const [joinUrl, setJoinUrl] = useState('')
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const [log, setLog] = useState<string[]>([])

  const rec = useLectureRecorder()

  useEffect(() => {
    const url = `${window.location.origin}/remote-mic/join/${sessionId}`
    setJoinUrl(url)
  }, [sessionId])

  useEffect(() => {
    ;(async () => {
      const channel = await createSignalingChannel(sessionId)
      const pc = new RTCPeerConnection({ iceServers: defaultIceServers() })
      pcRef.current = pc

      pc.onicecandidate = (e) => {
        if (e.candidate) channel.send({ type: 'ice', payload: e.candidate })
      }
      pc.ontrack = (e) => {
        const [stream] = e.streams
        remoteStreamRef.current = stream
        setStatus('connected')
        setLog(l => [...l, 'Remote track received'])
      }

      channel.onMessage(async (msg) => {
        try {
          if (msg.type === 'client-ready') {
            const offer = await pc.createOffer({ offerToReceiveAudio: true })
            await pc.setLocalDescription(offer)
            await channel.send({ type: 'offer', payload: offer })
          } else if (msg.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload))
          } else if (msg.type === 'ice') {
            await pc.addIceCandidate(new RTCIceCandidate(msg.payload))
          }
        } catch (e) {
          setLog(l => [...l, `Error handling message: ${String(e)}`])
        }
      })
    })()

    return () => { try { pcRef.current?.close() } catch { /* noop */ } }
  }, [sessionId])

  const startWithRemote = async () => {
    const stream = remoteStreamRef.current
    if (!stream) return
    await rec.start({ externalStream: stream, echoCancellation: false, noiseSuppression: true, autoGainControl: true, enableExpander: true, enableCompressor: true, enableRnnoise: true })
    setStatus('recording')
  }

  const stop = async () => {
    await rec.stop()
    setStatus('connected')
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Remote Mic - Host</h2>
      <p>Session ID: <b>{sessionId}</b></p>
      <p>Join URL (open on phone): <a href={joinUrl} target="_blank" rel="noreferrer">{joinUrl}</a></p>
      <ol>
        <li>Open the join URL on your phone.</li>
        <li>Grant mic permission on the phone.</li>
        <li>When connected, click Start to record using the phone mic.</li>
      </ol>

      <div style={{ marginTop: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <div>Status: {status}</div>
        {status === 'connected' && (
          <button className="btn btn-primary" onClick={startWithRemote}>Start Recording</button>
        )}
        {status === 'recording' && (
          <button className="btn btn-gray" onClick={stop}>Stop</button>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Log</h4>
        <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f9fafb', padding: 8 }}>{log.join('\n')}</pre>
      </div>
    </div>
  )
}