# Backend File Functionality Documentation

## Directory Structure

```
backend/app/
├── api/                           # API endpoints and routes
│   ├── rooms.py                  # Room management endpoints
│   └── README.md                # API documentation
│
├── core/                         # Core application components
│   ├── config.py                # Application configuration
│   └── README.md                # Core module documentation
│
├── models/                       # Data models and schemas
│   ├── room.py                  # Room data model
│   └── README.md                # Models documentation
│
├── monitoring/                   # Application monitoring
│   └── metrics.py               # Metrics collection and monitoring
│
├── services/                     # Business logic services
│   ├── audio_processor.py       # Audio processing service
│   ├── event_broadcaster.py     # Event broadcasting service
│   ├── room_audio.py           # Room audio management
│   ├── room_service.py         # Room management service
│   ├── speech_to_text.py       # Speech-to-text service
│   └── README.md               # Services documentation
│
├── websocket/                    # WebSocket handling
│   ├── socketio_server.py      # Socket.IO server implementation
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
- Socket.IO server integration
- Server configuration and launch

### API Layer (`api/`)

#### Room Management (`rooms.py`, 1.4KB)

- Room creation endpoints
- Room joining/leaving logic
- Room status management
- Room listing functionality

### Core Components (`core/`)

#### Configuration (`config.py`, 1.2KB)

- Environment configuration
- Application settings
- Security parameters
- Feature flags

### Data Models (`models/`)

#### Room Model (`room.py`, 585B)

- Room data structure
- Room state management
- Participant tracking
- Room metadata

### Monitoring (`monitoring/`)

#### Metrics (`metrics.py`, 4.1KB)

- Performance monitoring
- Resource usage tracking
- Error rate monitoring
- System health metrics

### Services (`services/`)

#### Audio Processing (`audio_processor.py`, 4.8KB)

- Audio stream handling
- Audio format conversion
- Signal processing
- Quality enhancement

#### Event Broadcasting (`event_broadcaster.py`, 3.8KB)

- Real-time event distribution
- Message broadcasting
- Event queuing
- Delivery confirmation

#### Room Audio (`room_audio.py`, 3.0KB)

- Room audio stream management
- Audio mixing
- Participant audio handling
- Audio quality control

#### Room Service (`room_service.py`, 3.8KB)

- Room business logic
- Room state management
- Participant management
- Room lifecycle handling

#### Speech-to-Text (`speech_to_text.py`, 1.2KB)

- Audio transcription
- Language processing
- Text output formatting
- Transcription optimization

### WebSocket Layer (`websocket/`)

#### Socket.IO Server (`socketio_server.py`, 10.2KB)

- Socket.IO event handling
- WebRTC signaling protocol
- Room management
- Connection state management
- Heartbeat monitoring
- Peer connection handling

## Component Dependencies

### Service Stack

```
services/
├── room_service.py
│   └── models/room.py
├── audio_processor.py
│   └── services/speech_to_text.py
└── event_broadcaster.py
    └── websocket/socketio_server.py
```

### WebSocket Stack

```
websocket/socketio_server.py
└── services/room_service.py
```

### API Stack

```
api/
└── rooms.py
    └── services/room_service.py
```

## Communication Flow

1. Client connects via Socket.IO (`websocket/socketio_server.py`)
2. Room creation/joining handled by Room Service (`services/room_service.py`)
3. Audio processing pipeline:
   - Audio received through WebRTC
   - Processed by Audio Processor (`services/audio_processor.py`)
   - Transcribed by Speech-to-Text (`services/speech_to_text.py`)
   - Results broadcasted via Socket.IO events
4. WebRTC signaling handled by Socket.IO events
5. System metrics collected by Monitoring (`monitoring/metrics.py`)

## Key Features

- Real-time audio processing and transcription
- Socket.IO based real-time communication
- WebRTC peer connection management
- Room-based multi-user communication
- Event-driven architecture
- Performance monitoring and metrics
- Automatic connection cleanup
- Robust error handling and recovery

## Socket.IO Events

### Connection Events

- `connect`: Client connection initialization
- `disconnect`: Client disconnection handling
- `connection_established`: Connection confirmation

### Room Events

- `join_room`: User joining a room
- `leave_room`: User leaving a room
- `user_joined`: Broadcast when a user joins
- `user_left`: Broadcast when a user leaves
- `room_info`: Room state and participants

### WebRTC Events

- `offer`: SDP offer for peer connection
- `answer`: SDP answer for peer connection
- `ice_candidate`: ICE candidate exchange

### System Events

- `heartbeat`: Connection health check
- `heartbeat_ack`: Health check acknowledgment
- `error`: Error message broadcasting
