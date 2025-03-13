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
            
            # Add retry mechanism for publishing transcription
            max_retries = 3
            retry_delay = 1  # shorter delay for real-time messages
            
            for attempt in range(max_retries):
                try:
                    await room.local_participant.publish_data(
                        payload=json.dumps(payload).encode(),
                        topic="transcription",
                        reliable=True
                    )
                    logger.info(f"Successfully published transcription to {participant.identity}")
                    break  # Success, exit the retry loop
                except Exception as e:
                    logger.error(f"Failed to publish transcription (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    if attempt < max_retries - 1:  # Don't sleep on the last attempt
                        await asyncio.sleep(retry_delay)
                    continue
                    
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
    if not transcripts:
        return

    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Wait for a short time to ensure data channel is ready
            await asyncio.sleep(retry_delay)
            
            history_payload = transcripts
            
            logger.info(f"Attempting to send history to {participant.identity} (attempt {attempt + 1}/{max_retries})")
            
            await room.local_participant.publish_data(
                payload=json.dumps(history_payload).encode(),
                topic="transcript_history",  # Use the same topic as regular transcripts
                destination_identities=[participant.identity],
                reliable=True
            )
            
            logger.info(f"Successfully sent {len(transcripts)} transcripts to participant {participant.identity}")
            return  # Success, exit the function
            
        except Exception as e:
            logger.error(f"Failed to send history to {participant.identity} (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:  # Don't sleep on the last attempt
                await asyncio.sleep(retry_delay)
            continue
    
    logger.error(f"Failed to send history to {participant.identity} after {max_retries} attempts")


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
        
        # Then start transcribing the track
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            asyncio.create_task(transcribe_track(participant, track))

    def on_track_published(publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        """Handle track publication by starting transcription and sending history."""
        # Send transcript history first
        
        # Then start transcribing the track
        asyncio.create_task(_send_transcript_history(ctx.room, participant))

    ctx.room.on("track_published", on_track_published)

    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        """Handle participant disconnection and cleanup room if empty."""
        logger.info(f"Participant {participant.identity} disconnected from room {ctx.room.name}")
        
        # Get the number of participants excluding the agent (STT service)
        len_of_remote_participants = len(ctx.room.remote_participants)
        
        if len_of_remote_participants == 0:
            logger.info(f"No more participants in room {ctx.room.name}, cleaning up...")
            # Clear room transcripts
            transcript_service.clear_room_transcripts(ctx.room.name)
            # Disconnect from the room
            asyncio.create_task(ctx.room.disconnect())
            # Exit the agent
            exit(0) 
    
            
    ctx.room.on("track_subscribed", on_track_subscribed)
    ctx.room.on("participant_disconnected", on_participant_disconnected)

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)


if __name__ == "__main__":
    # Set up the event loop policy to use the default event loop
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
    
    # Create and set the event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Run the application with the event loop
        cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
    finally:
        # Clean up the event loop
        loop.close()
    try:
        # Run the application with the event loop
        cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
    finally:
        # Clean up the event loop
        loop.close()