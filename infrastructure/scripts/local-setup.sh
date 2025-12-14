#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up local Kubernetes development environment...${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v minikube >/dev/null 2>&1 || {
    echo -e "${RED}minikube is required but not installed.${NC}"
    echo "Install with: brew install minikube"
    exit 1
}

command -v kubectl >/dev/null 2>&1 || {
    echo -e "${RED}kubectl is required but not installed.${NC}"
    echo "Install with: brew install kubectl"
    exit 1
}

command -v docker >/dev/null 2>&1 || {
    echo -e "${RED}Docker is required but not installed.${NC}"
    echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Start minikube if not running
echo -e "${YELLOW}Checking minikube status...${NC}"
if ! minikube status | grep -q "Running"; then
    echo -e "${YELLOW}Starting minikube...${NC}"
    minikube start --cpus=4 --memory=8192 --driver=docker
else
    echo -e "${GREEN}Minikube is already running${NC}"
fi

# Enable required addons
echo -e "${YELLOW}Enabling minikube addons...${NC}"
minikube addons enable ingress
minikube addons enable metrics-server

# Set docker environment to use minikube's docker daemon
echo -e "${YELLOW}Configuring Docker to use minikube...${NC}"
eval $(minikube docker-env)

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"

echo "Building server image..."
docker build -t chatapp-server:local -f server/Dockerfile .

echo "Building ws-gateway image..."
docker build -t chatapp-ws-gateway:local -f ws-gateway/Dockerfile .

echo "Building web-client image..."
docker build -t chatapp-web-client:local \
    --build-arg VITE_SERVER_URL=http://chatapp.local/api \
    --build-arg VITE_WS_URL=http://chatapp.local \
    -f web-client/Dockerfile .

# Apply Kubernetes manifests
echo -e "${YELLOW}Deploying to Kubernetes...${NC}"
kubectl apply -k infrastructure/kubernetes/overlays/local

# Wait for deployments
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available deployment/postgres -n chatapp-local --timeout=120s
kubectl wait --for=condition=available deployment/redis -n chatapp-local --timeout=60s

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
kubectl delete job db-migration -n chatapp-local --ignore-not-found
kubectl apply -k infrastructure/kubernetes/base/migrations -n chatapp-local
kubectl wait --for=condition=complete job/db-migration -n chatapp-local --timeout=120s

# Wait for app deployments
kubectl wait --for=condition=available deployment/server -n chatapp-local --timeout=120s
kubectl wait --for=condition=available deployment/ws-gateway -n chatapp-local --timeout=60s
kubectl wait --for=condition=available deployment/web-client -n chatapp-local --timeout=60s

# Get minikube IP and add to /etc/hosts
MINIKUBE_IP=$(minikube ip)
echo -e "${YELLOW}Minikube IP: ${MINIKUBE_IP}${NC}"

if ! grep -q "chatapp.local" /etc/hosts; then
    echo -e "${YELLOW}Adding chatapp.local to /etc/hosts (requires sudo)...${NC}"
    echo "$MINIKUBE_IP chatapp.local" | sudo tee -a /etc/hosts
else
    echo -e "${GREEN}chatapp.local already exists in /etc/hosts${NC}"
fi

# Final status
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Local setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Access the application at: http://chatapp.local"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n chatapp-local     # View pod status"
echo "  kubectl logs -f deployment/server -n chatapp-local    # View server logs"
echo "  make local-logs                       # View all logs"
echo "  make local-down                       # Tear down local environment"
echo ""
