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
  const [remoteVolumes, setRemoteVolumes] = useState<Map<string, number>>(
    new Map()
  )

  const audio = useAudio()
  const {
    connect,
    disconnect,
    isConnected,
    participants,
    transcripts,
    setLocalStream,
    remoteStreams,
  } = useRTCStore()

  // Handle remote audio streams
  useEffect(() => {
    console.log(
      '[Audio] Current remote streams:',
      Array.from(remoteStreams.entries()).map(([peerId, stream]) => ({
        peerId,
        streamId: stream.id,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })),
      }))
    )

    remoteStreams.forEach((stream, peerId) => {
      console.log(`[Audio] Setting up audio for peer ${peerId}`)
      let audioElement = document.getElementById(
        `audio-${peerId}`
      ) as HTMLAudioElement

      if (!audioElement) {
        console.log(`[Audio] Creating new audio element for peer ${peerId}`)
        audioElement = new Audio()
        audioElement.id = `audio-${peerId}`
        audioElement.autoplay = true
        audioElement.volume = remoteVolumes.get(peerId) || 1
        document.body.appendChild(audioElement)

        audioElement.onerror = () => {
          console.error(`[Audio] Error for peer ${peerId}:`)
          const mediaError = audioElement.error
          if (mediaError) {
            console.error(
              'Error code:',
              mediaError.code,
              'Message:',
              mediaError.message
            )
          }
        }
      }

      // Update the stream if it changed
      if (audioElement.srcObject !== stream) {
        const audioTracks = stream.getAudioTracks()
        console.log(`[Audio] Audio tracks for peer ${peerId}:`, {
          count: audioTracks.length,
          tracks: audioTracks.map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            settings: t.getSettings(),
          })),
        })

        if (audioTracks.length > 0) {
          console.log(`[Audio] Setting stream for peer ${peerId}`)
          audioElement.srcObject = stream

          const playPromise = audioElement.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(
                  `[Audio] Successfully started playback for peer ${peerId}`
                )
              })
              .catch((error) => {
                console.error(
                  `[Audio] Error playing audio for peer ${peerId}:`,
                  error
                )
                if (error.name === 'NotAllowedError') {
                  const playButton = document.createElement('button')
                  playButton.textContent = '开始播放音频'
                  playButton.onclick = () => {
                    audioElement
                      .play()
                      .then(() =>
                        console.log(
                          `[Audio] Manual playback started for peer ${peerId}`
                        )
                      )
                      .catch((err) =>
                        console.error(
                          `[Audio] Manual playback failed for peer ${peerId}:`,
                          err
                        )
                      )
                    playButton.remove()
                  }
                  document.body.appendChild(playButton)
                }
              })
          }
        } else {
          console.warn(
            `[Audio] No audio tracks found in stream for peer ${peerId}`
          )
        }
      }

      // Add event listeners for audio element
      if (!audioElement.onplay) {
        audioElement.onplay = () => {
          console.log(`[Audio] Started playing for peer ${peerId}`, {
            currentTime: audioElement.currentTime,
            duration: audioElement.duration,
            paused: audioElement.paused,
            volume: audioElement.volume,
            muted: audioElement.muted,
            readyState: audioElement.readyState,
          })
        }
        audioElement.onpause = () =>
          console.log(`[Audio] Paused for peer ${peerId}`, {
            currentTime: audioElement.currentTime,
            readyState: audioElement.readyState,
          })
        audioElement.onended = () =>
          console.log(`[Audio] Ended for peer ${peerId}`, {
            currentTime: audioElement.currentTime,
            readyState: audioElement.readyState,
          })
        audioElement.onloadedmetadata = () => {
          console.log(`[Audio] Metadata loaded for peer ${peerId}:`, {
            duration: audioElement.duration,
            readyState: audioElement.readyState,
            paused: audioElement.paused,
            volume: audioElement.volume,
            muted: audioElement.muted,
          })
          if (audioElement.muted) {
            console.log(`[Audio] Unmuting audio element for peer ${peerId}`)
            audioElement.muted = false
          }
        }
        audioElement.onwaiting = () =>
          console.log(`[Audio] Waiting for data for peer ${peerId}`, {
            readyState: audioElement.readyState,
          })
        audioElement.onstalled = () =>
          console.log(`[Audio] Playback stalled for peer ${peerId}`, {
            readyState: audioElement.readyState,
          })
        audioElement.onsuspend = () =>
          console.log(`[Audio] Data loading suspended for peer ${peerId}`, {
            readyState: audioElement.readyState,
          })
      }

      // Monitor audio tracks
      stream.getAudioTracks().forEach((track) => {
        console.log(`[Audio] Audio track for peer ${peerId}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          constraints: track.getConstraints(),
          settings: track.getSettings(),
        })

        if (!track.enabled) {
          console.log(`[Audio] Enabling disabled track for peer ${peerId}`)
          track.enabled = true
        }
      })
    })

    // Cleanup function
    return () => {
      remoteStreams.forEach((_, peerId) => {
        console.log(`[Audio] Cleaning up audio for peer ${peerId}`)
        const audioElement = document.getElementById(
          `audio-${peerId}`
        ) as HTMLAudioElement
        if (audioElement) {
          audioElement.pause()
          audioElement.srcObject = null
          audioElement.remove()
        }
      })
    }
  }, [remoteStreams, remoteVolumes])

  // Function to adjust remote participant volume
  const adjustParticipantVolume = (peerId: string, volume: number) => {
    console.log(`[Audio] Adjusting volume for peer ${peerId} to ${volume}`)
    const audioElement = document.getElementById(
      `audio-${peerId}`
    ) as HTMLAudioElement
    if (audioElement) {
      audioElement.volume = volume
      setRemoteVolumes(new Map(remoteVolumes.set(peerId, volume)))
    } else {
      console.warn(
        `[Audio] Could not adjust volume for peer ${peerId} - no audio element found`
      )
    }
  }

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
                      <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-col gap-2">
                          <span className="font-medium">
                            {participant.name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {participant.id}
                          </span>
                        </div>

                        {participant.id !== userId &&
                          remoteStreams.has(participant.id) && (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={remoteVolumes.get(participant.id) || 1}
                                onChange={(e) =>
                                  adjustParticipantVolume(
                                    participant.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full"
                              />
                              <span className="w-8 text-xs">
                                {Math.round(
                                  (remoteVolumes.get(participant.id) || 1) * 100
                                )}
                                %
                              </span>
                            </div>
                          )}
                        {remoteStreams.has(participant.id) && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-xs text-green-600">
                              Audio Connected
                            </span>
                          </div>
                        )}
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
          <AudioControl
            showDeviceSelector={true}
            className="flex-row items-center gap-4"
          />
        </div>
      </div>

      <Toaster />
    </div>
  )
}
