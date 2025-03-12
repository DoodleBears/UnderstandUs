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
  const rtcManagerRef = useRef<WebRTCManager | null>(null)
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
    if (!rtcManagerRef.current) {
      console.warn('收到消息但 rtcManager 未初始化', message)
      return
    }

    try {
      console.log('开始处理信令消息:', {
        type: message.type,
        from: message.data.from_user_id,
      })
      switch (message.type) {
        case 'offer':
          console.log('处理来自用户的offer:', message.data.from_user_id)
          await rtcManagerRef.current.handleOffer(
            message.data.from_user_id,
            message.data.sdp
          )
          break
        case 'answer':
          console.log('处理来自用户的answer:', message.data.from_user_id)
          await rtcManagerRef.current.handleAnswer(
            message.data.from_user_id,
            message.data.sdp
          )
          break
        case 'ice_candidate':
          console.log('处理来自用户的ICE candidate:', message.data.from_user_id)
          await rtcManagerRef.current.handleIceCandidate(
            message.data.from_user_id,
            message.data.candidate
          )
          break
        case 'user_joined':
          console.log('检测到新用户加入:', {
            userId: message.data.user_id,
            currentPeers: Array.from(rtcManagerRef.current.getPeers().keys()),
          })
          const peer = await rtcManagerRef.current.createPeerConnection(
            message.data.user_id
          )
          console.log('对等连接创建完成，准备发送 offer')
          await rtcManagerRef.current.createOffer(message.data.user_id)
          console.log('offer 已发送')
          setState((prev) => ({
            ...prev,
            peers: rtcManagerRef.current!.getPeers(),
          }))
          break
        case 'user_left':
          console.log('用户离开房间:', message.data.user_id)
          rtcManagerRef.current.closePeerConnection(message.data.user_id)
          setState((prev) => ({
            ...prev,
            peers: rtcManagerRef.current!.getPeers(),
          }))
          break
      }
    } catch (error) {
      console.error('处理信令消息时出错:', error)
      setState((prev) => ({ ...prev, error: error as Error }))
    }
  }

  // 连接到房间
  const connect = async (roomId: string, userId: string) => {
    if (state.isConnecting || state.isConnected) {
      return
    }

    console.log('开始连接到房间', { roomId, userId })
    setState((prev) => ({ ...prev, isConnecting: true }))

    // 创建信令连接
    const signalingOptions: SignalingConnectionOptions = {
      url: signalingUrl,
      roomId,
      userId,
      onMessage: (message) => {
        console.log('收到信令消息，加入消息队列', message)
        messageQueueRef.current.push(message)
        processMessageQueue()
      },
      onError: (error) => {
        console.error('信令连接错误', error)
        setState((prev) => ({ ...prev, error }))
      },
      onClose: () => {
        console.log('信令连接关闭')
        setState((prev) => ({ ...prev, isConnected: false }))
      },
    }

    const newSignaling = new SocketIOSignaling(signalingOptions)
    console.log('正在建立信令连接...')
    await newSignaling.connect()
    console.log('信令连接已建立')
    setSignaling(newSignaling)

    // 创建 WebRTC 管理器
    const newRtcManager = new WebRTCManager(newSignaling)
    console.log('WebRTC 管理器已创建')
    rtcManagerRef.current = newRtcManager

    setState((prev) => ({
      ...prev,
      isConnecting: false,
      isConnected: true,
    }))
  }

  // 断开连接
  const disconnect = async () => {
    if (rtcManagerRef.current) {
      rtcManagerRef.current.closeAllConnections()
    }
    if (signaling) {
      await signaling.disconnect()
    }
    setState(initialState)
  }

  // 设置本地媒体流
  const setLocalStream = (stream: MediaStream) => {
    if (rtcManagerRef.current) {
      rtcManagerRef.current.setLocalStream(stream)
      setState((prev) => ({ ...prev, localStream: stream }))
    }
  }

  // 发送消息到对等端
  const sendMessage = (peerId: string, message: any) => {
    if (rtcManagerRef.current) {
      rtcManagerRef.current.sendMessage(peerId, message)
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
