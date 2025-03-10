import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket

from app.main import app
from app.monitoring.metrics import metrics_collector
from app.websocket.signaling import SignalingConnection


@pytest.fixture(autouse=True)
async def reset_metrics():
    """Reset metrics before each test"""
    metrics_collector._connection_history.clear()
    metrics_collector.record_connection_metrics(total=0, per_room={})
    yield
    metrics_collector._connection_history.clear()

@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    ws.receive_json = AsyncMock()
    ws.send_json = AsyncMock()
    return ws

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.mark.asyncio
async def test_full_signaling_flow(mock_websocket):
    """测试完整的信令流程"""
    # 模拟两个客户端
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    async with SignalingConnection(ws1, "room1", "user1") as client1, \
              SignalingConnection(ws2, "room1", "user2") as client2:
        
        # 测试加入房间
        await client1.connect()
        await client2.connect()
        
        # 测试 Offer/Answer 交换
        offer = {
            "type": "offer",
            "sdp": "v=0\no=- 123456 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n"
        }
        await client1.send_offer(offer, "user2")
        
        answer = {
            "type": "answer",
            "sdp": "v=0\no=- 654321 2 IN IP4 127.0.0.1\ns=-\nt=0 0\n"
        }
        await client2.send_answer(answer, "user1")
        
        # 测试 ICE 候选者交换
        ice_candidate = {
            "candidate": "candidate:1 1 UDP 2130706431 192.168.1.1 8000 typ host",
            "sdpMLineIndex": 0,
            "sdpMid": "0"
        }
        await client1.send_ice_candidate(ice_candidate, "user2")
        await client2.send_ice_candidate(ice_candidate, "user1")

@pytest.mark.asyncio
async def test_multi_user_scenario(mock_websocket):
    """测试多人连接场景"""
    # 创建多个客户端连接
    clients = []
    for i in range(3):
        ws = AsyncMock(spec=WebSocket)
        client = SignalingConnection(ws, "room1", f"user{i}")
        clients.append(client)
    
    # 测试连接
    for client in clients:
        await client.connect()
    
    # 清理
    for client in clients:
        await client.close()

@pytest.mark.asyncio
async def test_error_handling(mock_websocket):
    """测试错误处理"""
    async with SignalingConnection(mock_websocket, "room1", "user1") as client:
        await client.connect()
        
        # 测试无效的 SDP
        invalid_offer = {
            "type": "offer",
            "sdp": "invalid sdp"
        }
        with pytest.raises(Exception):
            await client.send_offer(invalid_offer, "user2")
        
        # 测试无效的 ICE 候选者
        invalid_ice = {
            "candidate": "invalid candidate"
        }
        with pytest.raises(Exception):
            await client.send_ice_candidate(invalid_ice, "user2")
        
        # 测试连接到不存在的用户
        with pytest.raises(Exception):
            await client.send_offer({"type": "offer", "sdp": "valid sdp"}, "nonexistent_user")

@pytest.mark.asyncio
async def test_connection_cleanup(mock_websocket):
    """测试连接清理"""
    client = SignalingConnection(mock_websocket, "room1", "user1")
    await client.connect()
    
    # 模拟连接断开
    await client.disconnect()
    
    # 验证清理
    await asyncio.sleep(1)  # 等待清理完成
    metrics = metrics_collector.get_connection_metrics(1)[0]
    assert metrics.total_connections == 0
    assert "room1" not in metrics.connections_per_room 