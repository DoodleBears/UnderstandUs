import asyncio
import logging
from datetime import datetime
from typing import Dict

import socketio
from aiortc import RTCPeerConnection
from app.services.room_service import room_service

logger = logging.getLogger(__name__)


# 创建异步 Socket.IO 服务器
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:3000'],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1e8,
    allow_upgrades=True,
    namespaces='/'
)
app = socketio.ASGIApp(
    socketio_server=sio,
    socketio_path='socket.io',
    static_files=None
)

# 存储连接信息
class ConnectionStore:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, str]] = {}  # room_id -> {user_id -> sid}
        self.user_rooms: Dict[str, str] = {}  # user_id -> room_id
        self.peer_connections: Dict[str, RTCPeerConnection] = {}  # user_id -> RTCPeerConnection
        self.last_activity: Dict[str, datetime] = {}  # user_id -> last_activity_time
        self.max_connections_per_room = 10

connection_store = ConnectionStore()

@sio.event
async def connect(sid, environ):
    logger.warning(f"Client connected: {sid}")
    await sio.emit('connection_established', {'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    logger.warning(f"Client disconnected: {sid}")
    # 查找并清理用户连接
    for room_id, users in connection_store.active_connections.items():
        for user_id, stored_sid in users.items():
            if stored_sid == sid:
                await handle_user_disconnect(room_id, user_id)
                break
    logger.warning(f"Client disconnected: {sid}")

async def handle_user_disconnect(room_id: str, user_id: str):
    logger.warning(f"处理用户断开连接: room={room_id}, user={user_id}")
    
    # 检查是否是重复的断开连接请求
    if room_id not in connection_store.active_connections or \
       user_id not in connection_store.active_connections[room_id]:
        logger.warning(f"用户已经断开连接: room={room_id}, user={user_id}")
        return
        
    try:
        # 获取用户的 sid
        sid = connection_store.active_connections[room_id].get(user_id)
        if not sid:
            logger.warning(f"找不到用户的sid: room={room_id}, user={user_id}")
            return
            
        # 清理连接信息
        connection_store.active_connections[room_id].pop(user_id, None)
        if not connection_store.active_connections[room_id]:
            del connection_store.active_connections[room_id]
        
        # 清理用户信息
        connection_store.user_rooms.pop(user_id, None)
        connection_store.last_activity.pop(user_id, None)
        
        # 清理 WebRTC 连接
        if user_id in connection_store.peer_connections:
            pc = connection_store.peer_connections[user_id]
            await pc.close()
            del connection_store.peer_connections[user_id]
            logger.warning(f"清理WebRTC连接: user={user_id}")
        
        # 更新房间参与者
        room = await room_service.remove_participant(room_id, user_id)
        if room:
            # 如果房间为空，清理房间
            if len(room.participants) == 0:
                await room_service.cleanup_empty_room(room_id)
                logger.warning(f"清理空房间: {room_id}")
                # 广播房间已删除消息
                await sio.emit('room_deleted', {
                    'room_id': room_id,
                    'message': 'Room has been deleted as it is empty'
                }, room=room_id)
            else:
                # 广播用户离开消息
                logger.warning(f"广播用户离开消息: user={user_id}, room={room_id}")
                await sio.emit('user_left', {
                    'user_id': user_id,
                    'room_id': room_id
                }, room=room_id)
    except Exception as e:
        logger.error(f"处理断开连接时发生错误: {str(e)}")

@sio.event
async def join_room(sid, data):
    try:
        room_id = data.get('room_id')
        user_id = data.get('user_id')
        user_name = data.get('user_name', f"参与者 {len(connection_store.active_connections.get(room_id, {}))}")
        
        logger.warning(f"用户尝试加入房间: sid={sid}, room_id={room_id}, user_id={user_id}")
        
        if not room_id or not user_id:
            logger.error(f"缺少必要参数: room_id={room_id}, user_id={user_id}")
            await sio.emit('error', {'message': 'Missing room_id or user_id'}, room=sid)
            return

        # 检查用户是否已在其他房间
        if user_id in connection_store.user_rooms:
            old_room_id = connection_store.user_rooms[user_id]
            logger.warning(f"用户已在其他房间中，正在断开旧连接: user_id={user_id}, old_room={old_room_id}")
            # 如果房间id不同，则断开旧连接
            if old_room_id != room_id:
                await handle_user_disconnect(old_room_id, user_id)
            
            # 等待一小段时间确保清理完成
            await asyncio.sleep(0.1)
            
        # 检查房间是否存在
        room = await room_service.get_room(room_id)
        if not room:
            logger.error(f"房间不存在: {room_id}")
            await sio.emit('error', {'message': 'Room not found'}, room=sid)
            return
            
        # 检查房间人数限制
        if room_id in connection_store.active_connections:
            if len(connection_store.active_connections[room_id]) >= connection_store.max_connections_per_room:
                logger.warning(f"房间已满: {room_id}")
                await sio.emit('error', {'message': 'Room is full'}, room=sid)
                return

        # 先创建房间连接信息
        if room_id not in connection_store.active_connections:
            connection_store.active_connections[room_id] = {}
        
        # 更新连接信息
        connection_store.active_connections[room_id][user_id] = sid
        connection_store.user_rooms[user_id] = room_id
        connection_store.last_activity[user_id] = datetime.now()
        
        # 加入 Socket.IO 房间
        logger.warning(f"用户加入房间: sid={sid}, room={room_id}")
        await sio.enter_room(sid, room_id)
        
        # 更新房间参与者
        await room_service.add_participant(room_id, user_id, user_name)
        
        # 重新获取更新后的房间信息
        room = await room_service.get_room(room_id)
        if not room:
            logger.error(f"房间不存在（在添加参与者后）: {room_id}")
            await sio.emit('error', {'message': 'Room not found after adding participant'}, room=sid)
            return
            
        participants = [
            {"id": p.user_id, "name": p.name}
            for p in room.participants.values()
        ]
        
        # 广播用户加入消息
        logger.warning(f"广播用户加入消息: user={user_id}, room={room_id}")
        await sio.emit('user_joined', {
            'user_id': user_id,
            'user_name': user_name,
            'room_id': room_id
        }, room=room_id)
        
        # 发送房间信息给所有用户
        await sio.emit('room_info', {
            'room_id': room_id,
            'participants': participants
        }, room=room_id)
        
        logger.warning(f"用户成功加入房间: user={user_id}, room={room_id}")
        
    except Exception as e:
        logger.error(f"加入房间时发生错误: {str(e)}")
        # 发生错误时清理连接信息
        if room_id and user_id:
            if room_id in connection_store.active_connections:
                connection_store.active_connections[room_id].pop(user_id, None)
                if not connection_store.active_connections[room_id]:
                    del connection_store.active_connections[room_id]
            connection_store.user_rooms.pop(user_id, None)
            connection_store.last_activity.pop(user_id, None)
        await sio.emit('error', {'message': str(e)}, room=sid)

@sio.event
async def leave_room(sid, data):
    logger.warning(f"leave_room: {data}")
    try:
        room_id = data.get('room_id')
        user_id = data.get('user_id')
        
        if not room_id or not user_id:
            return
            
        await handle_user_disconnect(room_id, user_id)
        await sio.leave_room(sid, room_id)
        
        # 广播用户离开消息
        await sio.emit('user_left', {
            'user_id': user_id,
            'room_id': room_id
        }, room=room_id)
        
        # 更新房间参与者
        room = await room_service.remove_participant(room_id, user_id)
        if room:
            participants = [
                {"id": p.user_id, "name": p.name}
                for p in room.participants.values()
            ]
            # 发送房间信息给所有用户
            await sio.emit('room_info', {
                'room_id': room_id,
                'participants': participants
            }, room=room_id)
            
    except Exception as e:
        logger.error(f"Error in leave_room: {str(e)}")

@sio.event
async def offer(sid, data):
    logger.warning(f"offer: {data}")
    try:
        room_id = data.get('room_id')
        target_user_id = data.get('target_user_id')
        sdp = data.get('sdp')
        
        if not all([room_id, target_user_id, sdp]):
            await sio.emit('error', {'message': 'Missing required data'}, room=sid)
            return
            
        # 获取目标用户的 sid
        target_sid = connection_store.active_connections.get(room_id, {}).get(target_user_id)
        if not target_sid:
            await sio.emit('error', {'message': 'Target user not found'}, room=sid)
            return
            
        # 转发 offer 到目标用户
        await sio.emit('offer', {
            'sdp': sdp,
            'from_user_id': data.get('from_user_id')
        }, room=target_sid)
        
    except Exception as e:
        logger.error(f"Error in offer: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)

@sio.event
async def answer(sid, data):
    logger.warning(f"answer: {data}")
    try:
        room_id = data.get('room_id')
        target_user_id = data.get('target_user_id')
        sdp = data.get('sdp')
        
        if not all([room_id, target_user_id, sdp]):
            await sio.emit('error', {'message': 'Missing required data'}, room=sid)
            return
            
        # 获取目标用户的 sid
        target_sid = connection_store.active_connections.get(room_id, {}).get(target_user_id)
        if not target_sid:
            await sio.emit('error', {'message': 'Target user not found'}, room=sid)
            return
            
        # 转发 answer 到目标用户
        await sio.emit('answer', {
            'sdp': sdp,
            'from_user_id': data.get('from_user_id')
        }, room=target_sid)
        
    except Exception as e:
        logger.error(f"Error in answer: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)

@sio.event
async def ice_candidate(sid, data):
    logger.warning(f"ice_candidate: {data}")
    try:
        room_id = data.get('room_id')
        target_user_id = data.get('target_user_id')
        candidate = data.get('candidate')
        
        if not all([room_id, target_user_id, candidate]):
            await sio.emit('error', {'message': 'Missing required data'}, room=sid)
            return
            
        # 获取目标用户的 sid
        target_sid = connection_store.active_connections.get(room_id, {}).get(target_user_id)
        if not target_sid:
            await sio.emit('error', {'message': 'Target user not found'}, room=sid)
            return
            
        # 转发 ICE candidate 到目标用户
        await sio.emit('ice_candidate', {
            'candidate': candidate,
            'from_user_id': data.get('from_user_id')
        }, room=target_sid)
        
    except Exception as e:
        logger.error(f"Error in ice_candidate: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)

# 心跳处理
@sio.event
async def heartbeat(sid, data):
    logger.warning(f"heartbeat: {data}")
    try:
        user_id = data.get('user_id')
        if user_id and user_id in connection_store.last_activity:
            connection_store.last_activity[user_id] = datetime.now()
            await sio.emit('heartbeat_ack', {'timestamp': datetime.now().timestamp()}, room=sid)
    except Exception as e:
        logger.error(f"Error in heartbeat: {str(e)}")

# 清理超时连接
async def cleanup_inactive_connections():
    while True:
        try:
            current_time = datetime.now()
            timeout = 90  # 90秒超时
            
            for user_id, last_time in list(connection_store.last_activity.items()):
                if (current_time - last_time).total_seconds() > timeout:
                    if user_id in connection_store.user_rooms:
                        room_id = connection_store.user_rooms[user_id]
                        await handle_user_disconnect(room_id, user_id)
                        
            await asyncio.sleep(30)  # 每30秒检查一次
            
        except Exception as e:
            logger.error(f"Error in cleanup_inactive_connections: {str(e)}")
            await asyncio.sleep(30)

# 启动清理任务
@sio.on('connect')
async def start_cleanup(sid, environ):
    sio.start_background_task(cleanup_inactive_connections) 