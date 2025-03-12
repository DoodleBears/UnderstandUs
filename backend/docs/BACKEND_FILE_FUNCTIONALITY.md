# Backend File Functionality Documentation

## Directory Structure

```
backend/app/
├── api/                           # API endpoints and routes
│   ├── rooms.py                  # Room management and LiveKit token endpoints
│   └── README.md                # API documentation
│
├── core/                         # Core application components
│   ├── config.py                # Application configuration (LiveKit, WebSocket)
│   └── README.md                # Core module documentation
│
├── models/                       # Data models and schemas
│   ├── room.py                  # Room and participant data models
│   └── README.md                # Models documentation
│
├── services/                     # Business logic services
│   ├── livekit_service.py       # LiveKit integration service
│   ├── room_service.py          # Room management service
│   ├── speech_to_text.py        # Speech-to-text service
│   └── README.md                # Services documentation
│
├── websocket/                    # WebSocket handling
│   ├── ws_server.py            # WebSocket server for transcripts and updates
│   └── README.md               # WebSocket documentation
│
├── main.py                      # Application entry point
└── __init__.py                 # Package initialization

```

## Component Responsibilities

### Main Application (`main.py`)

- Application initialization and configuration
- CORS middleware setup
- Route registration
- WebSocket server integration
- Server configuration and launch

### API Layer (`api/`)

#### Room Management (`rooms.py`)

- Room creation with LiveKit integration
- Room joining with token generation
- Room status management
- Room listing functionality
- LiveKit token generation for participants

### Core Components (`core/`)

#### Configuration (`config.py`)

- Environment configuration
- LiveKit settings (host, API key, secret)
- WebSocket settings
- Security parameters
- Feature flags

### Data Models (`models/`)

#### Room Model (`room.py`)

- Room data structure
- Room state management
- Participant tracking
- Transcript storage
- Room metadata

### Services (`services/`)

#### LiveKit Service (`livekit_service.py`)

- LiveKit token generation
- Room creation in LiveKit
- Room deletion in LiveKit
- Room state management with LiveKit
- WebRTC configuration

#### Room Service (`room_service.py`)

- Local room state management
- Participant management
- Transcript management
- Integration with LiveKit service
- Room lifecycle handling

#### Speech-to-Text (`speech_to_text.py`)

- Audio transcription
- Language processing
- Text output formatting
- Transcription optimization

### WebSocket Layer (`websocket/`)

#### WebSocket Server (`ws_server.py`)

- Real-time room updates
- Transcript broadcasting
- Connection state management
- Room event handling

## Component Dependencies

### Service Stack

```
services/
├── livekit_service.py
│   └── core/config.py
├── room_service.py
│   ├── models/room.py
│   └── services/livekit_service.py
└── speech_to_text.py
```

### WebSocket Stack

```
websocket/ws_server.py
└── services/room_service.py
```

### API Stack

```
api/rooms.py
├── services/room_service.py
└── services/livekit_service.py
```

## Communication Flow

1. Client requests to create/join room via REST API
2. Server generates LiveKit token and creates/joins room
3. Client connects to LiveKit server for WebRTC
4. Client connects to WebSocket server for room updates
5. Audio processing pipeline:
   - Audio handled by LiveKit WebRTC
   - Speech-to-text processing on client side
   - Transcripts sent to WebSocket server
   - Server broadcasts transcripts to room participants

## Key Features

- LiveKit integration for WebRTC
- Token-based authentication
- Real-time audio communication
- Room-based multi-user communication
- Real-time transcript broadcasting
- Event-driven architecture
- Automatic room cleanup
- Robust error handling

## WebSocket Events

### Connection Events

- `connect`: Client connection initialization
- `disconnect`: Client disconnection handling
- `connection_established`: Connection confirmation

### Room Events

- `join_room`: User joining a room
- `leave_room`: User leaving a room
- `room_info`: Room state and participants update

### Transcript Events

- `transcript_update`: New transcript from user
- `transcript_received`: Broadcast transcript to room

### System Events

- `error`: Error message broadcasting

## Security Features

- LiveKit token-based authentication
- Room access control
- Participant validation
- Environment-based configuration
- CORS protection

## Error Handling

- Custom exception handling
- Proper error responses
- Connection error recovery
- Room state consistency
- Token validation

## Configuration

Key environment variables:

```env
# LiveKit Configuration
LIVEKIT_HOST=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here

# WebSocket Configuration
WS_MESSAGE_QUEUE=redis://localhost:6379/0
```

## API Endpoints

### Room Management

- `POST /api/rooms` - Create new room
- `POST /api/rooms/{room_id}/join` - Join existing room
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/{room_id}` - Get room details
- `DELETE /api/rooms/{room_id}` - Delete room

## WebSocket Path

- `/ws` - WebSocket connection for room updates and transcripts
