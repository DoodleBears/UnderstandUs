from app.core.connection_manager import manager
from app.services.audio_processor import audio_processor
from app.services.room_service import room_service
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
from typing import Dict, Any

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

@router.websocket("/ws/room/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    try:
        # 获取房间信息
        room = await room_service.get_room(room_id)
        if not room:
            await websocket.close(code=4004, reason="Room not found")
            return

        # 生成用户ID和名称
        user_id = f"user_{len(room.participants) + 1}"
        user_name = "主持人" if len(room.participants) == 0 else f"参与者 {len(room.participants)}"

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
                    # 已经处理过了，不需要重复处理
                    pass
                elif message.get('type') == 'leave_room':
                    await manager.disconnect(websocket, room_id, user_id)
                    break
                elif message.get('type') == 'audio_data':
                    # 处理音频数据
                    audio_data = message.get('payload', {}).get('data')
                    if audio_data:
                        # TODO: 处理音频数据
                        pass

        except WebSocketDisconnect:
            await manager.disconnect(websocket, room_id, user_id)
        finally:
            # 取消心跳检查任务
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass 