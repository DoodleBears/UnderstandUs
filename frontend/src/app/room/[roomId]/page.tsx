'use client'

import { AudioControl } from '@/components/audio/AudioControl'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioStatus } from '@/components/audio/AudioStatus'
import { useAudio } from '@/components/audio/useAudio'
import { useWebRTC, WebRTCProvider } from '@/components/webrtc/WebRTCProvider'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

interface Participant {
  user_id: string
  name: string
  joined_at: string
  is_host: boolean
}

interface Transcript {
  user_id: string
  text: string
  is_final: boolean
  timestamp: string
}

export default function RoomPage() {
  const { roomId } = useParams()
  const userIdRef = useRef<string>(uuidv4())
  // Wrap the actual content in providers
  return (
    <AudioProvider>
      <WebRTCProvider
        signalingUrl={`${process.env.NEXT_PUBLIC_WS_URL}/api/ws/room/${roomId}/user/${userIdRef.current}`}
      >
        <RoomContent userId={userIdRef.current} />
      </WebRTCProvider>
    </AudioProvider>
  )
}

function RoomContent({ userId }: { userId: string }) {
  const { roomId } = useParams()
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const audio = useAudio()
  const webrtc = useWebRTC()

  const handleWebSocketMessage = (message: any) => {
    console.log('handleWebSocketMessage', message)
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
        console.log('heartbeat_ack', message)
        break
    }
  }

  const { ws, isConnected, sendMessage } = useWebSocket(
    roomId,
    userId,
    handleWebSocketMessage
  )

  // Connect to WebRTC when audio is ready
  useEffect(() => {
    if (audio.isReady && audio.state.stream && roomId) {
      webrtc.actions.connect(roomId as string, userId)
      webrtc.actions.setLocalStream(audio.state.stream)
    }
  }, [audio.isReady, audio.state.stream, roomId])

  // Add effect to log isConnected changes
  useEffect(() => {
    console.log('isConnected state changed:', isConnected)
  }, [isConnected])

  const leaveRoom = () => {
    // Disconnect WebRTC
    webrtc.actions.disconnect()

    // 检查是否是最后一个用户
    if (participants.length === 1) {
      setShowDeleteModal(true)
    } else {
      // 如果不是最后一个用户，直接离开
      sendMessage({ type: 'leave_room' })
    }
  }

  const deleteRoom = async () => {
    try {
      // 先发送离开房间的消息
      sendMessage({ type: 'leave_room' })

      // 然后删除房间
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${roomId}`,
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
              <li key={participant.user_id} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                {participant.name}
                {webrtc.state.peers.has(participant.user_id) && (
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
