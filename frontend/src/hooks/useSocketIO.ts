import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'

export const useSocketIO = (
  roomId: string | undefined,
  userId: string,
  userName: string,
  onMessage?: (message: any) => void
) => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const isInitializedRef = useRef(false)
  const hasJoinedRoomRef = useRef(false)
  const roomRef = useRef(roomId)
  const userIdRef = useRef(userId)
  const userNameRef = useRef(userName)
  const onMessageRef = useRef(onMessage)

  // Update refs when props change
  useEffect(() => {
    roomRef.current = roomId
    userIdRef.current = userId
    onMessageRef.current = onMessage
  }, [roomId, userId, onMessage])

  // Memoize message handler
  const handleMessage = useCallback((type: string, data: any) => {
    console.log(`Received ${type}:`, data)
    onMessageRef.current?.({ type, payload: data })
  }, [])

  // Socket initialization
  useEffect(() => {
    if (!roomId || isInitializedRef.current) {
      return
    }

    console.log('Initializing Socket.IO connection...', {
      url: process.env.NEXT_PUBLIC_WS_URL || '',
      roomId: roomRef.current,
      userId: userIdRef.current,
    })

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || '', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io',
      timeout: 20000,
      forceNew: false,
      query: {
        roomId: roomRef.current,
        userId: userIdRef.current,
      },
    })

    const joinRoom = () => {
      if (!hasJoinedRoomRef.current && socket.connected) {
        console.log('Joining room...', {
          roomId: roomRef.current,
          userId: userIdRef.current,
          userName: userNameRef.current,
        })
        socket.emit('join_room', {
          room_id: roomRef.current,
          user_id: userIdRef.current,
          user_name: userNameRef.current,
        })
        hasJoinedRoomRef.current = true
      }
    }

    const setupSocketListeners = () => {
      socket.on('connect', () => {
        console.log('Socket.IO connected successfully', {
          id: socket.id,
          connected: socket.connected,
        })
        setIsConnected(true)
        toast.success('Connected to room')
        joinRoom()
      })

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', {
          message: error.message,
          details: error,
        })
        setIsConnected(false)
        hasJoinedRoomRef.current = false
        toast.error(`Connection error: ${error.message}`)
      })

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', {
          reason,
          wasConnected: socket.connected,
          id: socket.id,
        })
        setIsConnected(false)
        hasJoinedRoomRef.current = false

        // Don't show error toast for client-initiated disconnects
        if (!reason.includes('client')) {
          toast.error(`Disconnected: ${reason}`)
        }

        // Only attempt to reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          socket.connect()
        }
      })

      socket.on('error', (error) => {
        console.error('Socket.IO error:', error)
        toast.error(error.message || 'An error occurred')
      })

      // Room events
      socket.on('join_room_success', (data) => {
        console.log('Successfully joined room:', data)
        // Request latest room info after joining
        socket.emit('get_room_info', {
          room_id: roomRef.current,
          user_id: userIdRef.current,
        })
      })

      socket.on('user_joined', (data) => {
        if (data.user_id !== userIdRef.current) {
          handleMessage('user_joined', data)
          // Request updated room info when someone joins
          socket.emit('get_room_info', {
            room_id: roomRef.current,
            user_id: userIdRef.current,
          })
        }
      })

      socket.on('user_left', (data) => {
        if (data.user_id !== userIdRef.current) {
          handleMessage('user_left', data)
          // Request updated room info when someone leaves
          socket.emit('get_room_info', {
            room_id: roomRef.current,
            user_id: userIdRef.current,
          })
        }
      })

      socket.on('room_info', (data) => {
        console.log('Received room info:', data)
        handleMessage('room_update', data)
      })

      // WebRTC signaling
      socket.on('offer', (data) => handleMessage('offer', data))
      socket.on('answer', (data) => handleMessage('answer', data))
      socket.on('ice_candidate', (data) => handleMessage('ice_candidate', data))
      socket.on('heartbeat_ack', (data) => handleMessage('heartbeat_ack', data))
    }

    setupSocketListeners()
    socketRef.current = socket
    isInitializedRef.current = true

    // Cleanup function
    return () => {
      console.log('Cleaning up Socket.IO connection...', {
        roomId: roomRef.current,
        userId: userIdRef.current,
        isConnected: socket.connected,
      })

      if (socket.connected) {
        socket.emit('leave_room', {
          room_id: roomRef.current,
          user_id: userIdRef.current,
        })
      }

      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      isInitializedRef.current = false
      hasJoinedRoomRef.current = false
      setIsConnected(false)
    }
  }, [roomId, handleMessage])

  const sendMessage = useCallback(
    (message: any) => {
      if (socketRef.current?.connected) {
        console.log('Sending message:', message)
        socketRef.current.emit(message.type, {
          ...message.data,
          room_id: roomRef.current,
          user_id: userIdRef.current,
        })
      } else {
        console.error('Socket.IO is not connected', {
          socketExists: !!socketRef.current,
          isConnected,
        })
        toast.error('Connection lost. Trying to reconnect...')
      }
    },
    [isConnected]
  )

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
  }
}
