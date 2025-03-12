import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'

export const useWebSocket = (
  roomId: string | undefined,
  userId: string,
  onMessage?: (message: any) => void
) => {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastHeartbeatRef = useRef<number>(Date.now())
  const connectionAttemptsRef = useRef(0)
  const maxAttempts = 3
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!roomId || isInitializedRef.current) return

    const connectWebSocket = () => {
      console.log('Attempting to connect to WebSocket...')
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/api/ws/room/${roomId}/user/${userId}`
      )

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('Connection timeout')
          ws.close()
          if (connectionAttemptsRef.current < maxAttempts) {
            connectionAttemptsRef.current++
            console.log(
              `Retrying connection (attempt ${connectionAttemptsRef.current}/${maxAttempts})...`
            )
            setTimeout(connectWebSocket, 2000)
          }
        }
      }, 5000)

      ws.onopen = () => {
        console.log('WebSocket connected successfully')
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        startHeartbeat(ws)
        toast.success('Connected to room')
      }

      ws.onclose = (event) => {
        console.log(
          'WebSocket closed with code:',
          event.code,
          'reason:',
          event.reason,
          'wasClean:',
          event.wasClean
        )
        setIsConnected(false)
        stopHeartbeat()
        clearTimeout(connectionTimeout)

        if (event.code === 1006) {
          toast.error(
            'Connection failed. Please check if the room exists and the server is running.'
          )
        } else {
          toast.error(
            `Disconnected from room: ${event.reason || 'Unknown reason'}`
          )
        }

        if (!event.wasClean && connectionAttemptsRef.current < maxAttempts) {
          connectionAttemptsRef.current++
          console.log(
            `Retrying connection (attempt ${connectionAttemptsRef.current}/${maxAttempts})...`
          )
          setTimeout(connectWebSocket, 2000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.log('Current readyState:', ws.readyState)
        clearTimeout(connectionTimeout)
        toast.error('Connection error')
      }

      ws.onmessage = (event) => {
        console.log('ws.onmessage:', event.data)
        const message = JSON.parse(event.data)

        // Handle heartbeat_ack internally
        if (message.type === 'heartbeat_ack') {
          lastHeartbeatRef.current = Date.now()
        }

        // Forward all messages to the callback
        onMessage?.(message)
      }

      wsRef.current = ws
      isInitializedRef.current = true
    }

    connectWebSocket()

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      stopHeartbeat()
    }
  }, [roomId, userId, onMessage])

  const startHeartbeat = (ws: WebSocket) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, 30000)
  }

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
  }

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
      toast.error('Connection lost. Trying to reconnect...')
    }
  }

  return { ws: wsRef.current, isConnected, sendMessage }
}
