'use client'

import { useDataChannel } from '@livekit/components-react'
import { DataPacket_Kind } from 'livekit-client'
import { useEffect, useState } from 'react'

interface TranscriptionMessage {
  text: string
  timestamp: number
}

interface DataMessage {
  payload: Uint8Array
  kind: DataPacket_Kind
  topic: string
  timestamp: number
}

export function TranscriptPanel() {
  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([])
  const dataChannel = useDataChannel('transcription')

  useEffect(() => {
    console.log('dataChannel', dataChannel)
    if (dataChannel?.message) {
      const newTranscript = {
        text: new TextDecoder().decode(dataChannel.message.payload),
        timestamp: dataChannel.message.timestamp || Date.now(),
      }
      setTranscripts((prev) => [...prev, newTranscript])
    }
  }, [dataChannel?.message])

  return (
    <div className="h-full p-4">
      <h3 className="mb-4 text-lg font-semibold">Transcript</h3>
      <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
        {transcripts.length > 0 ? (
          transcripts.map((transcript, index) => (
            <div key={index} className="bg-muted rounded-lg p-2">
              <p className="text-sm">{transcript.text}</p>
              <span className="text-muted-foreground text-xs">
                {new Date(transcript.timestamp).toLocaleTimeString()}
              </span>
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
