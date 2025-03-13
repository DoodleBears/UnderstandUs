'use client'

import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  AudioTrack,
  RoomName,
  useIsMuted,
  useIsSpeaking,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Mic, MicOff } from 'lucide-react'

function ParticipantCard({ trackRef }: { trackRef: any }) {
  const isSpeaking = useIsSpeaking(trackRef.participant)
  const isMuted = useIsMuted(trackRef)

  return (
    <Card
      className={cn(
        'relative p-3 transition-all duration-200',
        'bg-secondary hover:bg-secondary/80',
        'border-2',
        isSpeaking && ['border-primary', 'bg-secondary/80', 'shadow-sm']
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'bg-muted-foreground/30 h-2 w-2 rounded-full transition-colors duration-200',
              isSpeaking && 'bg-green-500'
            )}
          />
          <span className="text-secondary-foreground text-sm font-medium">
            {trackRef.participant.identity}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </div>
          <AudioTrack trackRef={trackRef} volume={1} muted={false} />
        </div>
      </div>
    </Card>
  )
}

export function ParticipantList() {
  const tracks = useTracks([
    Track.Source.Microphone,
    Track.Source.ScreenShareAudio,
    Track.Source.Unknown,
  ]).filter((ref) => ref.publication.kind === Track.Kind.Audio)

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        <div className="bg-background flex-none border-b">
          <h3 className="pb-2 text-lg">
            Room: <RoomName />
          </h3>
        </div>
        <h6 className="text-md mb-4">Participants</h6>
        {tracks.map((trackRef) => (
          <ParticipantCard
            key={trackRef.participant.identity}
            trackRef={trackRef}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
