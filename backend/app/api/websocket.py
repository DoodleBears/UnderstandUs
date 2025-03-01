from app.core.connection_manager import manager
from app.services.audio_processor import audio_processor
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(websocket, room_id, user_id)
    try:
        while True:
            # 接收音频数据
            audio_data = await websocket.receive_bytes()
            
            # 处理音频数据，获取所有检测到的语音片段
            results = audio_processor.process_audio_chunk(audio_data)
            
            # 广播每个语音片段的转录文本
            for text, is_final in results:
                await manager.broadcast_transcript(room_id, user_id, text, is_final)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        print(f"Error in websocket connection: {str(e)}")
        manager.disconnect(websocket, room_id) 