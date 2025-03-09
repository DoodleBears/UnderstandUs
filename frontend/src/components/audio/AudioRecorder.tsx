'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface AudioRecorderProps {
  onAudioData: (data: Blob) => void
  wsManager: any // TODO: 替换为具体的 WebSocketManager 类型
}

export function AudioRecorder({ onAudioData, wsManager }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          // 发送音频数据到服务器
          wsManager.send({
            type: 'audio_data',
            payload: event.data,
          })
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        })
        onAudioData(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(100) // 每100ms触发一次ondataavailable事件
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError('无法访问麦克风，请确保已授予权限。')
      console.error('Error accessing microphone:', err)
    }
  }

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>音频录制</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? 'destructive' : 'default'}
            size="lg"
            className="h-32 w-32 rounded-full"
          >
            {isRecording ? (
              <Square className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          {isRecording ? '正在录音...' : '点击麦克风图标开始录音'}
        </p>
      </CardContent>
    </Card>
  )
}
