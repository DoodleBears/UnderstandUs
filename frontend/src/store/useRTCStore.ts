import { io, Socket } from 'socket.io-client'
import { create } from 'zustand'
import { WebRTCManager } from '../lib/webrtc/connection'
import {
  PeerConnection,
  SignalingConnection,
  SignalingMessage,
} from '../lib/webrtc/types'

interface Participant {
  id: string
  name: string
}

interface Transcript {
  text: string
  userId: string
  timestamp: number
}

interface RTCState {
  // Socket.IO state
  socket: Socket | null
  isConnected: boolean
  participants: Participant[]
  transcripts: Transcript[]

  // WebRTC state
  rtcManager: WebRTCManager | null
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  peers: Map<string, PeerConnection>
  isConnecting: boolean
  error: Error | null

  // Room info
  roomId: string | null
  userId: string | null
  userName: string | null
}

interface RTCActions {
  // Socket.IO actions
  connect: (roomId: string, userId: string, userName: string) => Promise<void>
  disconnect: () => void
  sendMessage: (type: string, data: any) => void

  // WebRTC actions
  setLocalStream: (stream: MediaStream) => void
  addRemoteStream: (peerId: string, stream: MediaStream) => void
  removeRemoteStream: (peerId: string) => void
  createPeerConnection: (peerId: string) => Promise<PeerConnection>
  handleSignalingMessage: (message: any) => Promise<void>

  // Room actions
  updateParticipants: (participants: Participant[]) => void
  addTranscript: (transcript: Transcript) => void
}

const useRTCStore = create<RTCState & RTCActions>((set, get) => ({
  // Initial state
  socket: null,
  isConnected: false,
  participants: [],
  transcripts: [],
  rtcManager: null,
  localStream: null,
  remoteStreams: new Map(),
  peers: new Map(),
  isConnecting: false,
  error: null,
  roomId: null,
  userId: null,
  userName: null,

  // Socket.IO actions
  connect: async (roomId: string, userId: string, userName: string) => {
    set({ isConnecting: true, roomId, userId, userName })

    try {
      const socket = io(process.env.NEXT_PUBLIC_WS_URL || '', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        path: '/socket.io',
        timeout: 20000,
      })

      // Create a signaling implementation that wraps the socket
      const signaling: SignalingConnection = {
        state: 'disconnected',
        connect: async () => {
          return new Promise((resolve) => {
            socket.once('connect', resolve)
          })
        },
        disconnect: async () => {
          socket.disconnect()
          return Promise.resolve()
        },
        send: async (message: SignalingMessage) => {
          return new Promise((resolve) => {
            socket.emit(message.type, {
              ...message.data,
              room_id: roomId,
              user_id: userId,
            })
            resolve()
          })
        },
      }

      // Create WebRTC manager with proper signaling and ICE servers
      const rtcManager = new WebRTCManager(signaling, {
        configuration: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      })

      // Set up socket event listeners
      socket.on('connect', () => {
        set({ isConnected: true })
        socket.emit('join_room', {
          room_id: roomId,
          user_id: userId,
          user_name: userName,
        })
      })

      socket.on('disconnect', () => {
        set({ isConnected: false })
      })

      socket.on('room_info', (data) => {
        get().updateParticipants(data.participants)
      })

      socket.on('transcript', (data) => {
        get().addTranscript(data.payload)
      })

      // Handle existing users list
      socket.on('existing_users', async (data) => {
        console.log('Received existing users list:', data.users)
      })

      // WebRTC signaling events
      socket.on('user_joined', async (data) => {
        if (data.user_id !== userId) {
          console.log('New user joined, creating connection:', data.user_id)
          await get().handleSignalingMessage({
            type: 'user_joined',
            data: {
              user_id: data.user_id,
              user_name: data.user_name,
            },
          })
        }
      })

      socket.on('offer', async (data) => {
        console.log('Received offer:', data)
        await get().handleSignalingMessage({ type: 'offer', data })
      })

      socket.on('answer', async (data) => {
        console.log('Received answer:', data)
        await get().handleSignalingMessage({ type: 'answer', data })
      })

      socket.on('ice_candidate', async (data) => {
        console.log('Received ICE candidate:', data)
        await get().handleSignalingMessage({ type: 'ice_candidate', data })
      })

      socket.on('user_left', async (data) => {
        if (data.user_id !== userId) {
          console.log('User left:', data.user_id)
          get().removeRemoteStream(data.user_id)
          await get().handleSignalingMessage({ type: 'user_left', data })
        }
      })

      set({ socket, rtcManager, isConnecting: false })
    } catch (error) {
      set({ error: error as Error, isConnecting: false })
    }
  },

  disconnect: () => {
    const { socket, rtcManager, roomId, userId, localStream } = get()

    if (socket) {
      socket.emit('leave_room', { room_id: roomId, user_id: userId })
      socket.disconnect()
    }

    if (rtcManager) {
      rtcManager.closeAllConnections()
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    set({
      socket: null,
      rtcManager: null,
      isConnected: false,
      peers: new Map(),
      localStream: null,
      remoteStreams: new Map(),
      roomId: null,
      userId: null,
      userName: null,
    })
  },

  sendMessage: (type: string, data: any) => {
    const { socket, roomId, userId } = get()
    if (socket?.connected) {
      socket.emit(type, {
        ...data,
        room_id: roomId,
        user_id: userId,
      })
    }
  },

  // WebRTC actions
  setLocalStream: (stream: MediaStream) => {
    const { rtcManager, peers } = get()
    if (rtcManager) {
      console.log('[WebRTC] Setting local stream:', {
        streamId: stream.id,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })),
      })
      rtcManager.setLocalStream(stream)

      // Add local stream to all existing peer connections
      peers.forEach((peer, peerId) => {
        console.log(`[WebRTC] Adding local stream to existing peer ${peerId}`)
        stream.getTracks().forEach((track) => {
          peer.connection.addTrack(track, stream)
        })
      })

      set({ localStream: stream })
    }
  },

  addRemoteStream: (peerId: string, stream: MediaStream) => {
    console.log(`[WebRTC] Adding remote stream to store for peer ${peerId}:`, {
      streamId: stream.id,
      tracks: stream.getTracks().map((t) => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        settings: t.getSettings(),
      })),
    })
    set((state) => ({
      remoteStreams: new Map(state.remoteStreams).set(peerId, stream),
    }))
  },

  removeRemoteStream: (peerId: string) => {
    set((state) => {
      const newRemoteStreams = new Map(state.remoteStreams)
      newRemoteStreams.delete(peerId)
      return { remoteStreams: newRemoteStreams }
    })
  },

  createPeerConnection: async (peerId: string) => {
    const { rtcManager, localStream } = get()
    if (!rtcManager) throw new Error('RTC Manager not initialized')

    const peer = await rtcManager.createPeerConnection(peerId)

    // Add local stream tracks to the new peer connection
    if (localStream) {
      console.log(
        `[WebRTC] Adding local stream tracks to new peer ${peerId}:`,
        {
          streamId: localStream.id,
          tracks: localStream.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
          })),
        }
      )
      localStream.getTracks().forEach((track) => {
        const sender = peer.connection.addTrack(track, localStream)
        console.log(`[WebRTC] Added track to peer ${peerId}:`, {
          trackKind: track.kind,
          trackId: track.id,
          senderId: sender.id,
        })
      })
    }

    // Handle remote stream
    peer.connection.ontrack = (event) => {
      console.log(`[WebRTC] Received track from peer ${peerId}:`, {
        kind: event.track.kind,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        streams: event.streams.length,
        settings: event.track.getSettings(),
      })

      // Monitor track state changes
      event.track.onmute = () =>
        console.log(`[WebRTC] Track muted from peer ${peerId}`)
      event.track.onunmute = () =>
        console.log(`[WebRTC] Track unmuted from peer ${peerId}`)
      event.track.onended = () =>
        console.log(`[WebRTC] Track ended from peer ${peerId}`)

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0]
        console.log(`[WebRTC] Adding remote stream from ${peerId}:`, {
          streamId: stream.id,
          tracks: stream.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            settings: t.getSettings(),
          })),
        })

        // Monitor stream state
        stream.onaddtrack = () =>
          console.log(`[WebRTC] Track added to stream from peer ${peerId}`)
        stream.onremovetrack = () =>
          console.log(`[WebRTC] Track removed from stream from peer ${peerId}`)

        // 确保音频轨道是活跃的
        stream.getAudioTracks().forEach((track) => {
          if (!track.enabled) {
            console.log(
              `[WebRTC] Enabling disabled audio track for peer ${peerId}`
            )
            track.enabled = true
          }
        })

        get().addRemoteStream(peerId, stream)
      } else {
        console.warn(
          `[WebRTC] Received track without stream from peer ${peerId}`
        )
      }
    }

    // Add connection state logging
    peer.connection.onconnectionstatechange = () => {
      const state = peer.connection.connectionState
      console.log(`[WebRTC] Connection state changed for peer ${peerId}:`, {
        state,
        timestamp: new Date().toISOString(),
      })

      // If connected, verify audio tracks
      if (state === 'connected') {
        const senders = peer.connection.getSenders()
        const receivers = peer.connection.getReceivers()
        console.log(`[WebRTC] Connection established with peer ${peerId}:`, {
          senders: senders.map((s) => ({
            track: s.track
              ? {
                  kind: s.track.kind,
                  enabled: s.track.enabled,
                  muted: s.track.muted,
                  readyState: s.track.readyState,
                }
              : null,
          })),
          receivers: receivers.map((r) => ({
            track: r.track
              ? {
                  kind: r.track.kind,
                  enabled: r.track.enabled,
                  muted: r.track.muted,
                  readyState: r.track.readyState,
                }
              : null,
          })),
        })
      }
    }

    peer.connection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state changed for peer ${peerId}:`, {
        state: peer.connection.iceConnectionState,
        timestamp: new Date().toISOString(),
      })
    }

    peer.connection.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state changed for peer ${peerId}:`, {
        state: peer.connection.iceGatheringState,
        timestamp: new Date().toISOString(),
      })
    }

    peer.connection.onnegotiationneeded = () => {
      console.log(`[WebRTC] Negotiation needed for peer ${peerId}:`, {
        signalingState: peer.connection.signalingState,
        timestamp: new Date().toISOString(),
      })
    }

    peer.connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] New ICE candidate for peer ${peerId}:`, {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          timestamp: new Date().toISOString(),
        })
      }
    }

    set({ peers: rtcManager.getPeers() })
    return peer
  },

  handleSignalingMessage: async (message: any) => {
    const { rtcManager } = get()
    if (!rtcManager) return

    try {
      switch (message.type) {
        case 'offer':
          console.log(
            `[WebRTC] Processing offer from ${message.data.from_user_id}`
          )
          await rtcManager.handleOffer(
            message.data.from_user_id,
            message.data.sdp
          )
          break
        case 'answer':
          console.log(
            `[WebRTC] Processing answer from ${message.data.from_user_id}`
          )
          await rtcManager.handleAnswer(
            message.data.from_user_id,
            message.data.sdp
          )
          break
        case 'ice_candidate':
          console.log(
            `[WebRTC] Processing ICE candidate from ${message.data.from_user_id}`
          )
          await rtcManager.handleIceCandidate(
            message.data.from_user_id,
            message.data.candidate
          )
          break
        case 'user_joined':
          const peerId = message.data.user_id
          console.log(`[WebRTC] User joined: ${peerId}`)

          // Check if we already have a connection with this peer
          const existingPeer = rtcManager.getPeers().get(peerId)
          if (existingPeer) {
            console.log(
              `[WebRTC] Connection already exists for peer ${peerId}, checking state:`,
              {
                connectionState: existingPeer.connection.connectionState,
                iceConnectionState: existingPeer.connection.iceConnectionState,
                signalingState: existingPeer.connection.signalingState,
              }
            )

            // If the connection is in a failed or disconnected state, close it and create a new one
            if (
              ['failed', 'disconnected', 'closed'].includes(
                existingPeer.connection.connectionState
              )
            ) {
              console.log(
                `[WebRTC] Existing connection is in bad state, recreating for peer ${peerId}`
              )
              rtcManager.closePeerConnection(peerId)
            } else {
              console.log(
                `[WebRTC] Using existing connection for peer ${peerId}`
              )
              return
            }
          }

          // Create new peer connection
          console.log(`[WebRTC] Creating new connection for peer ${peerId}`)
          const peer = await rtcManager.createPeerConnection(peerId)
          await rtcManager.createOffer(peerId)
          set({ peers: rtcManager.getPeers() })
          break
        case 'user_left':
          console.log(`[WebRTC] User left: ${message.data.user_id}`)
          rtcManager.closePeerConnection(message.data.user_id)
          set({ peers: rtcManager.getPeers() })
          break
      }
    } catch (error) {
      console.error('[WebRTC] Error handling signaling message:', error)
      set({ error: error as Error })
    }
  },

  // Room actions
  updateParticipants: (participants: Participant[]) => {
    set({ participants })
  },

  addTranscript: (transcript: Transcript) => {
    set((state) => ({
      transcripts: [...state.transcripts, transcript],
    }))
  },
}))

export default useRTCStore
