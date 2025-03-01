# API 模块

本模块包含所有的 API 路由处理器，负责处理 HTTP 和 WebSocket 请求。

## 功能概述

### WebSocket 处理 (`websocket.py`)

- 实时音频流处理
  - 端点：`/ws/{room_id}/{user_id}`
  - 功能：接收客户端的音频数据流，处理后广播转录文本
  - 实现：
    1. 建立 WebSocket 连接并加入指定房间
    2. 接收二进制音频数据
    3. 使用 AudioProcessor 处理音频数据
    4. 通过 ConnectionManager 广播转录结果

### 错误处理

- 处理 WebSocket 断开连接
- 处理音频处理异常
- 自动清理断开的连接

## 数据流

```
客户端 -> WebSocket 连接 -> 音频处理 -> 文本转录 -> 广播结果
```

## 使用示例

```python
# 连接 WebSocket
ws = await websocket_connect("ws://localhost:8000/ws/room123/user456")

# 发送音频数据
await ws.send_bytes(audio_data)

# 接收转录结果
result = await ws.receive_text()
# 结果格式: {"type": "transcript", "user_id": "...", "text": "...", "is_final": true/false}
```
