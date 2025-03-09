'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Copy, Share2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Room {
  id: string
  name: string
  participants: Record<
    string,
    {
      user_id: string
      name: string
      joined_at: string
      is_host: boolean
    }
  >
  created_at: string
  is_active: boolean
}

export function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchRooms = async () => {
      console.log('fetchRooms')
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/rooms`
      console.log('url', url)
      try {
        const response = await fetch(url)
        const data = await response.json()
        setRooms(data)
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
        toast({
          title: '获取会议列表失败',
          description: '请稍后重试',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRooms()
    // 每30秒刷新一次会议列表
    const interval = setInterval(fetchRooms, 30000)
    return () => clearInterval(interval)
  }, [toast])

  const copyToClipboard = async (roomId: string) => {
    const url = `${window.location.origin}/room/${roomId}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: '链接已复制',
        description: '会议链接已复制到剪贴板',
      })
    } catch (err) {
      toast({
        title: '复制失败',
        description: '请手动复制链接',
        variant: 'destructive',
      })
    }
  }

  const shareRoom = async (roomId: string) => {
    const url = `${window.location.origin}/room/${roomId}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: '加入我的会议',
          text: '点击链接加入会议',
          url,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      copyToClipboard(roomId)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="bg-muted h-6 w-1/3 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted h-4 w-1/4 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">暂无活跃会议</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <Card key={room.id} className="hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{room.name}</CardTitle>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{Object.keys(room.participants).length} 位参与者</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`/room/${room.id}`, '_blank')}
              >
                加入会议
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(room.id)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shareRoom(room.id)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
