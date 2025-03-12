'use client'

import { RoomForm } from '@/components/room/RoomForm'
import { RoomList } from '@/components/room/RoomList'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export default function Home() {
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
    // Load saved user ID and name from localStorage
    const savedUserId = localStorage.getItem('userId')
    const savedUserName = localStorage.getItem('userName')
    if (savedUserId) setUserId(savedUserId)
    if (savedUserName) setUserName(savedUserName)
    else {
      // Generate random user ID if not exists
      const newUserId = uuidv4()
      setUserId(newUserId)
      localStorage.setItem('userId', newUserId)
    }
  }, [])

  const handleUserInfoChange = (newUserId: string, newUserName: string) => {
    setUserId(newUserId)
    setUserName(newUserName)
    localStorage.setItem('userId', newUserId)
    localStorage.setItem('userName', newUserName)
    toast({
      title: '用户信息已更新',
      description: '您的用户ID和名称已保存',
    })
  }

  const handleCreateMeeting = async () => {
    if (!userName) {
      toast({
        title: '请设置用户名',
        description: '创建会议前请先设置您的用户名',
        variant: 'destructive',
      })
      return
    }

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
            host_name: userName,
            host_id: userId,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('创建会议失败')
      }

      console.log('创建会议响应:', response)

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
    if (!userName) {
      toast({
        title: '请设置用户名',
        description: '加入会议前请先设置您的用户名',
        variant: 'destructive',
      })
      return
    }
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

        <Card>
          <CardHeader>
            <CardTitle>用户信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">用户 ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userId}
                  onChange={(e) =>
                    handleUserInfoChange(e.target.value, userName)
                  }
                  className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="输入用户 ID"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">用户名称</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => handleUserInfoChange(userId, e.target.value)}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="输入用户名称"
              />
            </div>
          </CardContent>
        </Card>

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
