# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A monorepo demonstrating React data fetching patterns with optimistic UI, featuring:
- Two implementations of chat detail pages: one using React 19's native `useOptimistic`, another using TanStack Query's optimistic updates
- Real-time chat with WebSocket support via Socket.IO
- Failed message persistence in sessionStorage
- NestJS backend with REST API and WebSocket gateway

## Commands

### Development
```bash
npm run dev:all          # Run both frontend and backend concurrently
npm run dev              # Run only web-client (frontend) on http://localhost:5173
npm run dev:server       # Run only server (backend) on http://localhost:3000
```

### Building & Linting
```bash
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
```

### Workspace-Specific Commands
```bash
# Web client
npm run build --workspace=web-client
npm run lint --workspace=web-client
npm run preview --workspace=web-client

# Server
npm run build --workspace=server
npm run start --workspace=server        # Production mode
```

## Architecture

### Monorepo Structure
- **web-client/** - React 19 + TypeScript + Vite frontend
- **server/** - NestJS backend with REST API and WebSocket gateway
- **shared/** - Shared TypeScript types used by both client and server

### Key Architectural Patterns

#### Context-Based Architecture (web-client)
The app uses a hierarchical context structure:
1. `AuthProvider` - Top-level, manages user authentication and session storage
2. `UserProvider` - Created when user logs in, provides user data
3. `ChatApiProvider` - Nested under UserProvider, creates user-specific API client
4. `SocketProvider` - Created after login, manages WebSocket connection

Access patterns:
- `useAuth()` - Login/logout and user state
- `useAuthUser()` - Current user (only available when authenticated)
- `useChatApi()` - API client with user ID pre-configured
- `useSocket()` - WebSocket operations and event subscriptions

#### Two Optimistic UI Implementations
**Route: `/chat/:chatId`** (ChatDetailPage.tsx)
- Uses React 19's native `useOptimistic` hook
- Manual state management with `use()` and Suspense
- Failed messages stored in sessionStorage via `useFailedMessages` hook

**Route: `/chat-tanstack/:chatId`** (ChatDetailPageWithTanstack.tsx)
- Uses TanStack Query's `useMutation` with optimistic updates
- Automatic cache management and refetching
- Also uses `useFailedMessages` for persistence

#### Real-time Communication (server)
- **ChatController** - REST endpoints for chat operations (`/api/chats/*`)
- **ChatGateway** - WebSocket gateway for real-time events
  - `authenticate` - Associates socket with userId
  - `join_chat` / `leave_chat` - Room management
  - `typing` - Typing indicators
  - `new_message` - Broadcast new messages to chat room
  - `user_typing` - Broadcast typing status

ChatGateway is injected into ChatService via `setChatGateway()` to enable broadcasting from REST endpoints.

#### Type Safety
The `shared` workspace exports TypeScript types used by both client and server:
- `User`, `Message`, `Chat` - Core domain types
- `TypingIndicator`, `NewMessageEvent` - WebSocket event types

Client-side types in `web-client/src/types/types.ts`:
- `ClientMessage` - Extends Message with `isCurrentUser` and `status` for UI state

#### Failed Message Handling
`useFailedMessages` hook provides:
- Persistent storage in sessionStorage (keyed by userId and chatId)
- Automatic cleanup on logout
- Add/remove/clear operations for failed messages

Both chat implementations use this to persist optimistic messages that fail to send.

## Environment Configuration

### Server (.env)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGINS` - Comma-separated allowed origins
- `CORS_CREDENTIALS` - Enable credentials (default: true)

### Web Client (.env.local)
- `VITE_API_URL` - Backend URL (default: http://localhost:3000)

Copy `.env.example` files to create `.env` / `.env.local` before running.

## Important Notes

- User authentication is mock-based via x-user-id header and socket authentication event (not production-ready)
- WebSocket connections authenticate via `authenticate` event after connection
- The app requires both client and server running for full functionality
- React Compiler is enabled via babel-plugin-react-compiler
