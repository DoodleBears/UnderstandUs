import pytest
import asyncio
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
from unittest.mock import AsyncMock, MagicMock, patch
from app.main import app
from app.websocket.signaling import SignalingHandler, SignalingConnection
from aiortc import RTCPeerConnection, RTCSessionDescription

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    ws.receive_json = AsyncMock()
    ws.send_json = AsyncMock()
    return ws

@pytest.fixture
def signaling_handler():
    return SignalingHandler()

@pytest.mark.asyncio
async def test_signaling_connection_lifecycle(mock_websocket, signaling_handler):
    """测试信令连接的生命周期"""
    room_id = "test_room"
    user_id = "test_user"
    
    # 模拟连接建立
    connection = SignalingConnection(mock_websocket, room_id, user_id)
    assert connection.peer_connection is None
    
    # 模拟 WebRTC offer
    offer_data = {
        "type": "offer",
        "data": {
            "sdp": "v=0\r\n...",  # 简化的 SDP
            "type": "offer"
        }
    }
    
    # 处理 offer
    await signaling_handler.handle_offer(connection, offer_data["data"])
    assert connection.peer_connection is not None
    mock_websocket.send_json.assert_called_once()
    
    # 验证发送的 answer
    answer_call = mock_websocket.send_json.call_args[0][0]
    assert answer_call["type"] == "answer"
    assert "sdp" in answer_call["data"]
    
    # 清理
    await connection.close()
    assert connection.peer_connection is None

@pytest.mark.asyncio
async def test_ice_candidate_handling(mock_websocket, signaling_handler):
    """测试 ICE candidate 处理"""
    room_id = "test_room"
    user_id = "test_user"
    connection = SignalingConnection(mock_websocket, room_id, user_id)
    
    # 创建 peer connection
    offer_data = {
        "type": "offer",
        "data": {
            "sdp": "v=0\r\n...",
            "type": "offer"
        }
    }
    await signaling_handler.handle_offer(connection, offer_data["data"])
    
    # 测试 ICE candidate 处理
    ice_data = {
        "sdpMid": "0",
        "sdpMLineIndex": 0,
        "candidate": "candidate:1 1 UDP 2013266431 192.168.1.100 30000 typ host"
    }
    
    await signaling_handler.handle_ice_candidate(connection, ice_data)
    
    # 清理
    await connection.close()

@pytest.mark.asyncio
async def test_room_connections(mock_websocket, signaling_handler):
    """测试房间内的连接管理"""
    room_id = "test_room"
    
    # 创建多个用户连接
    connections = []
    for i in range(3):
        user_id = f"user_{i}"
        ws = AsyncMock(spec=WebSocket)
        connection = SignalingConnection(ws, room_id, user_id)
        signaling_handler.connections[user_id] = connection
        connections.append(connection)
    
    # 验证房间连接数
    room_connections = signaling_handler.get_room_connections(room_id)
    assert len(room_connections) == 3
    
    # 验证用户隔离
    other_room_connections = signaling_handler.get_room_connections("other_room")
    assert len(other_room_connections) == 0
    
    # 清理
    for connection in connections:
        await connection.close()

@pytest.mark.asyncio
async def test_connection_handler(mock_websocket, signaling_handler):
    """测试连接处理器"""
    room_id = "test_room"
    user_id = "test_user"
    
    # 模拟消息序列
    messages = [
        {
            "type": "offer",
            "data": {
                "sdp": "v=0\r\n...",
                "type": "offer"
            }
        },
        {
            "type": "ice-candidate",
            "data": {
                "sdpMid": "0",
                "sdpMLineIndex": 0,
                "candidate": "candidate:1 1 UDP 2013266431 192.168.1.100 30000 typ host"
            }
        }
    ]
    
    mock_websocket.receive_json.side_effect = messages + [Exception("Connection closed")]
    
    # 运行连接处理器
    await signaling_handler.handle_connection(mock_websocket, room_id, user_id)
    
    # 验证消息处理
    assert mock_websocket.send_json.call_count >= 1
    assert user_id not in signaling_handler.connections

if __name__ == "__main__":
    pytest.main(["-v", "test_signaling.py"]) 