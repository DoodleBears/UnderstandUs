# Naming Conventions

## Directory Naming

### Page-based Directories

- Use lowercase with hyphens for multi-word names
- Name should reflect the page's purpose
- Examples:
  - `user-profile/`
  - `meeting-room/`
  - `dashboard/`

### Feature-based Directories

- Use descriptive names that indicate functionality
- Group related components together
- Examples:
  - `auth/` - Authentication related components
  - `chat/` - Chat functionality components
  - `video-call/` - Video calling features

## File Naming

### Component Files

- Use PascalCase
- Be descriptive and specific
- Include the component's main functionality
- Examples:
  - `UserProfileCard.tsx`
  - `MeetingRoomLayout.tsx`
  - `VideoCallControls.tsx`

### Hook Files

- Start with `use` prefix
- Use camelCase
- Describe the hook's purpose
- Examples:
  - `useVideoStream.ts`
  - `useMeetingRoom.ts`
  - `useAuthState.ts`

### Utility Files

- Use camelCase
- End with descriptive suffix when applicable
- Examples:
  - `apiClient.ts`
  - `dateUtils.ts`
  - `stringHelpers.ts`

### Type Definition Files

- End with `.types.ts`
- Use descriptive names
- Examples:
  - `user.types.ts`
  - `meeting.types.ts`
  - `api.types.ts`
