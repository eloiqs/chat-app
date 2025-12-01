# React Data Fetching with NestJS Backend

A monorepo project with a React frontend (web-client) and NestJS backend (server) for demonstrating data fetching patterns in a chat application.

## Project Structure

```
.
├── web-client/          # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── api/         # API client for server communication
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript type definitions
│   └── package.json
├── server/              # NestJS backend
│   ├── src/
│   │   ├── chat/        # Chat module (controller & service)
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
└── package.json         # Root workspace configuration
```

## Getting Started

### Install Dependencies

```bash
npm install
```

This will install dependencies for both the web-client and server packages.

### Development

Run both the frontend and backend simultaneously:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Run only the web-client (frontend)
npm run dev

# Run only the server (backend)
npm run dev:server
```

The web-client will be available at `http://localhost:5173` and the server at `http://localhost:3000`.

### Build

Build both packages:

```bash
npm run build
```

## Tech Stack

### Web Client
- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Radix UI components

### Server
- NestJS
- TypeScript
- Express

## Features

- Chat list with real-time data fetching
- Individual chat views with message history
- RESTful API for chat data
- CORS enabled for cross-origin requests
- Type-safe API client

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
