# Backend Development Rules

You are an expert in Python, FastAPI, LiveKit (WebRTC), Socket.IO, and asynchronous programming.

## Code Style and Structure

- Write concise, Pythonic code with accurate type hints and docstrings
- Use functional and declarative programming patterns where appropriate
- Follow SOLID principles and dependency injection patterns
- Use descriptive variable names with auxiliary verbs (e.g., is_loading, has_error)
- Structure files: exported functions/classes, helpers, static content, type definitions

## Naming Conventions

- Use lowercase with underscores for module names (e.g., `audio_processor.py`)
- Use PascalCase for class names (e.g., `RoomManager`)
- Use lowercase with underscores for function and variable names
- Use ALL_CAPS for constants
- Prefix private methods and variables with underscore

## Type Hints and Documentation

- Use type hints for all function parameters and return values
- Use Pydantic for data validation and settings management
- Document all public APIs with docstrings (Google style)
- Include examples in docstrings for complex functions

## FastAPI Best Practices

- Use dependency injection for service injection
- Implement proper error handling and status codes
- Use appropriate HTTP methods and status codes
- Implement proper request validation
- Use background tasks for long-running operations

## Performance Optimization

- Use async/await for I/O-bound operations
- Implement proper connection pooling
- Use caching where appropriate
- Optimize database queries
- Implement proper resource cleanup

## Key Conventions

- Follow FastAPI docs for Dependency Injection, WebSocket, and Background Tasks
- Implement proper logging and monitoring
- Use environment variables for configuration
- Implement proper security measures

## Technical Stack

### Core Framework

- **FastAPI**
  - Dependency Injection
  - WebSocket Support
  - Background Tasks
  - API Documentation
  - Request Validation

### Real-time Communication

- **python-socketio**

  - Event handling
  - Room management
  - Session management
  - Error handling

### Data Validation

- **Pydantic**
  - Data validation
  - Settings management
  - Schema definition
  - Type safety

### Audio Processing

- **Speech Recognition**
  - Audio transcription
  - Language detection
  - Text formatting
  - Error handling

### Development Tools

- **pytest**

  - Unit testing
  - Integration testing
  - Async testing
  - Fixtures

## Code Organization Guidelines

### API Endpoint Structure

```python
from fastapi import APIRouter, Depends, HTTPException
from typing import List

router = APIRouter()

@router.post("/rooms/", response_model=RoomResponse)
async def create_room(
    request: RoomCreate,
    service: RoomService = Depends(get_room_service)
) -> RoomResponse:
    """Create a new room.

    Args:
        request: Room creation parameters
        service: Room service instance

    Returns:
        RoomResponse: Created room details

    Raises:
        HTTPException: If room creation fails
    """
    result = await service.create_room(request)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    return result.data
```

## Error Handling

- Use custom exception classes
- Implement proper error logging
- Return appropriate error responses
- Handle WebSocket disconnections gracefully

## Security Guidelines

- Validate all input data

## Testing Requirements

- Write unit tests for all services
- Implement integration tests
- Test WebSocket functionality
- Test error handling
- Use proper test fixtures

## Monitoring and Logging

- Implement structured logging
- Use proper metrics collection
- Monitor system health
- Track performance metrics
- Log security events

## File Addition/Deletion or Modification Guidelines

When adding, deleting or modifying files to the project, you MUST:

- Update @BACKEND_FILE_FUNCTIONALITY.md
- Add appropriate tests
- Update API documentation
- Follow the established directory structure
