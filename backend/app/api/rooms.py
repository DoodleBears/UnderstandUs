from typing import List

from app.models.room import Room
from app.services.room_service import room_service
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class CreateRoomRequest(BaseModel):
    name: str
    host_name: str
    host_id: str

class CreateRoomResponse(BaseModel):
    room: Room

@router.post("/rooms", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    print(f"创建房间请求: {request}")
    # 生成一个简单的用户ID（实际应用中应该使用认证系统）
    host_id = request.host_id
    
    room = await room_service.create_room(
        name=request.name,
        host_id=host_id,
    )
    
    if not room:
        raise HTTPException(status_code=500, detail="Failed to create room")
    
    return CreateRoomResponse(room=room)

@router.get("/rooms", response_model=List[Room])
async def list_rooms():
    return await room_service.list_rooms()

@router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    room = await room_service.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str):
    success = await room_service.delete_room(room_id)
    if not success:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room deleted successfully"} 