# WebRTC 模块

## 功能概述

WebRTC 模块提供了实时音频通信的核心功能，支持点对点连接、信令服务和数据通道。

### 模块结构

```
webrtc/
├── WebRTCProvider.tsx   # WebRTC 上下文提供者
├── connection.ts        # 连接管理器
├── signaling.ts         # 信令服务
└── types.ts            # 类型定义
```

### 核心功能

1. 连接管理

   - 点对点连接建立
   - ICE 候选者处理
   - 连接状态监控
   - 自动重连机制

2. 信令服务

   - WebSocket 连接
   - 房间管理
   - 消息路由
   - 错误处理

3. 数据通道
   - 可靠数据传输
   - 消息广播
   - 状态同步
   - 错误恢复

## 使用示例

### 基础设置

```tsx
import { WebRTCProvider } from './webrtc/WebRTCProvider'

function App() {
  return (
    <WebRTCProvider signalingUrl="ws://your-server/signaling">
      <YourComponent />
    </WebRTCProvider>
  )
}
```

### 连接管理

```tsx
import { useWebRTC } from './webrtc/WebRTCProvider'

function YourComponent() {
  const { state, actions } = useWebRTC()

  useEffect(() => {
    // 连接到房间
    actions.connect('room-id', 'user-id')

    return () => {
      // 清理连接
      actions.disconnect()
    }
  }, [])

  return (
    <div>
      <div>连接状态: {state.isConnected ? '已连接' : '未连接'}</div>
      <div>对等连接数: {state.peers.size}</div>
    </div>
  )
}
```

### 音频流处理

```tsx
function YourComponent() {
  const { actions } = useWebRTC()
  const { state: audioState } = useAudio()

  useEffect(() => {
    if (audioState.stream) {
      actions.setLocalStream(audioState.stream)
    }
  }, [audioState.stream])

  return <div>/* 你的组件内容 */</div>
}
```

## 技术规格

### WebRTC 配置

- ICE 服务器：Google STUN
- 连接池大小：10
- 数据通道：有序传输
- 自动重连：支持

### 信令服务

- 协议：WebSocket
- 重连尝试：5次
- 重连间隔：指数退避
- 心跳检测：支持

## 类型定义

### WebRTCState

```typescript
interface WebRTCState {
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  peers: Map<string, PeerConnection>
  localStream: MediaStream | null
}
```

### PeerConnection

```typescript
interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  stream: MediaStream | null
  dataChannel: RTCDataChannel | null
}
```

## 性能优化

1. 连接管理

   - 连接池复用
   - 资源自动释放
   - 状态缓存

2. 数据传输

   - 消息队列
   - 批量处理
   - 压缩传输

3. 错误恢复
   - 自动重连
   - 优雅降级
   - 状态同步

## 安全考虑

1. 信令安全

   - 消息验证
   - 连接加密
   - 权限控制

2. 数据安全

   - 端到端加密
   - 数据验证
   - 访问控制

3. 资源保护
   - 速率限制
   - 连接限制
   - 资源清理
