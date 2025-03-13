'use client'

import { ControlBar, LiveKitRoom } from '@livekit/components-react'

import '@livekit/components-styles'

import { ParticipantList } from '@/components/room/ParticipantList'
import { ResizablePanel } from '@/components/room/ResizablePanel'
import { TranscriptPanel } from '@/components/room/TranscriptPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// LiveKit 配置
const LIVEKIT_API_KEY = process.env.NEXT_PUBLIC_LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL

// Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

export default function Page() {
  const searchParams = useSearchParams()
  const room = searchParams.get('room')
  const username = searchParams.get('username')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [leftWidth, setLeftWidth] = useState(30) // percentage
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!room || !username) {
      setError('Missing room name or username')
      return
    }

    // 生成 token
    const generateToken = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}`,
          },
          body: JSON.stringify({
            room: room,
            identity: username,
            name: username,
            metadata: '',
            ttl: 3600,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get token')
        }

        const data = await response.json()
        setToken(data.token)
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Connection failed')
      }
    }

    generateToken()
  }, [room, username])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const container = document.getElementById('resizable-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newWidth =
      ((e.clientX - containerRect.left) / containerRect.width) * 100
    setLeftWidth(Math.min(Math.max(newWidth, 20), 80)) // Limit between 20% and 80%
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (token === '') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Connecting...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Getting room access, please wait...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-background h-screen overflow-hidden">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={LIVEKIT_URL}
        data-lk-theme="default"
        className="flex h-full flex-col"
        connect={true}
      >
        <div className="flex-1 overflow-hidden" id="resizable-container">
          <div className="flex h-full">
            <ResizablePanel style={{ width: `${leftWidth}%` }}>
              <ParticipantList />
            </ResizablePanel>
            <div
              className="bg-border hover:bg-primary/50 w-1 cursor-col-resize transition-colors"
              onMouseDown={handleMouseDown}
            />
            <ResizablePanel style={{ width: `${100 - leftWidth}%` }}>
              <TranscriptPanel />
            </ResizablePanel>
          </div>
        </div>
        <div className="flex-none border-t">
          <ControlBar
            className="bg-background"
            variation="minimal"
            controls={{
              microphone: true,
              camera: false,
              screenShare: false,
            }}
          />
        </div>
      </LiveKitRoom>
    </div>
  )
}
