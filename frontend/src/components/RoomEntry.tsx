'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RoomEntry() {
  const [roomName, setRoomName] = useState('')
  const [userName, setUserName] = useState('')
  const router = useRouter()

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName && userName) {
      router.push(
        `/room?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(userName)}`
      )
    }
  }

  return (
    <Card className="w-[400px]">
      <CardHeader className="text-center">
        <CardTitle>加入房间</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomName" className="text-sm font-medium">
              房间名称
            </label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="输入房间名称"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="userName" className="text-sm font-medium">
              用户名
            </label>
            <Input
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入用户名"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            加入房间
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
