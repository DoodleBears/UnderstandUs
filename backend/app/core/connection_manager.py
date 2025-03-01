import json
from typing import Dict, List, Set

from fastapi import WebSocket
from pydantic import BaseModel, Field


class Room(BaseModel):
    room_id: str
    connections: Set[WebSocket] = Field(default_factory=set)
    transcripts: Dict[str, List[str]] = Field(default_factory=dict)  # user_id -> transcript list
    
    class Config:
        arbitrary_types_allowed = True  # 允许非 Pydantic 类型（WebSocket）

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        
    def get_or_create_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id=room_id)
        return self.rooms[room_id]
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        room = self.get_or_create_room(room_id)
        room.connections.add(websocket)
        if user_id not in room.transcripts:
            room.transcripts[user_id] = []
    
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.rooms:
            self.rooms[room_id].connections.remove(websocket)
            if not self.rooms[room_id].connections:
                del self.rooms[room_id]
    
    async def broadcast_transcript(self, room_id: str, user_id: str, text: str, is_final: bool = False):
        """
        广播转录文本到房间内所有连接
        
        Args:
            room_id: 房间ID
            user_id: 说话者ID
            text: 转录文本
            is_final: 是否是最终文本（一句话结束）
        """
        if room_id not in self.rooms:
            return
            
        room = self.rooms[room_id]
        
        # 更新用户的转录记录
        if is_final:
            room.transcripts[user_id].append(text)
        
        # 构建消息
        message = {
            "type": "transcript",
            "user_id": user_id,
            "text": text,
            "is_final": is_final,
            "timestamp": None  # TODO: 添加时间戳
        }
        
        # 广播给房间内所有连接
        for connection in room.connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

manager = ConnectionManager() 