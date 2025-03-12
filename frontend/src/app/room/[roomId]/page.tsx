'use client'

import { AudioControl } from '@/components/audio/AudioControl'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioStatus } from '@/components/audio/AudioStatus'
import { useAudio } from '@/components/audio/useAudio'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWebRTC, WebRTCProvider } from '@/components/webrtc/WebRTCProvider'
import { useSocketIO } from '@/hooks/useSocketIO'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Load user ID and name from localStorage
    const savedUserId = localStorage.getItem('userId')
    const savedUserName = localStorage.getItem('userName')

    if (!savedUserId || !savedUserName) {
      // If no user info, generate random ones
      const newUserId = uuidv4()
      const newUserName = `用户${newUserId.slice(0, 4)}`
      setUserId(newUserId)
      setUserName(newUserName)
      localStorage.setItem('userId', newUserId)
      localStorage.setItem('userName', newUserName)
    } else {
      setUserId(savedUserId)
      setUserName(savedUserName)
    }
  }, [])

  if (!userId || !userName) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <AudioProvider>
      <WebRTCProvider
        signalingUrl={`${process.env.NEXT_PUBLIC_WS_URL}/socket.io`}
      >
        <RoomContent userId={userId} userName={userName} />
      </WebRTCProvider>
    </AudioProvider>
  )
}

function RoomContent({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
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
    userName,
    handleSocketMessage
  )

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show confirmation dialog
      e.preventDefault()
      e.returnValue = ''
    }

    const handleUnload = () => {
      // User confirmed closing the page
      if (isConnected) {
        sendMessage({ type: 'leave_room' })
      }
      webrtc.actions.disconnect()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    // Cleanup function - only remove event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
    }
  }, [isConnected, webrtc.actions])

  // Handle component unmount
  useEffect(() => {
    // Only add cleanup for actual unmount
    return () => {
      if (isConnected) {
        sendMessage({ type: 'leave_room' })
        webrtc.actions.disconnect()
      }
    }
  }, []) // Empty dependency array ensures this only runs on unmount

  // Send user info when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage({
        type: 'user_info',
        data: {
          name: userName,
        },
      })
    }
  }, [isConnected, userName])

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
      {/* Top Header */}
      <header className="bg-background border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Room ID: {roomId}</h1>
          </div>
          <Button
            variant="destructive"
            onClick={leaveRoom}
            className="shrink-0"
          >
            Leave Room
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid h-full grid-cols-[300px_1fr] gap-4">
          {/* Participants Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({participants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.user_id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <span className="font-medium">{participant.name}</span>
                      <AudioStatus />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Transcripts Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Transcripts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-4">
                  {transcripts.map((transcript, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(
                            transcript.payload.timestamp
                          ).toLocaleTimeString()}
                        </span>
                        <span className="font-medium">
                          {
                            participants.find(
                              (p) => p.user_id === transcript.payload.user_id
                            )?.name
                          }
                        </span>
                      </div>
                      <p className="mt-2">{transcript.payload.text}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Audio Controls */}
      <div className="bg-background border-t px-4 py-3">
        <div className="flex items-center justify-center">
          <AudioControl
            showDeviceSelector={false}
            className="flex-row items-center gap-4"
          />
        </div>
      </div>

      <Toaster />
    </div>
  )
}
