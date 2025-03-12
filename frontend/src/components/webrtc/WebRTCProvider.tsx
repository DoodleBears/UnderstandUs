import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { WebRTCManager } from '../../lib/webrtc/connection'
import { SocketIOSignaling } from '../../lib/webrtc/signaling'
import {
  SignalingConnectionOptions,
  WebRTCContextValue,
  WebRTCState,
} from '../../lib/webrtc/types'

const initialState: WebRTCState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  peers: new Map(),
  localStream: null,
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null)

export interface WebRTCProviderProps {
  children: React.ReactNode
  signalingUrl: string
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({
  children,
  signalingUrl,
}) => {
  const [state, setState] = useState<WebRTCState>(initialState)
  const [signaling, setSignaling] = useState<SocketIOSignaling | null>(null)
  const [rtcManager, setRtcManager] = useState<WebRTCManager | null>(null)
  const messageQueueRef = useRef<any[]>([])
  const isProcessingRef = useRef(false)

  // Process messages sequentially
  const processMessageQueue = async () => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0) {
      return
    }

    isProcessingRef.current = true
    try {
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift()
        await handleSignalingMessage(message)
      }
    } finally {
      isProcessingRef.current = false
    }
  }

  // 处理信令消息
  const handleSignalingMessage = async (message: any) => {
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
          // 当新用户加入时，更新状态
          setState((prev) => ({
            ...prev,
            peers: rtcManager.getPeers(),
          }))
          break
        case 'user_left':
          // 当用户离开时，清理连接
          rtcManager.closePeerConnection(message.data.user_id)
          setState((prev) => ({
            ...prev,
            peers: rtcManager.getPeers(),
          }))
          break
      }
    } catch (error) {
      console.error('Error handling signaling message:', error)
      setState((prev) => ({ ...prev, error: error as Error }))
    }
  }

  // 连接到房间
  const connect = async (roomId: string, userId: string) => {
    if (state.isConnecting || state.isConnected) {
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      const options: SignalingConnectionOptions = {
        url: signalingUrl,
        roomId,
        userId,
        onMessage: (message) => {
          messageQueueRef.current.push(message)
          processMessageQueue()
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            isConnected: false,
            error: error as Error,
          }))
        },
        onClose: () => {
          setState((prev) => ({
            ...prev,
            isConnected: false,
          }))
        },
      }

      const newSignaling = new SocketIOSignaling(options)
      const newRtcManager = new WebRTCManager(newSignaling)

      setSignaling(newSignaling)
      setRtcManager(newRtcManager)

      await newSignaling.connect()

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: error as Error,
      }))
    }
  }

  // 断开连接
  const disconnect = async () => {
    if (rtcManager) {
      rtcManager.closeAllConnections()
    }
    if (signaling) {
      await signaling.disconnect()
    }
    setState(initialState)
  }

  // 设置本地媒体流
  const setLocalStream = (stream: MediaStream) => {
    if (rtcManager) {
      rtcManager.setLocalStream(stream)
      setState((prev) => ({ ...prev, localStream: stream }))
    }
  }

  // 发送消息到对等端
  const sendMessage = (peerId: string, message: any) => {
    if (rtcManager) {
      rtcManager.sendMessage(peerId, message)
    }
  }

  // 清理函数
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const value: WebRTCContextValue = {
    state,
    actions: {
      connect,
      disconnect,
      setLocalStream,
      sendMessage,
    },
  }

  return (
    <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>
  )
}

export const useWebRTC = () => {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return context
}
