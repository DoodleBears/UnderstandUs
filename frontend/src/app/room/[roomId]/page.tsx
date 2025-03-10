'use client'

import { AudioControl } from '@/components/audio/AudioControl'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioStatus } from '@/components/audio/AudioStatus'
import { useAudio } from '@/components/audio/useAudio'
import { useWebRTC, WebRTCProvider } from '@/components/webrtc/WebRTCProvider'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'react-hot-toast'

interface Participant {
  id: string
  name: string
}

interface Transcript {
  user_id: string
  text: string
  is_final: boolean
  timestamp: string
}

export default function RoomPage() {
  const { roomId } = useParams()

  // Wrap the actual content in providers
  return (
    <AudioProvider>
      <WebRTCProvider signalingUrl={`ws://127.0.0.1:8000/api/ws/rtc/${roomId}`}>
        <RoomContent />
      </WebRTCProvider>
    </AudioProvider>
  )
}

function RoomContent() {
  const { roomId } = useParams()
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastHeartbeatRef = useRef<number>(Date.now())

  const audio = useAudio()
  const webrtc = useWebRTC()

  // Connect to WebRTC when audio is ready
  useEffect(() => {
    if (audio.isReady && audio.state.stream && roomId) {
      webrtc.actions.connect(
        roomId as string,
        'user-' + Math.random().toString(36).substr(2, 9)
      )
      webrtc.actions.setLocalStream(audio.state.stream)
    }
  }, [audio.isReady, audio.state.stream, roomId])

  // Add effect to log isConnected changes
  useEffect(() => {
    console.log('isConnected state changed:', isConnected)
  }, [isConnected])

  useEffect(() => {
    if (!roomId) return

    const connectWebSocket = () => {
      console.log('Attempting to connect to WebSocket...')
      const ws = new WebSocket(`ws://127.0.0.1:8000/api/ws/room/${roomId}`)
      console.log('WebSocket created with URL:', ws.url)
      console.log('Initial readyState:', ws.readyState)

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('Connection timeout')
          ws.close()
        }
      }, 5000)

      ws.onopen = () => {
        console.log('WebSocket connected successfully')
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        console.log('Setting isConnected to true')
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
        console.log('Setting isConnected to false')
        stopHeartbeat()
        clearTimeout(connectionTimeout)

        // Show more specific error messages
        if (event.code === 1006) {
          toast.error(
            'Connection failed. Please check if the room exists and the server is running.'
          )
        } else {
          toast.error(
            `Disconnected from room: ${event.reason || 'Unknown reason'}`
          )
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.log('Current readyState:', ws.readyState)
        clearTimeout(connectionTimeout)
        toast.error('Connection error')
      }

      ws.onmessage = (event) => {
        console.log('Received message:', event.data)
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }

      wsRef.current = ws
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      stopHeartbeat()
    }
  }, [roomId])

  const startHeartbeat = (ws: WebSocket) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
  }

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'room_update':
        setParticipants(message.payload.participants)
        console.log('room_update', message)
        break
      case 'transcript':
        setTranscripts((prev) => [...prev, message])
        console.log('transcript', message)
        break
      case 'heartbeat_ack':
        lastHeartbeatRef.current = Date.now()
        console.log('heartbeat_ack', message)
        break
    }
  }

  const leaveRoom = () => {
    // Disconnect WebRTC
    webrtc.actions.disconnect()

    // 检查是否是最后一个用户
    if (participants.length === 1) {
      setShowDeleteModal(true)
    } else {
      // 如果不是最后一个用户，直接离开
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'leave_room' }))
        wsRef.current.close()
      }
    }
  }

  const deleteRoom = async () => {
    try {
      // 先发送离开房间的消息
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'leave_room' }))
        wsRef.current.close()
      }

      // 然后删除房间
      const response = await fetch(
        `http://127.0.0.1:8000/api/rooms/${roomId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete room')
      }

      toast.success('Room deleted successfully')
      router.push('/')
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('Failed to delete room')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster position="top-right" />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Room: {roomId}</h1>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <button
            onClick={leaveRoom}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-xl font-semibold">Audio Controls</h2>
        <div className="flex flex-col gap-4">
          <AudioControl showDeviceSelector showVolumeControl />
          <AudioStatus showDeviceInfo showMetrics />
        </div>
      </div>

      {/* Delete Room Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Delete Room</h2>
            <p className="mb-6 text-gray-600">
              You are the last participant in this room. Would you like to
              delete the room?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={deleteRoom}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add debug info */}
      <div className="mb-2 text-xs text-gray-500">
        Debug: isConnected = {String(isConnected)}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-2 text-xl font-semibold">Participants</h2>
          <ul className="space-y-2">
            {participants.map((participant) => (
              <li key={participant.id} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                {participant.name}
                {webrtc.state.peers.has(participant.id) && (
                  <span className="ml-2 text-xs text-green-500">
                    (Audio Connected)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-2 text-xl font-semibold">Transcripts</h2>
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {transcripts.map((transcript, index) => (
              <div key={index} className="rounded bg-gray-50 p-2">
                <div className="font-medium">{transcript.user_id}</div>
                <div className="text-gray-700">{transcript.text}</div>
                <div className="text-xs text-gray-500">
                  {new Date(transcript.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
