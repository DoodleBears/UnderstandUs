'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Copy, Share2 } from 'lucide-react'
import { useState } from 'react'

interface RoomFormProps {
  onSubmit: (roomId: string, isHost: boolean) => void
  roomId?: string
}

export function RoomForm({ onSubmit }: RoomFormProps) {
  const [roomId, setRoomId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(roomId, false)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    const url = `${window.location.origin}/room/${roomId}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: '链接已复制',
        description: '房间链接已复制到剪贴板',
      })
    } catch (err) {
      toast({
        title: '复制失败',
        description: '请手动复制链接',
        variant: 'destructive',
      })
    }
  }

  const shareRoom = async () => {
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
      copyToClipboard()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="输入会议ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? '连接中...' : '加入会议'}
        </Button>
      </div>
      {roomId && (
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={copyToClipboard}
          >
            <Copy className="mr-2 h-4 w-4" />
            复制链接
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={shareRoom}
          >
            <Share2 className="mr-2 h-4 w-4" />
            分享
          </Button>
        </div>
      )}
    </form>
  )
}
