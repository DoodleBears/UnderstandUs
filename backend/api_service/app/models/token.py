from pydantic import BaseModel


class TokenRequest(BaseModel):
    """Request model for token generation."""
    identity: str
    name: str
    room: str

class TokenResponse(BaseModel):
    """Response model for token generation."""
    token: str 