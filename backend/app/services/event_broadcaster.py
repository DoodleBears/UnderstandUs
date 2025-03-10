import logging
from enum import Enum
from typing import Any, Dict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)

class EventType(str, Enum):
    AUDIO_STATE = "audio_state"
    CONNECTION_STATE = "connection_state"
    ERROR = "error"
    SYSTEM = "system"

class EventBroadcaster:
    def __init__(self):
        self._room_connections: Dict[str, Set[WebSocket]] = {}
        self._user_connections: Dict[str, Set[WebSocket]] = {}

    async def register(self, websocket: WebSocket, room_id: str, user_id: str) -> None:
        """注册新的 WebSocket 连接"""
        # 添加到房间连接
        if room_id not in self._room_connections:
            self._room_connections[room_id] = set()
        self._room_connections[room_id].add(websocket)

        # 添加到用户连接
        if user_id not in self._user_connections:
            self._user_connections[user_id] = set()
        self._user_connections[user_id].add(websocket)

    async def unregister(self, websocket: WebSocket, room_id: str, user_id: str) -> None:
        """注销 WebSocket 连接"""
        # 从房间连接中移除
        if room_id in self._room_connections:
            self._room_connections[room_id].discard(websocket)
            if not self._room_connections[room_id]:
                del self._room_connections[room_id]

        # 从用户连接中移除
        if user_id in self._user_connections:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]

    async def broadcast_to_room(self, room_id: str, event_type: EventType, data: Any) -> None:
        """向房间内所有连接广播事件"""
        if room_id in self._room_connections:
            message = {
                "type": event_type,
                "data": data
            }
            for connection in self._room_connections[room_id].copy():
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"广播到房间 {room_id} 失败: {str(e)}")
                    await self._handle_failed_connection(connection, room_id)

    async def broadcast_to_user(self, user_id: str, event_type: EventType, data: Any) -> None:
        """向特定用户的所有连接广播事件"""
        if user_id in self._user_connections:
            message = {
                "type": event_type,
                "data": data
            }
            for connection in self._user_connections[user_id].copy():
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"广播到用户 {user_id} 失败: {str(e)}")
                    await self._handle_failed_connection(connection, user_id)

    async def broadcast_error(self, room_id: str, error_message: str, error_code: str | None = None) -> None:
        """广播错误消息"""
        error_data = {
            "message": error_message,
            "code": error_code
        }
        await self.broadcast_to_room(room_id, EventType.ERROR, error_data)

    async def broadcast_system_message(self, room_id: str, message: str) -> None:
        """广播系统消息"""
        await self.broadcast_to_room(room_id, EventType.SYSTEM, {"message": message})

    async def _handle_failed_connection(self, websocket: WebSocket, identifier: str) -> None:
        """处理失败的连接"""
        # 遍历并清理失败的连接
        for connections in [self._room_connections, self._user_connections]:
            if identifier in connections:
                connections[identifier].discard(websocket)
                if not connections[identifier]:
                    del connections[identifier]

# 创建全局事件广播器实例
broadcaster = EventBroadcaster() 