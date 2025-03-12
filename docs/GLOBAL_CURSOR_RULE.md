# Global Project Structure and Rules

## Project Overview

UnderstandUs is a real-time audio communication platform that enables multi-user voice conversations with live transcription. The application provides seamless audio communication through WebRTC and manages real-time updates via WebSocket connections.

### Core Features

- Multi-user audio rooms
- Real-time voice communication
- Live speech-to-text transcription
- Shareable room links
- Real-time participant management

### Technical Stack

- **Frontend**: React + Next.js

  - WebRTC for peer-to-peer audio
  - Socket.IO client for real-time updates
  - React Hooks and Zustand for state management
  - TypeScript for type safety
  - Shadcn UI and Tailwind CSS for styling

- **Backend**: Python + FastAPI + python-socketio
  - WebSocket server for signaling
  - Room management system
  - Speech-to-text processing
  - User session handling
  - RESTful API endpoints

### Communication Flow

1. Users join rooms via shared links
2. WebSocket connection established for signaling
3. WebRTC peer connections created for audio
4. Real-time audio streaming between participants
5. Server processes audio for transcription
6. Live transcripts broadcasted to room participants

## Project Structure

```
UnderstandUs/
├── frontend/                 # Next.js Frontend Application
│   ├── src/                 # Source code
│   ├── public/             # Static assets
│   ├── docs/               # Frontend documentation
│   └── Dockerfile          # Frontend container configuration
│
├── backend/                 # FastAPI Backend Application
│   ├── src/                # Source code
│   ├── tests/              # Backend tests
│   ├── docs/               # Backend documentation
│   └── Dockerfile          # Backend container configuration
│
├── docker-compose.yml       # Container orchestration
├── .env                     # Environment variables
└── README.md               # Project documentation
```
