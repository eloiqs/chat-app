# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo demonstrating React data fetching patterns with a NestJS backend. The project consists of three npm workspaces:
- `web-client`: React + TypeScript + Vite frontend
- `server`: NestJS backend API
- `shared`: Shared TypeScript types used by both client and server

## Development Commands

### Running the Application
```bash
# Install all dependencies (run once after cloning)
npm install

# Run both client and server together (recommended for development)
npm run dev:all

# Run only the web client (http://localhost:5173)
npm run dev

# Run only the server (http://localhost:3000)
npm run dev:server
```

### Building
```bash
# Build all workspaces
npm run build

# Build individual workspace
npm run build --workspace=web-client
npm run build --workspace=server
npm run build --workspace=shared
```

### Linting
```bash
# Lint all workspaces
npm run lint

# Lint individual workspace
npm run lint --workspace=web-client
npm run lint --workspace=server
```

### Working with Workspaces
```bash
# Run any script in a specific workspace
npm run <script-name> --workspace=<workspace-name>

# Install package in specific workspace
npm install <package-name> --workspace=<workspace-name>
```

## Architecture

### Data Flow
1. **Shared Types** (`shared/src/types.ts`): Defines `Chat` and `Message` interfaces used across client and server
2. **Server** (`server/src/chat/`): NestJS module with ChatService (in-memory mock data) and ChatController (REST endpoints)
3. **API Client** (`web-client/src/api/client.ts`): Frontend wrapper for fetch calls to server endpoints
4. **React Pages**: Use the API client to fetch and display data

### Server Endpoints
All endpoints are prefixed with `/api/chats`:
- `GET /api/chats` - Get all chats
- `GET /api/chats/:id` - Get chat by ID
- `GET /api/chats/:id/messages` - Get messages for a chat

### CORS Configuration
The server (server/src/main.ts:8-11) has CORS enabled specifically for `http://localhost:5173` (Vite's default port). When modifying CORS settings or port numbers, ensure both client and server configurations remain in sync.

### Routing Structure
The web client uses React Router with three routes defined in `App.tsx`:
- `/` - ChatListPage (displays all chats)
- `/chat/:chatId` - ChatDetailPage (displays messages for a specific chat)
- `*` - NotFoundPage (404 handler)

### TypeScript Path Aliases
The web-client uses `@/*` as an alias for `./src/*` (configured in tsconfig.json). Import from pages, components, and api using this alias:
```typescript
import { ChatListPage } from '@/pages/ChatListPage';
import { chatApi } from '@/api/client';
```

### Component Organization
- `web-client/src/components/ui/`: Reusable UI components (Button, Card, Input, etc.) - mostly Radix UI wrappers with Tailwind styling
- `web-client/src/components/chat/`: Chat-specific components (MessageBubble, MessageInput, ChatListItem)
- `web-client/src/components/layout/`: Layout components (AppLayout)
- `web-client/src/pages/`: Top-level page components that handle routing

### Mock Data
The server uses in-memory mock data defined in `server/src/chat/chat.service.ts`. Messages and chats are hardcoded arrays. There is no database or persistence layer.

## Tech Stack Notes

### Web Client
- React 19 with experimental React Compiler (babel-plugin-react-compiler)
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Radix UI for accessible component primitives
- React Router v7 for routing
- Vite v7 for build tooling

### Server
- NestJS v10 with Express platform
- TypeScript decorators enabled for NestJS metadata
- No database - uses in-memory data store

### Shared Package
The shared package exports types and must be built (`npm run build --workspace=shared`) before being imported by other workspaces in production builds. During development, TypeScript references handle this automatically.
