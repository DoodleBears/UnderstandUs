# Backend File Functionality Documentation

## Directory Structure

```
backend/api_service/app/
├── core/                  # Core application components
│   ├── __init__.py
│   └── config.py         # Application configuration and settings
├── models/               # Data models and schemas
│   ├── __init__.py
│   └── token.py         # Token-related Pydantic models
├── routers/             # API route handlers
│   ├── __init__.py
│   └── token.py         # Token-related endpoints
├── services/            # Business logic layer
│   ├── __init__.py
│   └── token_service.py # Token generation service
└── main.py              # Application entry point
```

## File Descriptions

### Core Components

#### `core/config.py`

- Manages application configuration using Pydantic
- Handles environment variables and settings
- Provides type-safe configuration access
- Settings include:
  - `LIVEKIT_API_KEY`: LiveKit API key
  - `LIVEKIT_API_SECRET`: LiveKit API secret
  - `CORS_ORIGINS`: List of allowed CORS origins

### Models

#### `models/token.py`

- Defines Pydantic models for token-related data
- Contains:
  - `TokenRequest`: Request model for token generation
    - `identity`: User identity
    - `name`: User name
    - `room`: Room name
  - `TokenResponse`: Response model for token generation
    - `token`: Generated JWT token

### Services

#### `services/token_service.py`

- Implements business logic for token generation
- `TokenService` class:
  - `generate_token()`: Generates LiveKit access tokens
  - Handles error cases and validation
  - Uses LiveKit SDK for token generation

### Routers

#### `routers/token.py`

- Defines API endpoints for token operations
- Routes:
  - `GET /api/v1/`: Root endpoint
  - `POST /api/v1/token`: Token generation endpoint
- Uses dependency injection for services
- Implements proper request/response validation

### Main Application

#### `main.py`

- Application entry point
- Sets up FastAPI and Socket.IO
- Configures middleware and CORS
- Mounts routers
- Handles Socket.IO events:
  - `connect`: Client connection handler
  - `disconnect`: Client disconnection handler

## API Endpoints

### Token Generation

- **Endpoint**: `POST /api/v1/token`
- **Request Body**:
  ```json
  {
    "identity": "string",
    "name": "string",
    "room": "string"
  }
  ```
- **Response**:
  ```json
  {
    "token": "string"
  }
  ```
- **Description**: Generates a LiveKit access token for room access

### Root Endpoint

- **Endpoint**: `GET /api/v1/`
- **Response**:
  ```json
  {
    "message": "UnderstandUs API Service"
  }
  ```
- **Description**: Service health check endpoint

## Socket.IO Events

### Connection Events

- **connect**: Triggered when a client connects
- **disconnect**: Triggered when a client disconnects

## Environment Variables

Required environment variables in `.env`:

```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
CORS_ORIGINS=["*"]
```
