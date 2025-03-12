import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import rooms
from app.websocket.ws_server import app as ws_app

app = FastAPI(
    title="UnderstandUs",
    description="Real-time audio conversation analysis API",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with production domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Register routes
app.include_router(rooms.router, prefix="/api", tags=["rooms"])

# Mount WebSocket application
app.mount("/ws", ws_app)

@app.get("/")
async def root():
    return {"message": "UnderstandUs API"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    ) 