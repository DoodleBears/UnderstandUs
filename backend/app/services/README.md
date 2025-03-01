# Services 模块

本模块包含各种业务服务的实现，负责处理具体的业务逻辑。

## 功能概述

### 音频处理服务 (`audio_processor.py`)

- 实时音频流处理和语音检测
- 功能：
  1. 音频缓冲管理
     - 维护固定大小的音频缓冲区
     - 自动处理溢出数据
  2. 语音活动检测 (VAD)
     - 使用 Silero VAD 模型
     - 精确检测语音片段
     - 自动分割连续语音
  3. 音频片段处理
     - 提取有效语音片段
     - 转换音频格式
     - 生成文本转录
- 参数配置：

  ```python
  AudioBuffer:
    - max_duration: 30.0  # 最大缓冲时长（秒）
    - sample_rate: 16000  # 采样率

  VAD 配置:
    - min_speech_duration_ms: 500  # 最小语音持续时间
    - min_silence_duration_ms: 500  # 最小静音持续时间
    - window_size_samples: 512      # 检测窗口大小
  ```

### 语音转文字服务 (`speech_to_text.py`)

- 使用 ElevenLabs API 进行语音转文字
- 功能：
  1. 音频转换
     - 支持多种音频格式
     - 自动处理采样率
  2. 文本生成
     - 实时转录
     - 标点符号检测
     - 句子完整性判断

## 实现细节

### 音频处理流程

```
原始音频 -> 缓冲区 -> VAD 检测 -> 提取语音片段 -> 转录文本
```

### 语音检测算法

1. 使用 Silero VAD 进行语音活动检测
2. 基于时间戳提取语音片段
3. 合并临近的语音片段
4. 过滤过短的语音片段

### 错误处理

- 音频格式错误处理
- API 调用异常处理
- 缓冲区溢出处理

## 使用示例

```python
# 音频处理
from app.services.audio_processor import audio_processor

# 处理音频块
results = audio_processor.process_audio_chunk(audio_data)
for text, is_final in results:
    print(f"转录文本: {text} (完整句子: {is_final})")

# 语音转文字
from app.services.speech_to_text import speech_to_text_service
text = speech_to_text_service.convert_audio_to_text(audio_data)
```

## 性能考虑

- 缓冲区大小限制：30秒
- 最小语音片段：500ms
- 最小静音间隔：500ms
- 采样率：16kHz（Silero VAD 要求）
