import React, { createContext, useContext, useEffect, useState } from 'react'
import { WebRTCManager } from '../../lib/webrtc/connection'
import { WebSocketSignaling } from '../../lib/webrtc/signaling'
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
  const [signaling, setSignaling] = useState<WebSocketSignaling | null>(null)
  const [rtcManager, setRtcManager] = useState<WebRTCManager | null>(null)

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
        onMessage: handleSignalingMessage,
        onError: handleSignalingError,
        onClose: handleSignalingClose,
      }

      const newSignaling = new WebSocketSignaling(options)
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
    if (!state.isConnected) {
      return
    }

    try {
      rtcManager?.closeAllConnections()
      await signaling?.disconnect()

      setState((prev) => ({
        ...prev,
        isConnected: false,
        peers: new Map(),
      }))
    } catch (error) {
      console.error('断开连接失败:', error)
    }
  }

  // 设置本地流
  const setLocalStream = (stream: MediaStream) => {
    rtcManager?.setLocalStream(stream)
    setState((prev) => ({ ...prev, localStream: stream }))
  }

  // 发送消息
  const sendMessage = (peerId: string, message: any) => {
    const peer = state.peers.get(peerId)
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(message))
    }
  }

  // 处理信令消息
  const handleSignalingMessage = async (message: any) => {
    if (!rtcManager) return

    try {
      switch (message.type) {
        case 'offer':
          await rtcManager.handleOffer(message.data.peerId, message.data.sdp)
          break
        case 'answer':
          await rtcManager.handleAnswer(message.data.peerId, message.data.sdp)
          break
        case 'ice_candidate':
          await rtcManager.handleIceCandidate(
            message.data.peerId,
            message.data.candidate
          )
          break
        case 'peer_join':
          const peer = await rtcManager.createPeerConnection(
            message.data.peerId
          )
          setState((prev) => ({
            ...prev,
            peers: new Map(prev.peers).set(message.data.peerId, peer),
          }))
          await rtcManager.createOffer(message.data.peerId)
          break
        case 'peer_leave':
          rtcManager.closePeerConnection(message.data.peerId)
          setState((prev) => {
            const newPeers = new Map(prev.peers)
            newPeers.delete(message.data.peerId)
            return { ...prev, peers: newPeers }
          })
          break
      }
    } catch (error) {
      console.error('处理信令消息失败:', error)
    }
  }

  // 处理信令错误
  const handleSignalingError = (error: Error) => {
    console.error('信令错误:', error)
    setState((prev) => ({ ...prev, error }))
  }

  // 处理信令关闭
  const handleSignalingClose = () => {
    setState((prev) => ({ ...prev, isConnected: false }))
  }

  // 清理
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const contextValue: WebRTCContextValue = {
    state,
    actions: {
      connect,
      disconnect,
      setLocalStream,
      sendMessage,
    },
  }

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  )
}

export const useWebRTC = () => {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return context
}
