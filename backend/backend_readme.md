# UnderstandUs Backend

这是 UnderstandUs 项目的后端服务，基于 FastAPI 构建的实时音频对话分析系统。

## 技术栈

- Python 3.11+
- FastAPI
- WebSocket
- OpenAI API
- PyTorch
- 音频处理库 (torchaudio, sounddevice, soundfile)
- WebRTC (aiortc)

## 项目结构

```
backend/
├── app/                    # 主应用目录
│   ├── api/               # API 接口定义
│   ├── core/              # 核心功能模块
│   ├── models/            # 数据模型定义
│   ├── routers/           # 路由处理器
│   ├── services/          # 业务服务层
│   ├── websocket/         # WebSocket 处理
│   └── main.py           # 应用入口
├── tests/                 # 测试目录
├── .env                   # 环境变量配置
├── .env.example          # 环境变量示例
├── Dockerfile            # Docker 构建文件
├── pyproject.toml        # 项目依赖管理
└── requirements.txt      # 依赖清单
```

## 主要功能模块

1. **实时音频处理**

   - 基于 WebRTC 的音频流处理
   - 音频数据的实时采集和传输

2. **WebSocket 通信**

   - 实时双向通信支持
   - 连接管理和自动清理机制

3. **对话分析系统**

   - 集成 OpenAI API
   - 实时语音识别和分析
   - 对话内容的语义理解

4. **房间管理**
   - 多房间支持
   - 用户会话管理

## 环境配置

项目使用 Poetry 进行依赖管理，主要环境变量包括：

```bash
# 服务器配置
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# API 密钥配置
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## 开发设置

1. 安装依赖：

```bash
poetry install
```

2. 配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置信息
```

3. 运行开发服务器：

```bash
poetry run python -m app.main
```

## 测试

项目使用 pytest 进行测试：

```bash
poetry run pytest
```

## Docker 支持

项目提供了 Docker 支持，可以通过以下命令构建和运行：

```bash
docker build -t understand-us-backend .
docker run -p 8000:8000 understand-us-backend
```

## API 文档

启动服务后，可以通过以下地址访问 API 文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
