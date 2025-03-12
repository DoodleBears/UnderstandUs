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
│   │   ├── utils.ts              # Shared utilities
│   │   └── websocket.ts          # WebSocket management
│   │
│   └── hooks/
│       └── useWebSocket.ts       # WebSocket hook
│
├── public/                       # Static assets
├── docs/                         # Documentation
├── node_modules/                 # Dependencies
└── package.json                  # Project configuration
```

This document provides a detailed overview of each file's functionality in the UnderstandUs frontend project.

## App Directory (`src/app/`)

### Core Files

- `layout.tsx` - Root layout component that wraps all pages, provides global styling and context providers
- `page.tsx` - Home page component, contains the main landing page UI and navigation
- `globals.css` - Global CSS styles and Tailwind CSS configurations
- `favicon.ico` - Application favicon

### Room Feature

- `room/` - Directory containing room-related page components and logic

## Components Directory (`src/components/`)

### Room Components (`components/room/`)

- `RoomList.tsx` - Displays a list of available rooms with join/create functionality
- `RoomForm.tsx` - Form component for creating new rooms or joining existing ones

### Audio Components (`components/audio/`)

Audio-related UI components for managing sound input/output:

- `AudioProvider.tsx` (4.2KB)

  - Context provider for audio functionality
  - Manages global audio state
  - Handles audio device initialization
  - Provides audio context to child components

- `AudioControl.tsx` (3.6KB)

  - UI controls for audio management
  - Volume control interface
  - Mute/unmute functionality
  - Device selection controls

- `AudioStatus.tsx` (2.4KB)

  - Displays current audio status
  - Shows connection state
  - Indicates recording status
  - Visualizes audio levels

- `AudioRecorder.tsx` (3.2KB)

  - Handles audio recording functionality
  - Start/stop recording controls
  - Recording status indication
  - Audio file management

- `useAudio.ts` (2.4KB)
  - Custom hook for audio management
  - Provides audio control methods
  - Manages audio state
  - Handles device changes

### WebRTC Components (`components/webrtc/`)

WebRTC-related components for real-time communication:

- `WebRTCProvider.tsx` (5.3KB)
  - Main WebRTC context provider
  - Manages peer connections
  - Handles connection state
  - Provides WebRTC context to application
  - Coordinates with signaling server
  - Manages media streams
  - Handles connection lifecycle
  - Error handling and recovery

### UI Components (`components/ui/`)

Reusable UI components and design system elements

### Transcript Components (`components/transcript/`)

- `TranscriptDisplay.tsx` - Component for displaying and managing real-time transcriptions

## Lib Directory (`src/lib/`)

### WebRTC Module (`lib/webrtc/`)

- `connection.ts` - Manages WebRTC peer connections and data channels
- `signaling.ts` - Handles WebRTC signaling process and connection establishment
- `types.ts` - TypeScript type definitions for WebRTC-related functionality

### Audio Module (`lib/audio/`)

- `capture.ts` - Handles audio capture and processing functionality
- `devices.ts` - Manages audio device selection and configuration
- `permissions.ts` - Handles audio permission requests and status
- `types.ts` - TypeScript type definitions for audio-related features

### Utility Files

- `utils.ts` - General utility functions used across the application
- `websocket.ts` - WebSocket connection management and event handling

## Hooks Directory (`src/hooks/`)

### WebSocket Hook

- `useWebSocket.ts` - Custom hook for managing WebSocket connections and real-time communication

## File Responsibilities

### WebRTC Layer

- **Connection Management**: `lib/webrtc/connection.ts`

  - Establishes and maintains peer connections
  - Handles data channel creation
  - Manages connection state
  - Provides peer management through `getPeers` method
  - Handles message sending through data channels

- **Signaling**: `lib/webrtc/signaling.ts`
  - Implements Socket.IO-based signaling protocol
  - Handles connection lifecycle (connect, disconnect)
  - Manages room joining and leaving
  - Processes standard WebRTC events (offer, answer, ICE candidates)
  - Handles room events (user joined, left, updates)
  - Provides automatic reconnection support
  - Implements error handling and state management

### Audio Layer

- **Capture**: `lib/audio/capture.ts`

  - Manages audio stream acquisition
  - Handles audio processing
  - Controls audio track lifecycle

- **Device Management**: `lib/audio/devices.ts`

  - Enumerates available audio devices
  - Handles device selection
  - Manages device changes

- **Permissions**: `lib/audio/permissions.ts`
  - Handles microphone permissions
  - Manages permission states
  - Provides permission request UI

### Room Management

- **Room List**: `components/room/RoomList.tsx`

  - Displays available rooms
  - Handles room selection
  - Manages room status updates

- **Room Creation**: `components/room/RoomForm.tsx`
  - Provides room creation interface
  - Validates room parameters
  - Handles room joining logic

### Real-time Communication

- **WebSocket Hook**: `hooks/useWebSocket.ts`
  - Manages WebSocket lifecycle
  - Handles real-time events
  - Provides connection state management

### Transcription

- **Transcript Display**: `components/transcript/TranscriptDisplay.tsx`
  - Renders real-time transcriptions
  - Manages transcript history
  - Handles transcript formatting

## File Dependencies

### WebRTC Stack

```
lib/webrtc/connection.ts
  ├─ lib/webrtc/types.ts
  └─ lib/webrtc/signaling.ts
```

### Audio Stack

```
lib/audio/capture.ts
  ├─ lib/audio/types.ts
  ├─ lib/audio/devices.ts
  └─ lib/audio/permissions.ts
```

### Room Features

```
components/room/RoomList.tsx
  └─ components/room/RoomForm.tsx
```

### Component Dependencies

```
components/audio/
├── AudioProvider.tsx
│   ├── useAudio.ts
│   └── AudioStatus.tsx
├── AudioControl.tsx
│   └── useAudio.ts
└── AudioRecorder.tsx
    └── AudioStatus.tsx

components/webrtc/
└── WebRTCProvider.tsx
    ├── lib/webrtc/connection.ts
    ├── lib/webrtc/signaling.ts
    └── hooks/useWebSocket.ts
```
