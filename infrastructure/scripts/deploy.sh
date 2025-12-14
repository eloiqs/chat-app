#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <environment> [image-tag]"
    echo "  environment: local, staging, or production"
    echo "  image-tag: (optional) Docker image tag to deploy (default: latest)"
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

ENV=$1
IMAGE_TAG=${2:-latest}

echo -e "${GREEN}Deploying to ${ENV} environment...${NC}"

case $ENV in
    local)
        echo -e "${YELLOW}Building and deploying locally...${NC}"

        # Build images
        eval $(minikube docker-env)
        docker build -t chatapp-server:local -f server/Dockerfile .
        docker build -t chatapp-ws-gateway:local -f ws-gateway/Dockerfile .
        docker build -t chatapp-web-client:local \
            --build-arg VITE_SERVER_URL=http://chatapp.local/api \
            --build-arg VITE_WS_URL=http://chatapp.local \
            -f web-client/Dockerfile .

        # Deploy
        kubectl apply -k infrastructure/kubernetes/overlays/local

        # Wait for rollout
        kubectl rollout status deployment/server -n chatapp-local --timeout=120s
        kubectl rollout status deployment/ws-gateway -n chatapp-local --timeout=60s
        kubectl rollout status deployment/web-client -n chatapp-local --timeout=60s

        echo -e "${GREEN}Local deployment complete!${NC}"
        echo "Access at: http://chatapp.local"
        ;;

    staging)
        echo -e "${YELLOW}Deploying to staging with tag: ${IMAGE_TAG}${NC}"

        # Ensure AWS credentials are configured
        if ! aws sts get-caller-identity > /dev/null 2>&1; then
            echo -e "${RED}AWS credentials not configured. Please run 'aws configure' or set credentials.${NC}"
            exit 1
        fi

        # Update kubeconfig
        aws eks update-kubeconfig --region us-east-1 --name chatapp-staging

        # Update image tags
        cd infrastructure/kubernetes/overlays/staging
        REGISTRY=$(aws ecr describe-repositories --repository-names chatapp/server --query 'repositories[0].repositoryUri' --output text | cut -d'/' -f1)

        kustomize edit set image \
            chatapp/server=${REGISTRY}/chatapp/server:${IMAGE_TAG} \
            chatapp/ws-gateway=${REGISTRY}/chatapp/ws-gateway:${IMAGE_TAG} \
            chatapp/web-client=${REGISTRY}/chatapp/web-client:${IMAGE_TAG}

        cd -

        # Run migrations
        kubectl delete job db-migration -n chatapp-staging --ignore-not-found
        kubectl apply -k infrastructure/kubernetes/base/migrations -n chatapp-staging
        kubectl wait --for=condition=complete job/db-migration -n chatapp-staging --timeout=300s

        # Deploy
        kubectl apply -k infrastructure/kubernetes/overlays/staging

        # Wait for rollout
        kubectl rollout status deployment/server -n chatapp-staging --timeout=300s
        kubectl rollout status deployment/ws-gateway -n chatapp-staging --timeout=300s
        kubectl rollout status deployment/web-client -n chatapp-staging --timeout=300s

        # Get ALB URL
        ALB_URL=$(kubectl get ingress chatapp-ingress -n chatapp-staging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

        echo -e "${GREEN}Staging deployment complete!${NC}"
        echo "Access at: http://${ALB_URL}"
        ;;

    production)
        echo -e "${YELLOW}Deploying to production with tag: ${IMAGE_TAG}${NC}"
        echo -e "${RED}WARNING: You are about to deploy to PRODUCTION!${NC}"
        read -p "Are you sure? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            echo "Deployment cancelled."
            exit 0
        fi

        # Ensure AWS credentials are configured
        if ! aws sts get-caller-identity > /dev/null 2>&1; then
            echo -e "${RED}AWS credentials not configured.${NC}"
            exit 1
        fi

        # Update kubeconfig
        aws eks update-kubeconfig --region us-east-1 --name chatapp-production

        # Update image tags
        cd infrastructure/kubernetes/overlays/production
        REGISTRY=$(aws ecr describe-repositories --repository-names chatapp/server --query 'repositories[0].repositoryUri' --output text | cut -d'/' -f1)

        kustomize edit set image \
            chatapp/server=${REGISTRY}/chatapp/server:${IMAGE_TAG} \
            chatapp/ws-gateway=${REGISTRY}/chatapp/ws-gateway:${IMAGE_TAG} \
            chatapp/web-client=${REGISTRY}/chatapp/web-client:${IMAGE_TAG}

        cd -

        # Run migrations
        kubectl delete job db-migration -n chatapp-production --ignore-not-found
        kubectl apply -k infrastructure/kubernetes/base/migrations -n chatapp-production
        kubectl wait --for=condition=complete job/db-migration -n chatapp-production --timeout=300s

        # Deploy
        kubectl apply -k infrastructure/kubernetes/overlays/production

        # Wait for rollout
        kubectl rollout status deployment/server -n chatapp-production --timeout=600s
        kubectl rollout status deployment/ws-gateway -n chatapp-production --timeout=600s
        kubectl rollout status deployment/web-client -n chatapp-production --timeout=600s

        # Get ALB URL
        ALB_URL=$(kubectl get ingress chatapp-ingress -n chatapp-production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

        echo -e "${GREEN}Production deployment complete!${NC}"
        echo "Access at: http://${ALB_URL}"
        ;;

    *)
        echo -e "${RED}Unknown environment: ${ENV}${NC}"
        usage
        ;;
esac
