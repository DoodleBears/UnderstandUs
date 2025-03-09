from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.models.room import Room
from app.services.room_service import room_service

router = APIRouter()

class CreateRoomRequest(BaseModel):
    name: str
    host_name: str

class CreateRoomResponse(BaseModel):
    room: Room

@router.post("/rooms", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    # 生成一个简单的用户ID（实际应用中应该使用认证系统）
    host_id = f"user_{len(await room_service.list_rooms()) + 1}"
    
    room = await room_service.create_room(
        name=request.name,
        host_id=host_id,
        host_name=request.host_name
    )
    
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