# API 模块

该模块包含所有的 HTTP 和 WebSocket API 端点定义。

## 文件结构

```
api/
├── rooms.py      # 房间管理相关的 API 端点
└── websocket.py  # WebSocket 连接和实时通信的 API 端点
```

## 功能说明

### rooms.py

房间管理 API，提供以下功能：

- 创建新的对话房间
- 获取房间列表
- 获取特定房间信息
- 加入/离开房间
- 房间状态管理

主要端点：

- `POST /api/rooms` - 创建新房间
- `GET /api/rooms` - 获取房间列表
- `GET /api/rooms/{room_id}` - 获取特定房间信息

### websocket.py

WebSocket 通信 API，处理：

- 实时音频数据传输
- 用户连接管理
- 房间内实时消息广播
- 音频分析结果推送

主要端点：

- `WebSocket /api/ws/{room_id}/{client_id}` - WebSocket 连接端点
- `WebSocket /api/signaling/{room_id}/{client_id}` - WebRTC 信令服务端点

## 使用示例

### 创建房间

```python
response = await client.post("/api/rooms", json={
    "name": "测试房间",
    "description": "这是一个测试房间"
})
```

### WebSocket 连接

```python
async with websockets.connect(f"ws://localhost:8000/api/ws/{room_id}/{client_id}") as websocket:
    await websocket.send(json.dumps({
        "type": "join",
        "data": {"room_id": room_id}
    }))
```

## 错误处理

API 模块使用标准的 HTTP 状态码进行错误处理：

- 400 - 请求参数错误
- 404 - 资源不存在
- 409 - 资源冲突
- 500 - 服务器内部错误

每个错误响应都包含详细的错误信息：

```json
{
  "error": "错误类型",
  "message": "详细错误信息",
  "details": {}
}
```
