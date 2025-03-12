import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import rooms
from app.websocket.socketio_server import app as socketio_app

app = FastAPI(
    title="音频对话分析系统",
    description="Real-time audio conversation analysis API",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # 预检请求的缓存时间
)

# 注册路由
app.include_router(rooms.router, prefix="/api", tags=["rooms"])

# 挂载 Socket.IO 应用
app.mount("/", socketio_app)

@app.get("/")
async def root():
    return {"message": "音频对话分析系统 API"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    ) 