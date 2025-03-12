'use client'

import { AudioControl } from '@/components/audio/AudioControl'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioStatus } from '@/components/audio/AudioStatus'
import { useAudio } from '@/components/audio/useAudio'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import useRTCStore from '@/store/useRTCStore'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

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
      <RoomContent userId={userId} userName={userName} />
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const audio = useAudio()
  const {
    connect,
    disconnect,
    isConnected,
    participants,
    transcripts,
    setLocalStream,
  } = useRTCStore()

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    const handleUnload = () => {
      if (isConnected) {
        disconnect()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
    }
  }, [isConnected, disconnect])

  // Handle component unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect()
      }
    }
  }, [isConnected, disconnect])

  // Connect to room when audio is ready
  useEffect(() => {
    if (audio.isReady && audio.state.stream && roomId) {
      connect(roomId as string, userId, userName)
      setLocalStream(audio.state.stream)
    }
  }, [audio.isReady, audio.state.stream, roomId, userId, userName])

  const leaveRoom = () => {
    disconnect()

    if (participants.length === 1) {
      setShowDeleteModal(true)
    } else {
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
                      key={participant.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{participant.name}</span>
                        <div className="my-2 border-b border-gray-500 dark:border-gray-300" />
                        <span className="font-medium">{participant.id}</span>
                      </div>
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
                          {new Date(transcript.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-medium">
                          {
                            participants.find((p) => p.id === transcript.userId)
                              ?.name
                          }
                        </span>
                      </div>
                      <p className="mt-2">{transcript.text}</p>
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
          <AudioStatus />
          <AudioControl className="flex-row items-center gap-4" />
        </div>
      </div>

      <Toaster />
    </div>
  )
}
