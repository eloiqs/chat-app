FROM node:24-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --workspace=shared --workspace=server

# Copy source files
COPY shared ./shared
COPY server ./server

# Build server only (shared is imported as TypeScript directly)
RUN npm run build --workspace=server

FROM node:24-alpine AS runner

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/prisma.config.ts ./server/prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

WORKDIR /app/server

# Start the server
CMD ["node", "dist/main.js"]
