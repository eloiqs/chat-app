# React Data Fetching Chat App

A real-time chat application demonstrating modern React data fetching patterns with TanStack Query, optimistic updates, and WebSocket integration.

## Features

- Real-time messaging with Socket.IO
- Optimistic updates for instant UI feedback
- Failed message recovery with retry/cancel
- Unread message tracking
- Typing indicators
- Multi-user support with isolated sessions

## Tech Stack

**Frontend**
- React 19 with Vite
- TanStack Query for server state management
- Tailwind CSS 4 with Radix UI components
- React Router DOM for navigation
- Socket.IO client for real-time features

**Backend**
- NestJS with Express
- Socket.IO for WebSocket support
- In-memory data store (mock data)

**Testing**
- Playwright for end-to-end tests
- Page Object pattern with custom fixtures

## Project Structure

```
├── web-client/     # React frontend
├── server/         # NestJS backend
├── shared/         # Shared TypeScript types
└── e2e/            # Playwright tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

Start both the client and server:

```bash
npm run dev:all
```

Or start them separately:

```bash
# Terminal 1 - Start the server
npm run dev:server

# Terminal 2 - Start the client
npm run dev
```

The client runs at `http://localhost:5173` and the server at `http://localhost:3000`.

### Environment Variables

Copy the example environment file for the server:

```bash
cp server/.env.example server/.env
```

Available variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `CORS_CREDENTIALS` | Allow credentials in CORS | `true` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web client |
| `npm run dev:server` | Start NestJS server |
| `npm run dev:all` | Start both client and server |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run test:e2e` | Run Playwright tests |
| `npm run test:e2e:ui` | Run tests with Playwright UI |
| `npm run test:e2e:headed` | Run tests in headed browser |

## Architecture Highlights

### Optimistic Updates

Messages are immediately shown in the UI while the API request is in flight. On failure, messages are moved to a "failed" state with retry/cancel options.

```tsx
const { mutateAsync } = useMutation({
  mutationFn: (content) => chatApi.sendMessage(chatId, content),
  onMutate: (content) => {
    // Add optimistic message to cache
    queryClient.setQueryData(['messages', chatId], (old) => [...old, optimisticMessage]);
  },
  onError: (error, content, context) => {
    // Remove optimistic message, save to failed messages
  },
});
```

### Failed Message Recovery

Failed messages are persisted to localStorage and displayed with error styling. Users can retry sending or delete the message.

### Real-time Updates

Socket.IO handles typing indicators and message broadcasts. Users join chat rooms to receive updates only for active conversations.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get all chats for current user |
| GET | `/api/chats/:id` | Get chat by ID |
| GET | `/api/chats/:id/messages` | Get messages for a chat |
| POST | `/api/chats/:id/messages` | Send a message |
| POST | `/api/chats/:id/read` | Mark chat as read |
| GET | `/api/chats/users` | Get all users (for login) |

All endpoints require the `x-user-id` header for authentication.

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `authenticate` | Client → Server | Authenticate with user ID |
| `join_chat` | Client → Server | Join a chat room |
| `leave_chat` | Client → Server | Leave a chat room |
| `typing` | Client → Server | Send typing indicator |
| `user_typing` | Server → Client | Receive typing indicator |
| `new_message` | Server → Client | Receive new message |

## License

MIT
