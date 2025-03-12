import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'

export const useSocketIO = (
  roomId: string | undefined,
  userId: string,
  onMessage?: (message: any) => void
) => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!roomId || isInitializedRef.current) return

    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/ws`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
      console.log('Socket.IO connected successfully')
      setIsConnected(true)
      toast.success('Connected to room')

      // 加入房间
      socket.emit('join_room', {
        room_id: roomId,
        user_id: userId,
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason)
      setIsConnected(false)
      toast.error(`Disconnected from room: ${reason}`)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      toast.error('Connection error')
    })

    socket.on('error', (error) => {
      console.error('Socket.IO error:', error)
      toast.error(error.message || 'An error occurred')
    })

    // 处理房间事件
    socket.on('user_joined', (data) => {
      console.log('User joined:', data)
      onMessage?.({ type: 'user_joined', payload: data })
    })

    socket.on('user_left', (data) => {
      console.log('User left:', data)
      onMessage?.({ type: 'user_left', payload: data })
    })

    socket.on('room_info', (data) => {
      console.log('Room info:', data)
      onMessage?.({ type: 'room_update', payload: data })
    })

    // 处理 WebRTC 信令
    socket.on('offer', (data) => {
      console.log('Received offer:', data)
      onMessage?.({ type: 'offer', payload: data })
    })

    socket.on('answer', (data) => {
      console.log('Received answer:', data)
      onMessage?.({ type: 'answer', payload: data })
    })

    socket.on('ice_candidate', (data) => {
      console.log('Received ICE candidate:', data)
      onMessage?.({ type: 'ice_candidate', payload: data })
    })

    // 处理心跳
    socket.on('heartbeat_ack', (data) => {
      console.log('Heartbeat acknowledged:', data)
      onMessage?.({ type: 'heartbeat_ack', payload: data })
    })

    socketRef.current = socket
    isInitializedRef.current = true

    // 清理函数
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_room', {
          room_id: roomId,
          user_id: userId,
        })
        socketRef.current.disconnect()
      }
    }
  }, [roomId, userId, onMessage])

  const sendMessage = (message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(message.type, {
        ...message.data,
        room_id: roomId,
        user_id: userId,
      })
    } else {
      console.error('Socket.IO is not connected')
      toast.error('Connection lost. Trying to reconnect...')
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
  }
}
