import asyncio
import json
import logging
import time

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    stt,
    transcription,
)
from livekit.plugins import silero
from livekit.plugins.openai import stt as plugin

from .transcript_service import transcript_service

load_dotenv(dotenv_path=".env")

logger = logging.getLogger("[UnderstandUs][STT Service]")


async def _forward_transcription(
    stt_stream: stt.SpeechStream, 
    stt_forwarder: transcription.STTSegmentsForwarder,
    room: rtc.Room,
    participant: rtc.RemoteParticipant
):
    """Forward the transcription to the client and broadcast to all room members"""
    async for ev in stt_stream:
        current_time = time.time()
        if ev.type == stt.SpeechEventType.INTERIM_TRANSCRIPT:
            # you may not want to log interim transcripts, they are not final and may be incorrect
            logger.debug(f" -> {ev.alternatives[0].text}")
      
        elif ev.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
            logger.debug(f" ~> {ev.alternatives[0].text}")
            # Store the transcript
            transcript_service.add_transcript(
                room_id=room.name,
                text=ev.alternatives[0].text,
                timestamp=current_time,
                user_id=participant.identity
            )
            
            # Broadcast final transcript with user ID and timestamps
            payload = {
                "text": ev.alternatives[0].text,
                "timestamp": current_time,
                "user_id": participant.identity,
            }
            logger.debug(f"payload: {payload}")
            await room.local_participant.publish_data(
                payload=json.dumps(payload).encode(),
                topic="transcription",
                reliable=True
            )
        elif ev.type == stt.SpeechEventType.RECOGNITION_USAGE:
            logger.debug(f"metrics: {ev.recognition_usage}")

        stt_forwarder.update(ev)


async def _send_transcript_history(room: rtc.Room, participant: rtc.RemoteParticipant):
    """Send transcript history to a new participant.
    
    Args:
        room: The LiveKit room
        participant: The new participant
    """
    transcripts = transcript_service.get_room_transcripts(room.name)
    if transcripts:
        history_payload = transcripts
        
        await room.local_participant.publish_data(
            payload=json.dumps(history_payload).encode(),
            topic="transcript_history",
            destination_identities=[participant.identity],
            reliable=True
        )
        logger.info(f"Sent {len(transcripts)} transcripts to participant {participant.identity}")


async def entrypoint(ctx: JobContext):
    logger.info(f"starting transcriber (speech to text) example, room: {ctx.room.name}")
    # uses "whisper-large-v3-turbo" model by default 
    model = "whisper-large-v3-turbo"
    stt_impl = plugin.STT.with_groq(model=model, detect_language=True)

    if not stt_impl.capabilities.streaming:
        # wrap with a stream adapter to use streaming semantics
        stt_impl = stt.StreamAdapter(
            stt=stt_impl,
            vad=silero.VAD.load(
                min_silence_duration=1,
            ),
        )

    async def transcribe_track(participant: rtc.RemoteParticipant, track: rtc.Track):
        audio_stream = rtc.AudioStream(track)
        stt_forwarder = transcription.STTSegmentsForwarder(
            room=ctx.room, participant=participant, track=track
        )

        stt_stream = stt_impl.stream()
        asyncio.create_task(_forward_transcription(stt_stream, stt_forwarder, ctx.room, participant))

        async for ev in audio_stream:
            stt_stream.push_frame(ev.frame)

    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        """Handle track subscription by starting transcription and sending history."""
        # Send transcript history first
        asyncio.create_task(_send_transcript_history(ctx.room, participant))
        
        # Then start transcribing the track
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            asyncio.create_task(transcribe_track(participant, track))
            
    ctx.room.on("track_subscribed", on_track_subscribed)

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))