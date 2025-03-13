import asyncio
import logging
import subprocess

import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 Socket.IO 服务器实例
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[]  # 在生产环境中设置具体的源
)

# 创建 FastAPI 应用
app = FastAPI(
    title="UnderstandUs",
    description="Real-time audio conversation analysis API",
    version="1.0.0"
)

# 创建 Socket.IO 应用
socket_app = socketio.ASGIApp(sio, app)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Socket.IO 事件处理器
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@app.get("/")
async def root():
    return {"message": "UnderstandUs API"}

async def run_fastapi():
    """Run the FastAPI application with uvicorn"""
    config = uvicorn.Config(
        socket_app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    )
    server = uvicorn.Server(config)
    await server.serve()

async def run_stt_agent():
    """Run the STT agent"""
    try:
        # 直接运行 stt_agent.py 脚本
        process = await asyncio.create_subprocess_exec(
            'python3', 'app/stt_agent.py', 'dev',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        logger.info("STT agent started in development mode")

        async def read_stream(stream, prefix):
            while True:
                line = await stream.readline()
                if not line:
                    break
                logger.info(f"{prefix}: {line.decode().strip()}")

        # 同时监听 stdout 和 stderr
        await asyncio.gather(
            read_stream(process.stdout, "STT-OUT"),
            read_stream(process.stderr, "STT-ERR")
        )
    except Exception as e:
        logger.error(f"Error running STT agent: {e}")
        raise

async def main():
    """Main function to run both services concurrently"""
    try:
        await asyncio.gather(
            run_fastapi(),
            run_stt_agent()
        )
    except Exception as e:
        logger.error(f"Error in main: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 