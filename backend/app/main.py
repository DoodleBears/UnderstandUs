import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@app.get("/")
async def root():
    return {"message": "UnderstandUs API"}

if __name__ == "__main__":
    uvicorn.run(
        socket_app,  # 注意这里改成了 socket_app
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    ) 