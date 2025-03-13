from fastapi import APIRouter

from ..models.token import TokenRequest, TokenResponse
from ..services.token_service import TokenService

router = APIRouter(prefix="/api/v1")

@router.get("/")
async def root():
    """Root endpoint."""
    return {"message": "UnderstandUs API Service"}

@router.post("/token", response_model=TokenResponse)
async def generate_token(request: TokenRequest) -> TokenResponse:
    """Generate a LiveKit access token.
    
    Args:
        request: TokenRequest containing identity, name, and room information
        
    Returns:
        TokenResponse: Contains the generated JWT token
    """
    token = await TokenService.generate_token(
        identity=request.identity,
        name=request.name,
        room=request.room
    )
    return TokenResponse(token=token) 