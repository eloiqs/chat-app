FROM node:24-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY ws-gateway/package*.json ./ws-gateway/

# Install dependencies
RUN npm ci --workspace=shared --workspace=ws-gateway

# Copy source files
COPY shared ./shared
COPY ws-gateway ./ws-gateway

# Build ws-gateway only (shared is imported as TypeScript directly)
RUN npm run build --workspace=ws-gateway

FROM node:24-alpine AS runner

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/ws-gateway/package*.json ./ws-gateway/
COPY --from=builder /app/ws-gateway/dist ./ws-gateway/dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

# PORT is set at runtime via docker-compose
CMD ["node", "ws-gateway/dist/main.js"]
