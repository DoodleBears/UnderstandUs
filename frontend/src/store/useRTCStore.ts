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

      // Create WebRTC manager with proper signaling
      const rtcManager = new WebRTCManager(signaling)

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

      // WebRTC signaling events
      socket.on('offer', async (data) => {
        await get().handleSignalingMessage({ type: 'offer', data })
      })

      socket.on('answer', async (data) => {
        await get().handleSignalingMessage({ type: 'answer', data })
      })

      socket.on('ice_candidate', async (data) => {
        await get().handleSignalingMessage({ type: 'ice_candidate', data })
      })

      socket.on('user_joined', async (data) => {
        await get().handleSignalingMessage({ type: 'user_joined', data })
      })

      socket.on('user_left', async (data) => {
        await get().handleSignalingMessage({ type: 'user_left', data })
      })

      set({ socket, rtcManager, isConnecting: false })
    } catch (error) {
      set({ error: error as Error, isConnecting: false })
    }
  },

  disconnect: () => {
    const { socket, rtcManager, roomId, userId } = get()

    if (socket) {
      socket.emit('leave_room', { room_id: roomId, user_id: userId })
      socket.disconnect()
    }

    if (rtcManager) {
      rtcManager.closeAllConnections()
    }

    set({
      socket: null,
      rtcManager: null,
      isConnected: false,
      peers: new Map(),
      localStream: null,
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
    const { rtcManager } = get()
    if (rtcManager) {
      rtcManager.setLocalStream(stream)
      set({ localStream: stream })
    }
  },

  createPeerConnection: async (peerId: string) => {
    const { rtcManager } = get()
    if (!rtcManager) throw new Error('RTC Manager not initialized')
    const peer = await rtcManager.createPeerConnection(peerId)
    set({ peers: rtcManager.getPeers() })
    return peer
  },

  handleSignalingMessage: async (message: any) => {
    const { rtcManager } = get()
    if (!rtcManager) return

    try {
      switch (message.type) {
        case 'offer':
          await rtcManager.handleOffer(
            message.data.from_user_id,
            message.data.sdp
          )
          break
        case 'answer':
          await rtcManager.handleAnswer(
            message.data.from_user_id,
            message.data.sdp
          )
          break
        case 'ice_candidate':
          await rtcManager.handleIceCandidate(
            message.data.from_user_id,
            message.data.candidate
          )
          break
        case 'user_joined':
          const peer = await rtcManager.createPeerConnection(
            message.data.user_id
          )
          await rtcManager.createOffer(message.data.user_id)
          set({ peers: rtcManager.getPeers() })
          break
        case 'user_left':
          rtcManager.closePeerConnection(message.data.user_id)
          set({ peers: rtcManager.getPeers() })
          break
      }
    } catch (error) {
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
