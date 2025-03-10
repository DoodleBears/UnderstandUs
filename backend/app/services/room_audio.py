from enum import Enum
from typing import Dict, Set

from fastapi import WebSocket
from pydantic import BaseModel


class AudioState(str, Enum):
    ACTIVE = "active"
    MUTED = "muted"
    DISABLED = "disabled"

class ParticipantAudio(BaseModel):
    user_id: str
    state: AudioState = AudioState.ACTIVE
    device_id: str | None = None

class RoomAudioManager:
    def __init__(self):
        self._rooms: Dict[str, Dict[str, ParticipantAudio]] = {}
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def add_participant(self, room_id: str, user_id: str, device_id: str | None = None) -> None:
        """添加参与者到房间"""
        if room_id not in self._rooms:
            self._rooms[room_id] = {}
        
        self._rooms[room_id][user_id] = ParticipantAudio(
            user_id=user_id,
            device_id=device_id
        )

    async def remove_participant(self, room_id: str, user_id: str) -> None:
        """从房间移除参与者"""
        if room_id in self._rooms and user_id in self._rooms[room_id]:
            del self._rooms[room_id][user_id]
            if not self._rooms[room_id]:
                del self._rooms[room_id]

    async def update_audio_state(self, room_id: str, user_id: str, state: AudioState) -> None:
        """更新参与者的音频状态"""
        if room_id in self._rooms and user_id in self._rooms[room_id]:
            self._rooms[room_id][user_id].state = state
            await self._broadcast_state_change(room_id, user_id, state)

    async def get_room_participants(self, room_id: str) -> Dict[str, ParticipantAudio]:
        """获取房间内所有参与者的音频状态"""
        return self._rooms.get(room_id, {})

    async def add_connection(self, room_id: str, websocket: WebSocket) -> None:
        """添加 WebSocket 连接到房间"""
        if room_id not in self._connections:
            self._connections[room_id] = set()
        self._connections[room_id].add(websocket)

    async def remove_connection(self, room_id: str, websocket: WebSocket) -> None:
        """从房间移除 WebSocket 连接"""
        if room_id in self._connections:
            self._connections[room_id].discard(websocket)
            if not self._connections[room_id]:
                del self._connections[room_id]

    async def _broadcast_state_change(self, room_id: str, user_id: str, state: AudioState) -> None:
        """广播音频状态变更"""
        if room_id in self._connections:
            message = {
                "type": "audio_state_change",
                "data": {
                    "user_id": user_id,
                    "state": state
                }
            }
            for connection in self._connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # 连接可能已断开，将在清理时移除
                    continue

# 创建全局音频管理器实例
room_audio_manager = RoomAudioManager() 