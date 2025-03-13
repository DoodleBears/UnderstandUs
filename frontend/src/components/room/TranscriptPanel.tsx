'use client'

import { useDataChannel } from '@livekit/components-react'
import { useEffect, useState } from 'react'

interface TranscriptionMessage {
  text: string
  timestamp: number
  user_id: string
  readableTimestamp: string
}

export function TranscriptPanel() {
  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([])
  const dataChannel = useDataChannel('transcription')
  const historyTranscripts = useDataChannel('transcript_history')

  useEffect(() => {
    console.log('dataChannel', dataChannel)
    if (dataChannel?.message) {
      const transcriptionMessage = JSON.parse(
        new TextDecoder().decode(dataChannel.message.payload)
      ) as TranscriptionMessage
      const readableTimestamp = new Date(
        transcriptionMessage.timestamp * 1000
      ).toLocaleTimeString()
      const newTranscript = {
        text: transcriptionMessage.text,
        timestamp: transcriptionMessage.timestamp,
        user_id: transcriptionMessage.user_id,
        readableTimestamp: readableTimestamp,
      }
      setTranscripts((prev) => [...prev, newTranscript])
    }
  }, [dataChannel?.message])

  useEffect(() => {
    console.log('transcript_history', historyTranscripts)
    if (historyTranscripts?.message) {
      const historyTranscriptsMessage = JSON.parse(
        new TextDecoder().decode(historyTranscripts.message.payload)
      ) as TranscriptionMessage[]
      setTranscripts((prev) => [...historyTranscriptsMessage, ...prev])
    }
  }, [historyTranscripts?.message])

  return (
    <div className="h-full p-4">
      <h3 className="mb-4 text-lg font-semibold">Transcript</h3>
      <div className="max-h-[calc(100vh-200px)] space-y-2 overflow-y-auto">
        {transcripts.length > 0 ? (
          transcripts.map((transcript, index) => (
            <div
              key={index}
              className="bg-muted flex flex-col gap-1 rounded-lg p-2"
            >
              <span className="text-foreground text-xs">
                <span className="text-foreground text-sm font-bold">
                  {transcript.user_id}
                </span>
                <span className="text-muted-foreground text-xs">
                  {' '}
                  {transcript.readableTimestamp}
                </span>
              </span>

              <span className="text-foreground text-sm">{transcript.text}</span>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">
            Transcript will appear here...
          </p>
        )}
      </div>
    </div>
  )
}
