'use client'

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react'

import '@livekit/components-styles'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Track } from 'livekit-client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// LiveKit 配置
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL

// Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

export default function Page() {
  const searchParams = useSearchParams()
  const room = searchParams.get('room')
  const username = searchParams.get('username')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!room || !username) {
      setError('缺少房间名称或用户名')
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
          throw new Error('获取token失败')
        }

        const data = await response.json()
        setToken(data.token)
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : '连接失败')
      }
    }

    generateToken()
  }, [room, username])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>错误</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (token === '') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>正在连接...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>正在获取房间访问权限，请稍候...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100dvh' }}
    >
      <MyVideoConference />
      <RoomAudioRenderer />
      <ControlBar />
    </LiveKitRoom>
  )
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )
  return (
    <GridLayout
      tracks={tracks}
      style={{ height: 'calc(100vh - var(--lk-control-bar-height))' }}
    >
      <ParticipantTile />
    </GridLayout>
  )
}
