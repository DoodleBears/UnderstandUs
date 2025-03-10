# 音频模块

## 功能概述

音频模块提供了完整的音频采集、处理和管理功能，支持实时音频流处理和设备控制。

### 组件结构

```
audio/
├── AudioControl.tsx     # 音频控制组件
├── AudioProvider.tsx    # 音频上下文提供者
├── AudioStatus.tsx      # 音频状态显示组件
└── useAudio.ts         # 音频Hook
```

### 核心功能

1. 设备管理

   - 自动检测音频设备
   - 设备切换支持
   - 权限管理

2. 音频控制

   - 音量调节
   - 静音控制
   - 设备开关

3. 状态监控
   - 实时音量显示
   - 设备状态指示
   - 错误处理

## 使用示例

### 基础设置

```tsx
import { AudioProvider } from './audio/AudioProvider'

function App() {
  return (
    <AudioProvider>
      <YourComponent />
    </AudioProvider>
  )
}
```

### 音频控制

```tsx
import { AudioControl } from './audio/AudioControl'

function YourComponent() {
  return <AudioControl showDeviceSelector showVolumeControl />
}
```

### 状态显示

```tsx
import { AudioStatus } from './audio/AudioStatus'

function YourComponent() {
  return <AudioStatus showDeviceInfo showMetrics />
}
```

### Hook 使用

```tsx
import { useAudio } from './audio/useAudio'

function YourComponent() {
  const { state, devices, toggleMicrophone, setVolume } = useAudio()

  return (
    <div>
      <button onClick={toggleMicrophone}>
        {state.isEnabled ? '关闭麦克风' : '开启麦克风'}
      </button>
    </div>
  )
}
```

## 技术规格

- 采样率：48kHz
- 音频格式：16-bit PCM
- 通道数：单声道
- 缓冲区：2048 samples

## 配置选项

### AudioControl 组件

| 属性               | 类型    | 默认值 | 说明               |
| ------------------ | ------- | ------ | ------------------ |
| showDeviceSelector | boolean | true   | 是否显示设备选择器 |
| showVolumeControl  | boolean | true   | 是否显示音量控制   |

### AudioStatus 组件

| 属性           | 类型    | 默认值 | 说明             |
| -------------- | ------- | ------ | ---------------- |
| showDeviceInfo | boolean | true   | 是否显示设备信息 |
| showMetrics    | boolean | true   | 是否显示音频指标 |

## 性能优化

1. 异步处理

   - 设备枚举
   - 音频处理
   - 状态更新

2. 资源管理

   - 自动释放未使用的设备
   - 内存使用优化
   - 状态缓存

3. 错误处理
   - 自动重试机制
   - 优雅降级
   - 用户友好提示
