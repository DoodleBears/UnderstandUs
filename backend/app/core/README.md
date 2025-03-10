# Core 模块

核心模块包含应用程序的基础设施和核心功能组件。

## 文件结构

```
core/
├── config.py             # 应用配置管理
├── connection_manager.py # WebSocket 连接管理器
└── __init__.py          # 模块初始化
```

## 功能说明

### config.py

应用程序配置管理，基于 pydantic-settings：

- 服务器配置（主机、端口、环境等）
- API 密钥配置（OpenAI、ElevenLabs 等）
- 日志配置
- 其他全局设置

配置示例：

```python
from app.core.config import settings

# 使用配置
host = settings.HOST
port = settings.PORT
openai_key = settings.OPENAI_API_KEY
```

### connection_manager.py

WebSocket 连接管理器，负责：

- 管理活跃的 WebSocket 连接
- 房间内的消息广播
- 连接状态监控
- 自动清理断开的连接

主要功能：

1. 连接管理

   - 添加新连接
   - 移除断开的连接
   - 获取房间内的所有连接

2. 消息广播

   - 向特定房间广播消息
   - 向特定用户发送消息
   - 处理不同类型的消息（文本、音频、系统消息等）

3. 状态监控
   - 连接健康检查
   - 自动清理超时连接
   - 房间状态维护

使用示例：

```python
from app.core.connection_manager import manager

# 添加连接
await manager.connect(websocket, room_id, client_id)

# 广播消息
await manager.broadcast(room_id, message)

# 断开连接
await manager.disconnect(websocket)
```

## 错误处理

核心模块定义了自定义异常类：

- `ConnectionError` - 连接相关错误
- `ConfigurationError` - 配置相关错误
- `BroadcastError` - 消息广播错误

错误处理示例：

```python
try:
    await manager.broadcast(room_id, message)
except BroadcastError as e:
    logger.error(f"广播失败: {str(e)}")
    # 处理错误...
```

## 依赖注入

核心模块提供了依赖注入支持，可以在 FastAPI 路由中使用：

```python
from fastapi import Depends
from app.core.config import get_settings

@app.get("/config")
async def get_config(settings = Depends(get_settings)):
    return {"environment": settings.ENVIRONMENT}
```
