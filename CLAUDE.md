# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A real-time chat application demonstrating React data fetching patterns with TanStack Query. This is an npm workspaces monorepo with four packages:

- **web-client**: React 19 frontend with Vite, TanStack Query, and Tailwind CSS 4
- **server**: NestJS backend with REST API and Socket.IO WebSocket support
- **shared**: TypeScript types shared between client and server (Chat, Message, User, WebSocket events)
- **e2e**: Playwright end-to-end tests

## Commands

```bash
# Development
npm run dev              # Start web client (Vite)
npm run dev:server       # Start NestJS server
npm run dev:all          # Start both client and server

# Build & Lint
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces

# E2E Tests (auto-spawns client/server per worker)
npm run test:e2e         # Run Playwright tests
npm run test:e2e:ui      # Run with Playwright UI
npm run test:e2e:headed  # Run in headed browser
```

## Architecture

### Client Data Flow
- **API Client** (`web-client/src/api/client.ts`): Factory function `createChatApi(userId)` creates a typed API client. User ID is passed via `x-user-id` header.
- **TanStack Query**: Uses `useSuspenseQuery` for data fetching with query keys like `['chats']` and `['messages', chatId]`.
- **Optimistic Updates**: Mutations use `onMutate` for optimistic updates, `onError` for rollbacks. See `useSendMessage` and `useMarkChatAsRead` in `App.tsx`.
- **Failed Messages**: Stored in localStorage per user/chat, merged with query data in `useMessages`.

### Server Structure
- **ChatController** (`server/src/chat/chat.controller.ts`): REST endpoints under `/api/chats/*`
- **ChatGateway** (`server/src/chat/chat.gateway.ts`): Socket.IO gateway for real-time features (typing indicators, message broadcast)
- **ChatService** (`server/src/chat/chat.service.ts`): In-memory data store with mock users/chats/messages

### Authentication
Mock authentication using user selection. Current user is stored in React context (`AuthContext`) and passed to API via header.

### E2E Test Structure
- **Fixtures** (`e2e/fixtures/test-fixtures.ts`): Extends Playwright's test with worker-scoped server/client processes and page objects
- **Page Objects** (`e2e/page-objects/`): `UserSelectionPage`, `ChatDashboardPage`, `ChatMessagesPage`
- Tests spawn isolated server/client instances per worker on dynamic ports

## Key Patterns

### Query Invalidation
After mutations, invalidate queries with `queryClient.invalidateQueries({ queryKey: ['chats'] })`.

### Optimistic Chat Updates
The `useOptimisticChatUpdate` hook provides a pattern for optimistically updating the chat list and rolling back on error.

### WebSocket Events
Events defined in `shared/src/types.ts`: `TypingIndicator`, `NewMessageEvent`. Server broadcasts to rooms joined via `join_chat`.
