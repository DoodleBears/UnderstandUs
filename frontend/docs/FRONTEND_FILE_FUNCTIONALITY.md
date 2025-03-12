# File Functionality Documentation

## Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── room/[roomId]                  # Room-related pages
│   │   │   └── page.tsx              # Room page
│   │   ├── page.tsx              # Main landing page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   └── favicon.ico           # App favicon
│   │
│   ├── components/
│   │   ├── audio/                # Audio UI components
│   │   │   ├── AudioControl.tsx  # Audio controls UI
│   │   │   ├── AudioStatus.tsx   # Audio status display
│   │   │   ├── AudioProvider.tsx # Audio context provider
│   │   │   ├── AudioRecorder.tsx # Audio recording component
│   │   │   └── useAudio.ts       # Audio management hook
│   │   ├── webrtc/               # WebRTC UI components
│   │   │   └── WebRTCProvider.tsx # WebRTC context provider
│   │   ├── ui/                   # Shadcn UI components
│   │   ├── room/
│   │   │   ├── RoomList.tsx     # Room listing component
│   │   │   └── RoomForm.tsx     # Room creation/join form
│   │   └── transcript/
│   │       └── TranscriptDisplay.tsx  # Transcription UI
│   │
│   ├── lib/
│   │   ├── webrtc/
│   │   │   ├── connection.ts     # WebRTC connection logic
│   │   │   ├── signaling.ts      # Signaling implementation
│   │   │   └── types.ts          # WebRTC type definitions
│   │   ├── audio/
│   │   │   ├── capture.ts        # Audio capture logic
│   │   │   ├── devices.ts        # Device management
│   │   │   ├── permissions.ts    # Permission handling
│   │   │   └── types.ts          # Audio type definitions
│   │   └── utils.ts              # Shared utilities
│   │
│   └── store/
│       └── useRTCStore.ts        # Zustand store for WebRTC state
│
├── public/                       # Static assets
├── docs/                         # Documentation
├── node_modules/                 # Dependencies
└── package.json                  # Project configuration
```

## State Management (`src/store/`)

### RTC Store (`useRTCStore.ts`)

Centralized state management for WebRTC and real-time communication:

- **State Management**

  - Socket.IO connection state
  - WebRTC peer connections
  - Room participants
  - Transcripts
  - Local media stream
  - Connection status

- **Actions**

  - Socket.IO Actions

    - `connect`: Establishes connection to room
    - `disconnect`: Closes all connections
    - `sendMessage`: Sends messages through Socket.IO

  - WebRTC Actions

    - `setLocalStream`: Sets local audio stream
    - `createPeerConnection`: Creates new peer connection
    - `handleSignalingMessage`: Processes signaling messages

  - Room Actions
    - `updateParticipants`: Updates room participant list
    - `addTranscript`: Adds new transcript entry

- **Connection Flow**

  - New User Joining:

    1. Connects to Socket.IO server
    2. Receives existing users list
    3. Waits for connection offers from existing users

  - Existing Users:
    1. Receives notification of new user
    2. Initiates WebRTC connection
    3. Sends offer to new user

## Components Directory (`src/components/`)

### Audio Components (`components/audio/`)

Audio-related UI components for managing sound input/output:

- `AudioControl.tsx` (3.6KB)

  - Microphone controls (enable/disable)
  - Mute/unmute functionality
  - Device selection
  - Volume control
  - Audio level visualization

- `AudioStatus.tsx` (2.4KB)

  - Connection state display
  - Audio status indicators
  - Error handling UI

- `AudioProvider.tsx` (4.2KB)

  - Audio context provider
  - Device initialization
  - Permission management
  - Stream handling

- `useAudio.ts` (2.4KB)
  - Audio device management
  - Stream control
  - Permission handling
  - Volume control

## Lib Directory (`src/lib/`)

### WebRTC Module (`lib/webrtc/`)

- `connection.ts`

  - WebRTC peer connection management
  - Media stream handling
  - ICE candidate processing
  - Connection state management

- `signaling.ts`

  - Socket.IO signaling implementation
  - Room event handling
  - Connection establishment
  - Message routing

- `types.ts`
  - WebRTC interfaces
  - Signaling types
  - Connection state types
  - Message types

### Audio Module (`lib/audio/`)

- `capture.ts`

  - Audio stream acquisition
  - Track management
  - Audio processing

- `devices.ts`

  - Device enumeration
  - Device selection
  - Change detection

- `permissions.ts`
  - Permission requests
  - Permission state
  - Error handling

## Communication Flow

### WebRTC Connection Establishment

1. **Room Join**

   ```
   User -> Socket.IO Server
   - join_room event
   - User info (ID, name)
   ```

2. **Existing Users Notification**

   ```
   Socket.IO Server -> New User
   - existing_users event
   - List of current users
   ```

3. **New User Broadcast**

   ```
   Socket.IO Server -> Existing Users
   - user_joined event
   - New user info
   ```

4. **Connection Establishment**
   ```
   Existing User -> New User
   - Create peer connection
   - Send offer
   - Exchange ICE candidates
   ```

### Audio Stream Management

1. **Device Initialization**

   ```
   AudioProvider
   ├── Permission request
   ├── Device enumeration
   └── Stream creation
   ```

2. **Stream Distribution**
   ```
   AudioProvider -> WebRTC
   ├── Local stream setup
   └── Track distribution
   ```

## File Dependencies

### State Management

```
store/useRTCStore.ts
  ├─ lib/webrtc/connection.ts
  ├─ lib/webrtc/types.ts
  └─ socket.io-client
```

### Audio Stack

```
components/audio/AudioProvider.tsx
  ├─ lib/audio/capture.ts
  ├─ lib/audio/devices.ts
  └─ lib/audio/permissions.ts
```

### Room Features

```
app/room/[roomId]/page.tsx
  ├─ store/useRTCStore.ts
  ├─ components/audio/AudioControl.tsx
  └─ components/audio/AudioStatus.tsx
```
