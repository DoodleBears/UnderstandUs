import asyncio
import logging
from datetime import datetime
from typing import Dict, List

from fastapi import WebSocket

from app.services.room_service import room_service

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}  # room_id -> {user_id -> websocket}
        self.user_rooms: Dict[str, str] = {}  # user_id -> room_id
        self.last_activity: Dict[str, datetime] = {}  # user_id -> last_activity_time
        self.max_connections_per_room = 10  # 每个房间最大连接数
        self.connection_timeout = 300  # 5分钟无活动超时
        self.room_service = room_service
        
    def get_room_connections(self, room_id: str) -> Dict[str, WebSocket]:
        return self.active_connections.get(room_id, {})
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, user_name: str):
        # 检查房间连接数限制
        if room_id in self.active_connections:
            if len(self.active_connections[room_id]) >= self.max_connections_per_room:
                await websocket.close(code=1008, reason="Room is full")
                return

        # 如果用户已经在其他房间，先断开旧连接
        if user_id in self.user_rooms:
            old_room_id = self.user_rooms[user_id]
            await self.disconnect(websocket, old_room_id, user_id)

        # 接受 WebSocket 连接
        await websocket.accept()

        # 创建房间连接字典（如果不存在）
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}

        # 添加新连接
        self.active_connections[room_id][user_id] = websocket
        self.user_rooms[user_id] = room_id
        self.last_activity[user_id] = datetime.now()

        # 广播房间更新
        await self.broadcast_room_update(room_id)
        
        # 更新房间参与者
        await self.room_service.add_participant(room_id, user_id, user_name)
        logger.warning(f"Room {room_id} has {len(self.active_connections[room_id])} connections")
    
    async def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        logger.warning(f"Disconnecting user {user_id} from room {room_id}")
        
        # 从房间连接中移除
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                logger.warning(f"Room {room_id} is now empty, removing from active connections")

        # 清理用户相关数据
        self.user_rooms.pop(user_id, None)
        self.last_activity.pop(user_id, None)

        # 更新房间参与者
        room = await self.room_service.remove_participant(room_id, user_id)
        if room:
            # 只有在房间还有参与者时才广播更新
            if room_id in self.active_connections and self.active_connections[room_id]:
                logger.warning(f"Broadcasting room update after user {user_id} disconnected")
                await self.broadcast_room_update(room_id)
            else:
                logger.warning(f"No active connections in room {room_id} after user {user_id} disconnected")
    
    async def broadcast_room_update(self, room_id: str):
        """广播房间状态更新"""
        if room_id not in self.active_connections:
            logger.warning(f"Room {room_id} not found in active connections")
            return
            
        room_connections = len(self.active_connections[room_id])
        logger.warning(f"Broadcasting room update for room {room_id}, room connections: {room_connections}")
            
        # 获取房间所有参与者
        user_ids = list(self.active_connections[room_id].keys())
        participants = []
        
        # 确保主持人始终是第一个
        for i, user_id in enumerate(user_ids):
            if i == 0:  # 第一个用户是主持人
                participants.append({
                    "user_id": user_id,
                    "name": "主持人",
                    "joined_at": self.last_activity[user_id].isoformat(),
                    "is_host": True
                })
            else:  # 其他用户是参与者
                participants.append({
                    "user_id": user_id,
                    "name": f"参与者 {i}",
                    "joined_at": self.last_activity[user_id].isoformat(),
                    "is_host": False
                })

        # 广播房间更新消息
        message = {
            "type": "room_update",
            "payload": {
                "participants": participants
            }
        }
        logger.warning(f"Room update message: {message}")
        
        failed_connections = []
        for user_id, websocket in list(self.active_connections[room_id].items()):
            logger.warning(f"Sending room update to user {user_id} in room {room_id}")
            try:
                await websocket.send_json(message)
                logger.warning(f"Successfully sent room update to user {user_id} in room {room_id}")
            except Exception as e:
                logger.error(f"Failed to send room update to user {user_id} in room {room_id}: {str(e)}")
                failed_connections.append((user_id, websocket))
        
        # 清理失败的连接
        for user_id, websocket in failed_connections:
            await self.disconnect(websocket, room_id, user_id)
    
    async def broadcast_transcript(self, room_id: str, user_id: str, text: str, is_final: bool = False):
        """广播转录文本"""
        # 更新房间转录记录
        room = self.room_service.add_transcript(room_id, user_id, text, is_final)
        if not room:
            return
            
        message = {
            "type": "transcript",
            "user_id": user_id,
            "text": text,
            "is_final": is_final,
            "timestamp": room.transcripts[-1]["timestamp"]
        }
        
        await self.broadcast_to_room(room_id, message)
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        """广播消息到房间内所有连接"""
        if room_id not in self.active_connections:
            return
            
        connections_count = len(self.active_connections[room_id])
        logger.info(f"Broadcasting message to room {room_id} with {connections_count} connections")
        
        failed_connections = []
        for user_id, websocket in list(self.active_connections[room_id].items()):
            try:
                await websocket.send_json(message)
                logger.debug(f"Successfully sent message to user {user_id} in room {room_id}")
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id} in room {room_id}: {str(e)}")
                failed_connections.append((user_id, websocket))
        
        # 清理失败的连接
        for user_id, websocket in failed_connections:
            await self.disconnect(websocket, room_id, user_id)

    def update_activity(self, user_id: str):
        if user_id in self.last_activity:
            self.last_activity[user_id] = datetime.now()

    async def cleanup_inactive_connections(self):
        while True:
            current_time = datetime.now()
            inactive_users = [
                user_id for user_id, last_time in self.last_activity.items()
                if (current_time - last_time).total_seconds() > self.connection_timeout
            ]

            for user_id in inactive_users:
                if user_id in self.user_rooms:
                    room_id = self.user_rooms[user_id]
                    if room_id in self.active_connections:
                        websocket = self.active_connections[room_id].get(user_id)
                        if websocket:
                            try:
                                await websocket.close(code=1000, reason="Connection timeout")
                            except Exception as e:
                                print(f"Error closing inactive connection: {e}")
                            await self.disconnect(websocket, room_id, user_id)

            await asyncio.sleep(60)  # 每分钟检查一次

    def get_room_participants(self, room_id: str) -> List[dict]:
        if room_id not in self.active_connections:
            return []
        
        user_ids = list(self.active_connections[room_id].keys())
        participants = []
        
        # 确保主持人始终是第一个
        for i, user_id in enumerate(user_ids):
            if i == 0:  # 第一个用户是主持人
                participants.append({
                    "user_id": user_id,
                    "name": "主持人",
                    "joined_at": self.last_activity[user_id].isoformat(),
                    "is_host": True
                })
            else:  # 其他用户是参与者
                participants.append({
                    "user_id": user_id,
                    "name": f"参与者 {i}",
                    "joined_at": self.last_activity[user_id].isoformat(),
                    "is_host": False
                })
        
        return participants

manager = ConnectionManager() 