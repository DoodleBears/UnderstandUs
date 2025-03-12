from datetime import datetime, timedelta
from typing import Optional

import jwt

from app.core.config import settings


class LiveKitService:
    def __init__(self):
        self.host = settings.LIVEKIT_URL
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET

    def create_token(
        self,
        room_name: str,
        user_id: str,
        user_name: str,
        ttl: Optional[timedelta] = None
    ) -> str:
        """Create a LiveKit access token for a user to join a room."""
        if ttl is None:
            ttl = timedelta(hours=24)
            
        # Create token with claims
        claims = {
            "iss": self.api_key,  # issuer
            "sub": user_id,       # subject (participant identity)
            "exp": int((datetime.now() + ttl).timestamp()),  # expiration
            "nbf": int(datetime.now().timestamp()),  # not before
            "video": {
                "room": room_name,
                "roomJoin": True,
                "canPublish": True,
                "canSubscribe": True,
                "canPublishData": True
            },
            "metadata": user_name
        }
        
        # Sign the token with the API secret
        token = jwt.encode(claims, self.api_secret, algorithm="HS256")
        return token

    async def create_room(self, room_name: str) -> bool:
        """Create a LiveKit room."""
        try:
            # For now, we'll just return True as the room will be created
            # automatically when the first participant joins
            return True
        except Exception as e:
            print(f"Error creating LiveKit room: {e}")
            return False

    async def delete_room(self, room_name: str) -> bool:
        """Delete a LiveKit room."""
        try:
            # Room cleanup is handled automatically by LiveKit
            return True
        except Exception as e:
            print(f"Error deleting LiveKit room: {e}")
            return False

    async def list_rooms(self):
        """List all LiveKit rooms."""
        # This would require the LiveKit server API
        # For now, we'll rely on our local room tracking
        return []

    async def get_room(self, room_name: str):
        """Get LiveKit room details."""
        # This would require the LiveKit server API
        # For now, we'll rely on our local room tracking
        return None


livekit_service = LiveKitService() 