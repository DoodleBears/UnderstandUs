from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import rooms, websocket
from app.core.config import settings
from app.core.connection_manager import manager
import uvicorn
import asyncio

app = FastAPI(
    title="音频对话分析系统",
    description="Real-time audio conversation analysis API",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # 预检请求的缓存时间
)

# 注册路由
app.include_router(rooms.router, prefix="/api", tags=["rooms"])
app.include_router(websocket.router, prefix="/api", tags=["websocket"])

@app.get("/")
async def root():
    return {"message": "音频对话分析系统 API"}

@app.on_event("startup")
async def startup_event():
    # 启动清理任务
    asyncio.create_task(manager.cleanup_inactive_connections())

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    ) 