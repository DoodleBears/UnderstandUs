import asyncio
import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.connection_manager import manager
from app.services.room_service import room_service

logger = logging.getLogger(__name__)
router = APIRouter()

HEARTBEAT_TIMEOUT = 90  # 90秒没有心跳就断开连接
HEARTBEAT_CHECK_INTERVAL = 30  # 每30秒检查一次心跳

async def check_heartbeat(websocket: WebSocket, last_heartbeat: Dict[str, Any]):
    while True:
        await asyncio.sleep(HEARTBEAT_CHECK_INTERVAL)
        if websocket.client_state.connected:
            current_time = asyncio.get_event_loop().time()
            if current_time - last_heartbeat.get('timestamp', 0) > HEARTBEAT_TIMEOUT:
                await websocket.close(code=1000, reason="Heartbeat timeout")
                break

@router.websocket("/ws/room/{room_id}/user/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    try:
        # 获取房间信息
        room = await room_service.get_room(room_id)
        if not room:
            await websocket.close(code=4004, reason="Room not found")
            return

        # 获取或创建用户信息
        user_name = "主持人" if len(room.participants) == 0 else f"参与者 {len(room.participants)}"
        
        # 如果用户已存在，使用现有名称
        if user_id in room.participants:
            user_name = room.participants[user_id].name

        # 连接管理
        await manager.connect(websocket, room_id, user_id, user_name)

        # 初始化心跳时间
        last_heartbeat = {'timestamp': asyncio.get_event_loop().time()}

        # 启动心跳检查任务
        heartbeat_task = asyncio.create_task(check_heartbeat(websocket, last_heartbeat))

        try:
            while True:
                # 接收消息
                data = await websocket.receive_text()
                message = json.loads(data)

                # 更新最后活动时间
                manager.update_activity(user_id)

                # 处理心跳消息
                if message.get('type') == 'heartbeat':
                    last_heartbeat['timestamp'] = asyncio.get_event_loop().time()
                    await websocket.send_json({
                        'type': 'heartbeat_ack',
                        'payload': {
                            'timestamp': last_heartbeat['timestamp']
                        }
                    })
                    continue

                # 处理其他消息
                if message.get('type') == 'join_room':
                    # 广播到所有参与者
                    room = await room_service.get_room(room_id)
                    if not room:
                        await websocket.close(code=4004, reason="Room not found")
                        return
                    
                    # 广播新用户加入消息
                    await manager.broadcast_to_room(room_id, {
                        'type': 'user_joined',
                        'payload': {
                            'user_id': user_id,
                            'user_name': user_name
                        }
                    })
                    
                    # 发送当前房间状态给新用户
                    room = await room_service.get_room(room_id)
                    participants = [
                        {
                            "id": p.user_id,
                            "name": p.name,
                        }
                        for p in room.participants.values()
                    ]
                    json_object = {
                        'type': 'room_update',
                        'payload': {
                            'participants': participants
                        }
                    }
                    
                    # 广播给房间内所有参与者
                    # await manager.broadcast_to_room(room_id, json_object)
                    logger.warning(f"Sending room update to user {user_id}: {json_object}")
                    await manager.broadcast_to_room(room_id, json_object)
                    
                elif message.get('type') == 'leave_room':
                    # 广播用户离开消息
                    await manager.broadcast_to_room(room_id, {
                        'type': 'user_left',
                        'payload': {
                            'user_id': user_id,
                            'user_name': user_name
                        }
                    })
                    await manager.disconnect(websocket, room_id, user_id)
                    break
                elif message.get('type') in ['offer', 'answer', 'ice-candidate']:
                    # 直接处理 WebRTC 信令消息
                    target_user_id = message.get('target_user_id')
                    if not target_user_id:
                        logger.error(f"Missing target_user_id in {message.get('type')} message")
                        continue
                        
                    # 获取目标用户的 WebSocket 连接
                    target_connection = manager.get_connection(room_id, target_user_id)
                    if target_connection:
                        # 转发信令消息给目标用户
                        await target_connection.send_json({
                            'type': message.get('type'),
                            'data': message.get('payload'),
                            'from_user_id': user_id
                        })
                    else:
                        logger.warning(f"Target user {target_user_id} not found in room {room_id}")
                elif message.get('type') == 'audio_data':
                    # 处理音频数据
                    audio_data = message.get('payload', {}).get('data')
                    if audio_data:
                        # TODO: 处理音频数据
                        pass

        except WebSocketDisconnect:
            # 广播用户断开连接消息
            await manager.broadcast_to_room(room_id, {
                'type': 'user_disconnected',
                'payload': {
                    'user_id': user_id,
                    'user_name': user_name
                }
            })
            await manager.disconnect(websocket, room_id, user_id)
        finally:
            # 取消心跳任务
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # 取消心跳任务
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass
