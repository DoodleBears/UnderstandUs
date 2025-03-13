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
        <CardTitle>Enter Room</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomName" className="text-sm font-medium">
              Room ID
            </label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter Room ID"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="userName" className="text-sm font-medium">
              User Name
            </label>
            <Input
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter User Name"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Join Room
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
