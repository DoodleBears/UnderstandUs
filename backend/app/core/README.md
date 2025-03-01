# Core 模块

本模块包含核心功能组件，负责应用的基础设施和共享功能。

## 功能概述

### 配置管理 (`config.py`)

- 使用 pydantic-settings 进行配置管理
- 支持环境变量和 .env 文件
- 配置项包括：
  - 服务器配置（主机、端口、环境）
  - OpenAI API 配置
  - ElevenLabs API 配置

### 连接管理器 (`connection_manager.py`)

- 管理 WebSocket 连接和房间
- 功能：
  1. 房间管理
     - 创建/获取房间
     - 自动清理空房间
  2. 连接管理
     - 处理用户连接/断开
     - 维护用户-房间映射
  3. 消息广播
     - 房间内消息广播
     - 转录文本的实时分发
- 数据结构：
  ```python
  Room:
    - room_id: str
    - connections: Set[WebSocket]
    - transcripts: Dict[str, List[str]]  # 用户ID -> 转录记录
  ```

## 实现细节

### 房间生命周期

```
创建房间 -> 用户加入 -> 消息广播 -> 用户离开 -> 清理空房间
```

### 消息格式

```json
{
  "type": "transcript",
  "user_id": "用户ID",
  "text": "转录文本",
  "is_final": true/false,
  "timestamp": "时间戳"
}
```

## 使用示例

```python
# 配置
from app.core.config import settings
print(f"Running in {settings.ENVIRONMENT} mode")

# 连接管理
from app.core.connection_manager import manager
await manager.connect(websocket, "room123", "user456")
await manager.broadcast_transcript("room123", "user456", "Hello", True)
```
