'use client'

import { AudioControl } from '@/components/audio/AudioControl'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioStatus } from '@/components/audio/AudioStatus'
import { useAudio } from '@/components/audio/useAudio'
import { useWebRTC, WebRTCProvider } from '@/components/webrtc/WebRTCProvider'
import { useSocketIO } from '@/hooks/useSocketIO'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

interface Participant {
  user_id: string
  name: string
  joined_at: string
  is_host: boolean
}

interface Transcript {
  type: 'transcript'
  payload: {
    text: string
    user_id: string
    timestamp: number
  }
}

export default function RoomPage() {
  const { roomId } = useParams()
  const userIdRef = useRef<string>(uuidv4())

  return (
    <AudioProvider>
      <WebRTCProvider signalingUrl={`${process.env.NEXT_PUBLIC_WS_URL}/ws`}>
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

  const handleSocketMessage = (message: any) => {
    console.log('handleSocketMessage', message)
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

  const { socket, isConnected, sendMessage } = useSocketIO(
    roomId as string,
    userId,
    handleSocketMessage
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
      router.push('/')
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="bg-background flex items-center justify-between border-b p-4">
        <h1 className="text-xl font-semibold">Room: {roomId}</h1>
        <div className="flex items-center space-x-4">
          <AudioControl />
          <button
            onClick={leaveRoom}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded px-4 py-2"
          >
            Leave Room
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-[1fr_300px]">
          {/* Main content area */}
          <div className="overflow-y-auto p-4">
            <div className="space-y-4">
              {transcripts.map((transcript, index) => (
                <div
                  key={index}
                  className="bg-card space-y-2 rounded-lg p-4 shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      {new Date(
                        transcript.payload.timestamp
                      ).toLocaleTimeString()}
                    </span>
                    <span className="text-sm font-medium">
                      {
                        participants.find(
                          (p) => p.user_id === transcript.payload.user_id
                        )?.name
                      }
                    </span>
                  </div>
                  <p className="text-foreground">{transcript.payload.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 border-l p-4">
            <h2 className="font-semibold">Participants</h2>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.user_id}
                  className="bg-card flex items-center justify-between rounded p-2"
                >
                  <span>{participant.name}</span>
                  <AudioStatus />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  )
}
