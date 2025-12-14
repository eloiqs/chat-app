#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <environment>"
    echo "  environment: local, staging, or production"
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

ENV=$1

echo -e "${YELLOW}Tearing down ${ENV} environment...${NC}"

case $ENV in
    local)
        echo -e "${YELLOW}Removing local Kubernetes resources...${NC}"
        kubectl delete -k infrastructure/kubernetes/overlays/local --ignore-not-found
        echo -e "${GREEN}Local teardown complete!${NC}"
        ;;

    staging)
        echo -e "${RED}WARNING: This will delete all staging resources!${NC}"
        read -p "Are you sure? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            echo "Teardown cancelled."
            exit 0
        fi

        aws eks update-kubeconfig --region us-east-1 --name chatapp-staging
        kubectl delete -k infrastructure/kubernetes/overlays/staging --ignore-not-found
        echo -e "${GREEN}Staging teardown complete!${NC}"
        ;;

    production)
        echo -e "${RED}WARNING: This will delete all PRODUCTION resources!${NC}"
        echo -e "${RED}This action is IRREVERSIBLE!${NC}"
        read -p "Type 'DELETE PRODUCTION' to confirm: " confirm

        if [ "$confirm" != "DELETE PRODUCTION" ]; then
            echo "Teardown cancelled."
            exit 0
        fi

        aws eks update-kubeconfig --region us-east-1 --name chatapp-production
        kubectl delete -k infrastructure/kubernetes/overlays/production --ignore-not-found
        echo -e "${GREEN}Production teardown complete!${NC}"
        ;;

    *)
        echo -e "${RED}Unknown environment: ${ENV}${NC}"
        usage
        ;;
esac
