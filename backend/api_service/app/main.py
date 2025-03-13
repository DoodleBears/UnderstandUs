import logging
import os

import socketio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Socket.IO server instance
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["*"]
)

# Create FastAPI application
app = FastAPI(
    title="UnderstandUs API Service",
    description="Real-time audio conversation analysis API",
    version="1.0.0"
)

# Create Socket.IO application
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

class TokenRequest(BaseModel):
    """Request model for token generation."""
    identity: str
    name: str
    room: str

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@app.get("/")
async def root():
    return {"message": "UnderstandUs API Service"}

@app.post("/token")
async def generate_token(request: TokenRequest) -> dict:
    """Generate a LiveKit access token.
    
    Args:
        request: TokenRequest containing identity, name, and room information
        
    Returns:
        dict: Contains the generated JWT token
        
    Raises:
        HTTPException: If token generation fails or environment variables are missing
    """
    try:
        api_key = os.getenv('LIVEKIT_API_KEY')
        api_secret = os.getenv('LIVEKIT_API_SECRET')
        
        if not api_key or not api_secret:
            raise HTTPException(
                status_code=500,
                detail="LiveKit API credentials not configured"
            )
            
        token = api.AccessToken(api_key, api_secret) \
            .with_identity(request.identity) \
            .with_name(request.name) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=request.room,
            ))
            
        return {"token": token.to_jwt()}
        
    except Exception as e:
        logger.error(f"Error generating token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate token: {str(e)}"
        ) 