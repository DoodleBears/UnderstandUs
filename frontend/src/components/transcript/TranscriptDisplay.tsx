'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect, useRef } from 'react'

interface TranscriptMessage {
  id: string
  speaker: string
  text: string
  isFinal: boolean
  timestamp: number
}

interface TranscriptDisplayProps {
  messages: TranscriptMessage[]
}

export function TranscriptDisplay({ messages }: TranscriptDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>实时转录</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(400px-4rem)]">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-3 ${
                  message.isFinal ? 'bg-primary/10' : 'bg-muted/50'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{message.speaker}</span>
                  {!message.isFinal && (
                    <span className="text-muted-foreground text-xs">
                      正在输入...
                    </span>
                  )}
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
