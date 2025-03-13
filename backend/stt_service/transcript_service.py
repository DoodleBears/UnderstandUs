import logging
from dataclasses import dataclass
from typing import Dict, List

logger = logging.getLogger("[UnderstandUs][Transcript Service]")

@dataclass
class Transcript:
    """Represents a single transcript entry."""
    text: str
    timestamp: float
    user_id: str
    room_id: str

class TranscriptService:
    """Service for managing transcript storage and retrieval."""
    
    def __init__(self):
        # In-memory storage for transcripts by room
        self._transcripts: Dict[str, List[Transcript]] = {}
        
    def add_transcript(self, room_id: str, text: str, timestamp: float, user_id: str) -> None:
        """Add a new transcript to the room's history.
        
        Args:
            room_id: The ID of the room
            text: The transcribed text
            timestamp: Unix timestamp of the transcript
            user_id: The ID of the user who spoke
        """
        if room_id not in self._transcripts:
            self._transcripts[room_id] = []
            
        transcript = Transcript(
            text=text,
            timestamp=timestamp,
            user_id=user_id,
            room_id=room_id
        )
        self._transcripts[room_id].append(transcript)
        logger.debug(f"Added transcript to room {room_id}: {text}")
        
    def get_room_transcripts(self, room_id: str) -> List[Dict]:
        """Get all transcripts for a specific room.
        
        Args:
            room_id: The ID of the room
            
        Returns:
            List of transcript dictionaries
        """
        if room_id not in self._transcripts:
            return []
            
        return [
            {
                "text": t.text,
                "timestamp": t.timestamp,
                "user_id": t.user_id
            }
            for t in self._transcripts[room_id]
        ]
        
    def clear_room_transcripts(self, room_id: str) -> None:
        """Clear all transcripts for a specific room.
        
        Args:
            room_id: The ID of the room
        """
        if room_id in self._transcripts:
            del self._transcripts[room_id]
            logger.info(f"Cleared transcripts for room {room_id}")

# Global instance
transcript_service = TranscriptService() 