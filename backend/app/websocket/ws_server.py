import logging
from typing import Dict

import socketio
from app.services.room_service import room_service

logger = logging.getLogger(__name__)

# Create async Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:3000'],
    logger=True,
    engineio_logger=True
)

app = socketio.ASGIApp(
    socketio_server=sio,
    socketio_path='socket.io'
)

# Store active connections
connections: Dict[str, Dict[str, str]] = {}  # room_id -> {user_id -> sid}

@sio.event
async def connect(sid, environ):
    """Handle client connection."""
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_established', {'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    logger.info(f"Client disconnected: {sid}")
    # Clean up connection data
    for room_id, users in connections.items():
        for user_id, stored_sid in users.items():
            if stored_sid == sid:
                if room_id in connections:
                    connections[room_id].pop(user_id, None)
                    if not connections[room_id]:
                        del connections[room_id]
                break

@sio.event
async def join_room(sid, data):
    """Handle room join request."""
    try:
        room_id = data.get('room_id')
        user_id = data.get('user_id')
        
        if not room_id or not user_id:
            await sio.emit('error', {'message': 'Missing room_id or user_id'}, room=sid)
            return
            
        # Join Socket.IO room
        await sio.enter_room(sid, room_id)
        
        # Store connection info
        if room_id not in connections:
            connections[room_id] = {}
        connections[room_id][user_id] = sid
        
        # Get room info
        room = await room_service.get_room(room_id)
        if room:
            # Send room info to the client
            await sio.emit('room_info', {
                'room_id': room_id,
                'participants': [
                    {"id": p.user_id, "name": p.name}
                    for p in room.participants.values()
                ],
                'transcripts': room.transcripts
            }, room=sid)
            
    except Exception as e:
        logger.error(f"Error in join_room: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)

@sio.event
async def leave_room(sid, data):
    """Handle room leave request."""
    try:
        room_id = data.get('room_id')
        user_id = data.get('user_id')
        
        if not room_id or not user_id:
            return
            
        # Leave Socket.IO room
        await sio.leave_room(sid, room_id)
        
        # Clean up connection info
        if room_id in connections:
            connections[room_id].pop(user_id, None)
            if not connections[room_id]:
                del connections[room_id]
                
    except Exception as e:
        logger.error(f"Error in leave_room: {str(e)}")

@sio.event
async def transcript_update(sid, data):
    """Handle transcript update."""
    try:
        room_id = data.get('room_id')
        user_id = data.get('user_id')
        text = data.get('text')
        is_final = data.get('is_final', False)
        
        if not all([room_id, user_id, text]):
            await sio.emit('error', {'message': 'Missing required data'}, room=sid)
            return
            
        # Add transcript to room
        room = await room_service.add_transcript(
            room_id=room_id,
            user_id=user_id,
            text=text,
            is_final=is_final
        )
        
        if room:
            # Broadcast transcript to all users in the room
            await sio.emit('transcript_received', {
                'room_id': room_id,
                'user_id': user_id,
                'text': text,
                'is_final': is_final,
                'timestamp': room.transcripts[-1]['timestamp']
            }, room=room_id)
            
    except Exception as e:
        logger.error(f"Error in transcript_update: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid) 