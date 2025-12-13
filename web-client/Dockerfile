FROM node:24-alpine AS builder

WORKDIR /app

# Build args for Vite environment variables
ARG VITE_SERVER_URL
ARG VITE_WS_URL

# Copy root package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY web-client/package*.json ./web-client/

# Install dependencies
RUN npm ci --workspace=shared --workspace=web-client

# Copy source files
COPY shared ./shared
COPY web-client ./web-client

# Build the web client with environment variables
RUN VITE_SERVER_URL=$VITE_SERVER_URL VITE_WS_URL=$VITE_WS_URL npm run build --workspace=web-client

FROM nginx:alpine AS runner

# Copy built files to nginx
COPY --from=builder /app/web-client/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY web-client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
