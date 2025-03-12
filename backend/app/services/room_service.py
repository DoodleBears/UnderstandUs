import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from app.models.room import Participant, Room
from app.services.livekit_service import livekit_service

logger = logging.getLogger(__name__)

class RoomService:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self._locks: Dict[str, asyncio.Lock] = {}  # 每个房间一个锁
        self._global_lock = asyncio.Lock()  # 用于管理房间列表的锁

    async def _get_room_lock(self, room_id: str) -> asyncio.Lock:
        """获取房间的锁，如果不存在则创建"""
        async with self._global_lock:
            if room_id not in self._locks:
                self._locks[room_id] = asyncio.Lock()
            return self._locks[room_id]

    async def create_room(self, name: str, host_id: str) -> Optional[Room]:
        """Create a new room."""
        room_id = str(uuid.uuid4())
        
        # Create LiveKit room
        success = await livekit_service.create_room(room_id)
        if not success:
            return None
            
        room = Room(
            id=room_id,
            name=name,
            host_id=host_id,
            participants={},
            transcripts=[]
        )
        
        async with self._global_lock:
            self.rooms[room_id] = room
            
        return room

    async def get_room(self, room_id: str) -> Optional[Room]:
        """Get room by ID."""
        return self.rooms.get(room_id)

    async def list_rooms(self) -> List[Room]:
        """List all rooms."""
        return list(self.rooms.values())

    async def add_participant(self, room_id: str, user_id: str, user_name: str) -> Optional[Room]:
        """Add a participant to a room."""
        room_lock = await self._get_room_lock(room_id)
        async with room_lock:
            room = await self.get_room(room_id)
            if room:
                participant = Participant(
                    user_id=user_id,
                    name=user_name,
                    is_host=user_id == room.host_id
                )
                room.participants[user_id] = participant
            return room

    async def remove_participant(self, room_id: str, user_id: str) -> Optional[Room]:
        """Remove a participant from a room."""
        room_lock = await self._get_room_lock(room_id)
        async with room_lock:
            room = await self.get_room(room_id)
            if room and user_id in room.participants:
                del room.participants[user_id]
                if not room.participants:
                    # Delete empty room from LiveKit
                    await livekit_service.delete_room(room_id)
                    return room
            return room

    async def cleanup_empty_room(self, room_id: str) -> None:
        """Clean up an empty room."""
        async with self._global_lock:
            if room_id in self.rooms:
                del self.rooms[room_id]
                if room_id in self._locks:
                    del self._locks[room_id]

    async def add_transcript(self, room_id: str, user_id: str, text: str, is_final: bool = False) -> Optional[Room]:
        """Add a transcript to a room."""
        room_lock = await self._get_room_lock(room_id)
        async with room_lock:
            room = await self.get_room(room_id)
            if room:
                transcript = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "text": text,
                    "is_final": is_final,
                    "timestamp": datetime.now().isoformat()
                }
                room.transcripts.append(transcript)
            return room

    async def delete_room(self, room_id: str) -> bool:
        """Delete a room."""
        async with self._global_lock:
            if room_id in self.rooms:
                # Delete room from LiveKit
                await livekit_service.delete_room(room_id)
                del self.rooms[room_id]
                if room_id in self._locks:
                    del self._locks[room_id]
                return True
            return False

room_service = RoomService() 