import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from app.models.room import Participant, Room


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

    async def create_room(self, name: str, host_id: str, host_name: str) -> Room:
        async with self._global_lock:
            room_id = str(uuid.uuid4())[:8]
            room = Room(
                id=room_id,
                name=name,
                participants={
                    host_id: Participant(
                        user_id=host_id,
                        name=host_name,
                        is_host=True
                    )
                }
            )
            self.rooms[room_id] = room
            self._locks[room_id] = asyncio.Lock()
            return room

    async def get_room(self, room_id: str) -> Optional[Room]:
        async with self._global_lock:
            return self.rooms.get(room_id)

    async def list_rooms(self) -> List[Room]:
        async with self._global_lock:
            return list(self.rooms.values())

    async def add_participant(self, room_id: str, user_id: str, name: str) -> Optional[Room]:
        room_lock = await self._get_room_lock(room_id)
        async with room_lock:
            room = await self.get_room(room_id)
            if room:
                room.participants[user_id] = Participant(
                    user_id=user_id,
                    name=name
                )
            return room

    async def remove_participant(self, room_id: str, user_id: str) -> Optional[Room]:
        room_lock = await self._get_room_lock(room_id)
        async with room_lock:
            room = await self.get_room(room_id)
            if room and user_id in room.participants:
                del room.participants[user_id]
                if not room.participants:
                    # 释放房间锁后再获取全局锁
                    room_to_delete = room
                    return room_to_delete
            return room

    async def cleanup_empty_room(self, room_id: str) -> None:
        """清理空房间，这个方法应该由调用方在 remove_participant 返回空房间后调用"""
        async with self._global_lock:
            if room_id in self.rooms:
                del self.rooms[room_id]
                if room_id in self._locks:
                    del self._locks[room_id]

    async def add_transcript(self, room_id: str, user_id: str, text: str, is_final: bool = False) -> Optional[Room]:
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
        """删除房间及其所有资源"""
        async with self._global_lock:
            if room_id in self.rooms:
                del self.rooms[room_id]
                if room_id in self._locks:
                    del self._locks[room_id]
                return True
            return False

room_service = RoomService() 