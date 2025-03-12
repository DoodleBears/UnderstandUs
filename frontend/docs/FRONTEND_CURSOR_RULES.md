# Frontend Development Rules

You are an expert in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI and Tailwind.

## Code Style and Structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.

## Naming Conventions

- Use lowercase with hyphens for multi-word directory names (e.g., `components/auth-wizard`).
- Use PascalCase for component file names (e.g., `UserProfileCard.tsx`).
- Favor named exports for components.

## TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.

## UI and Styling

- Use Shadcn UI, Radix, and Tailwind for components and styling.
- Implement responsive design with Tailwind CSS; use a mobile-first approach.

## Performance Optimization

- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC).
- Wrap client components in Suspense with fallback.
- Use dynamic loading for non-critical components.
- Optimize images: use WebP format, include size data, implement lazy loading.

## Key Conventions

- Follow Next.js docs for Data Fetching, Rendering, and Routing.

## Technical Stack

### Core Framework

- **Next.js 15+**
  - App Router for routing
  - Server Components
  - Client Components
  - API Routes

### UI Layer

- **React 19+**
  - Functional Components
  - Custom Hooks
  - Error Boundaries

### Styling

- **Shadcn UI**
  - Accessible components
  - Customizable themes
  - Consistent design system
- **Tailwind CSS**
  - Utility-first CSS
  - Custom theme configuration
  - Responsive design

### State Management

- **React Hooks**
  - useState for local state
  - useEffect for side effects
  - useMemo for performance
  - useCallback for memoization
- **Zustand**
  - Global state management
  - Persistent storage
  - Middleware support
  - TypeScript integration

### Real-time Communication

- **WebRTC**
  - Peer connections
  - Media streams
  - Data channels
  - ICE handling
- **Socket.IO Client**
  - Real-time events
  - Bi-directional communication
  - Automatic reconnection
  - Room management

### Development Tools

- **ESLint**
  - Code quality
  - Style enforcement
  - TypeScript rules
- **Prettier**
  - Code formatting
  - Consistent style
- **pnpm**
  - Package management
  - Fast installation
  - Disk space efficient

## File Addition/Deletion or Modification Guidelines

When adding, deleting or modifying files to the project, you MUST:

- Update @FRONTEND_FILE_FUNCTIONALITY.md
