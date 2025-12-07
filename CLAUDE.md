# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run from root)
npm install

# Development
npm run dev          # Run web-client only (Vite on port 5173)
npm run dev:server   # Run server only (NestJS on port 3000)
npm run dev:all      # Run both simultaneously

# Build all workspaces
npm run build

# Lint all workspaces
npm run lint
```

## Architecture

This is a monorepo chat application with three workspaces:

### shared/
Shared TypeScript types (`User`, `Message`, `Chat`, `TypingIndicator`, `NewMessageEvent`) used by both client and server. Imported as `shared` package.

### web-client/
React 19 frontend using Vite, Tailwind CSS, and Radix UI components.

**Key patterns:**
- Uses React 19's `use()` hook with Suspense for data fetching (see `App.tsx:112` for promise consumption)
- Uses `useOptimistic` for optimistic UI updates on chats and messages
- React Compiler enabled via `babel-plugin-react-compiler`
- Path alias `@/` maps to `./src/`
- API client (`api/client.ts`) creates user-scoped API instances with `x-user-id` header
- Auth state stored in sessionStorage; context in `contexts/AuthContext.tsx`
- Failed messages persisted to sessionStorage via `useFailedMessages` hook

### server/
NestJS backend with REST API and Socket.IO WebSocket support.

**Key patterns:**
- Chat module handles all chat/message operations (`chat.controller.ts`, `chat.service.ts`)
- WebSocket gateway (`chat.gateway.ts`) handles real-time typing indicators and message broadcasts
- Mock in-memory data store in `ChatService` (no database)
- User identified by `x-user-id` header for REST, `authenticate` event for WebSocket
- CORS configured via `CORS_ORIGINS` and `CORS_CREDENTIALS` env vars

## Environment Variables

Web client requires `VITE_API_URL` (e.g., `http://localhost:3000`).
