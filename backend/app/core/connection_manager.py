import json
from typing import Dict, Set, List, Optional

from fastapi import WebSocket
from app.services.room_service import room_service
import asyncio
from datetime import datetime

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
    
    async def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        # 从房间连接中移除
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

        # 清理用户相关数据
        self.user_rooms.pop(user_id, None)
        self.last_activity.pop(user_id, None)

        # 广播房间更新
        if room_id in self.active_connections:
            await self.broadcast_room_update(room_id)

        # 更新房间参与者
        room = await self.room_service.remove_participant(room_id, user_id)
        if room:
            # 广播参与者离开消息
            await self.broadcast_room_update(room_id)
    
    async def broadcast_room_update(self, room_id: str):
        """广播房间状态更新"""
        if room_id not in self.active_connections:
            return
            
        # 获取房间所有参与者
        participants = [
            {"id": user_id, "name": f"用户 {i+1}"}
            for i, user_id in enumerate(self.active_connections[room_id].keys())
        ]

        # 广播房间更新消息
        message = {
            "type": "room_update",
            "payload": {
                "room_id": room_id,
                "participants": participants,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        for websocket in self.active_connections[room_id].values():
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error broadcasting room update: {e}")
    
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
            
        for connection in self.active_connections[room_id].values():
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

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
        
        return [
            {"id": user_id, "name": f"用户 {i+1}"}
            for i, user_id in enumerate(self.active_connections[room_id].keys())
        ]

manager = ConnectionManager() 