export interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  stream: MediaStream | null
  dataChannel: RTCDataChannel | null
}

export interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice_candidate'
  data: any
}

export interface WebRTCState {
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  peers: Map<string, PeerConnection>
  localStream: MediaStream | null
}

export interface WebRTCContextValue {
  state: WebRTCState
  actions: {
    connect: (roomId: string, userId: string) => Promise<void>
    disconnect: () => Promise<void>
    setLocalStream: (stream: MediaStream) => void
    sendMessage: (peerId: string, message: any) => void
  }
}

export interface RTCConfiguration {
  iceServers: RTCIceServer[]
  iceTransportPolicy?: RTCIceTransportPolicy
  bundlePolicy?: RTCBundlePolicy
  rtcpMuxPolicy?: RTCRtcpMuxPolicy
  iceCandidatePoolSize?: number
}

export interface PeerConnectionOptions {
  configuration?: RTCConfiguration
  dataChannelOptions?: RTCDataChannelInit
}

export interface SignalingConnectionOptions {
  url: string
  roomId: string
  userId: string
  onMessage?: (message: SignalingMessage) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

export type SignalingConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface SignalingConnection {
  state: SignalingConnectionState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  send: (message: SignalingMessage) => Promise<void>
}
