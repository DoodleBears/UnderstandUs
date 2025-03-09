from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class Participant(BaseModel):
    user_id: str
    name: str
    joined_at: datetime = Field(default_factory=datetime.now)
    is_host: bool = False

class Room(BaseModel):
    id: str
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    participants: Dict[str, Participant] = Field(default_factory=dict)
    transcripts: List[Dict] = Field(default_factory=list)
    is_active: bool = True

    class Config:
        arbitrary_types_allowed = True 