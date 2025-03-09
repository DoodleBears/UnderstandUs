'use client'

import { RoomForm } from '@/components/room/RoomForm'
import { RoomList } from '@/components/room/RoomList'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleCreateMeeting = async () => {
    setIsCreating(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `新会议 ${new Date().toLocaleString('zh-CN')}`,
            host_name: '主持人', // 实际应用中应该使用用户信息
          }),
        }
      )

      if (!response.ok) {
        throw new Error('创建会议失败')
      }

      const { room } = await response.json()

      // 标记为房主
      if (typeof window !== 'undefined') {
        localStorage.setItem(`room_${room.id}_host`, 'true')
      }

      // 复制会议链接
      const url = `${window.location.origin}/room/${room.id}`
      await navigator.clipboard.writeText(url)

      toast({
        title: '会议创建成功',
        description: '会议链接已复制到剪贴板',
      })

      // 在新标签页打开会议
      window.open(`/room/${room.id}`, '_blank')
    } catch (error) {
      setError((error as Error).message)
      toast({
        title: '创建会议失败',
        description: '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinMeeting = (roomId: string) => {
    window.open(`/room/${roomId}`, '_blank')
  }

  if (!isClient) {
    return (
      <main className="container mx-auto min-h-screen p-4">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="text-center text-3xl font-bold">音频对话分析系统</h1>
          <div className="animate-pulse">
            <div className="bg-muted h-96 rounded-lg"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-center text-3xl font-bold">音频对话分析系统</h1>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>创建新会议</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                创建一个新的会议房间，并邀请其他人加入。
              </p>
              <Button
                onClick={handleCreateMeeting}
                className="w-full"
                disabled={isCreating}
              >
                {isCreating ? '创建中...' : '创建会议'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>加入会议</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                使用会议链接或会议ID加入现有会议。
              </p>
              <RoomForm onSubmit={handleJoinMeeting} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>活跃会议</CardTitle>
          </CardHeader>
          <CardContent>
            <RoomList />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
