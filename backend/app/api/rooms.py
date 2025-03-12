from typing import List

from app.models.room import Room
from app.services.livekit_service import livekit_service
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
    token: str

class JoinRoomRequest(BaseModel):
    user_name: str
    user_id: str

class JoinRoomResponse(BaseModel):
    room: Room
    token: str

@router.post("/rooms", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    """Create a new room and return room details with LiveKit token."""
    room = await room_service.create_room(
        name=request.name,
        host_id=request.host_id,
    )
    
    if not room:
        raise HTTPException(status_code=500, detail="Failed to create room")
    
    # Add host as participant
    await room_service.add_participant(
        room_id=room.id,
        user_id=request.host_id,
        user_name=request.host_name
    )
    
    # Generate LiveKit token for host
    token = livekit_service.create_token(
        room_name=room.id,
        user_id=request.host_id,
        user_name=request.host_name
    )
    
    return CreateRoomResponse(room=room, token=token)

@router.post("/rooms/{room_id}/join", response_model=JoinRoomResponse)
async def join_room(room_id: str, request: JoinRoomRequest):
    """Join an existing room and return room details with LiveKit token."""
    room = await room_service.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Add participant to room
    await room_service.add_participant(
        room_id=room_id,
        user_id=request.user_id,
        user_name=request.user_name
    )
    
    # Generate LiveKit token
    token = livekit_service.create_token(
        room_name=room_id,
        user_id=request.user_id,
        user_name=request.user_name
    )
    
    return JoinRoomResponse(room=room, token=token)

@router.get("/rooms", response_model=List[Room])
async def list_rooms():
    """List all active rooms."""
    return await room_service.list_rooms()

@router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    """Get room details by ID."""
    room = await room_service.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str):
    """Delete a room and clean up resources."""
    success = await room_service.delete_room(room_id)
    if not success:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room deleted successfully"} 