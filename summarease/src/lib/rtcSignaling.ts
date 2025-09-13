import { supabase } from './supabase'

export type SignalMessage = {
  type: 'offer' | 'answer' | 'ice' | 'client-ready'
  payload?: any
}

export type SignalingChannel = {
  send: (msg: SignalMessage) => Promise<void>
  onMessage: (handler: (msg: SignalMessage) => void) => void
  close: () => Promise<void>
}

export async function createSignalingChannel(sessionId: string): Promise<SignalingChannel> {
  const channel = supabase.channel(`remote-mic:${sessionId}`, { config: { broadcast: { ack: true } } })
  await channel.subscribe()

  const handlers: ((msg: SignalMessage) => void)[] = []

  channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
    handlers.forEach(h => h(payload as SignalMessage))
  })

  return {
    async send(msg: SignalMessage) {
      await channel.send({ type: 'broadcast', event: 'signal', payload: msg })
    },
    onMessage(handler) {
      handlers.push(handler)
    },
    async close() {
      await channel.unsubscribe()
    }
  }
}

export function defaultIceServers(): RTCIceServer[] {
  return [
    { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }
  ]
}