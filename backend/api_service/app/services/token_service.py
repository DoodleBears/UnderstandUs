from fastapi import HTTPException
from livekit import api

from ..core.config import settings


class TokenService:
    """Service for handling LiveKit token generation."""
    
    @staticmethod
    async def generate_token(identity: str, name: str, room: str) -> str:
        """Generate a LiveKit access token.
        
        Args:
            identity: User identity
            name: User name
            room: Room name
            
        Returns:
            str: Generated JWT token
            
        Raises:
            HTTPException: If token generation fails
        """
        try:
            if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
                raise HTTPException(
                    status_code=500,
                    detail="LiveKit API credentials not configured"
                )
                
            token = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET) \
                .with_identity(identity) \
                .with_name(name) \
                .with_grants(api.VideoGrants(
                    room_join=True,
                    room=room,
                ))
                
            return token.to_jwt()
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate token: {str(e)}"
            ) 