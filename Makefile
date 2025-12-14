# Makefile for ChatApp DevOps Operations

.PHONY: help local-setup local-up local-down local-logs local-build \
        tf-init tf-plan tf-apply tf-destroy \
        deploy monitoring-install monitoring-port-forward \
        docker-build docker-push

# Default target
help:
	@echo "ChatApp DevOps Commands"
	@echo ""
	@echo "Local Development (minikube):"
	@echo "  make local-setup     - Initialize minikube and deploy app"
	@echo "  make local-build     - Build Docker images for local use"
	@echo "  make local-up        - Deploy/update local environment"
	@echo "  make local-down      - Tear down local environment"
	@echo "  make local-logs      - Tail logs from all services"
	@echo "  make local-restart   - Restart all deployments"
	@echo ""
	@echo "Terraform (requires ENV=staging|production):"
	@echo "  make tf-init ENV=staging     - Initialize Terraform"
	@echo "  make tf-plan ENV=staging     - Plan Terraform changes"
	@echo "  make tf-apply ENV=staging    - Apply Terraform changes"
	@echo "  make tf-destroy ENV=staging  - Destroy infrastructure"
	@echo ""
	@echo "Kubernetes Deployment:"
	@echo "  make deploy ENV=local        - Deploy to local"
	@echo "  make deploy ENV=staging      - Deploy to staging"
	@echo "  make deploy ENV=production   - Deploy to production"
	@echo ""
	@echo "Monitoring:"
	@echo "  make monitoring-install      - Install Prometheus/Grafana stack"
	@echo "  make monitoring-port-forward - Port-forward Grafana (localhost:3000)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build            - Build all Docker images"
	@echo "  make docker-push TAG=v1.0.0  - Push images to ECR"

# ============================================================================
# Local Development (minikube)
# ============================================================================

local-setup:
	@./infrastructure/scripts/local-setup.sh

local-build:
	@echo "Building Docker images for local development..."
	@eval $$(minikube docker-env) && \
	docker build -t chatapp-server:local -f server/Dockerfile . && \
	docker build -t chatapp-ws-gateway:local -f ws-gateway/Dockerfile . && \
	docker build -t chatapp-web-client:local \
		--build-arg VITE_SERVER_URL=http://chatapp.local/api \
		--build-arg VITE_WS_URL=http://chatapp.local \
		-f web-client/Dockerfile .
	@echo "Build complete!"

local-up: local-build
	@echo "Deploying to local minikube..."
	kubectl apply -k infrastructure/kubernetes/overlays/local
	@echo "Waiting for deployments..."
	kubectl rollout status deployment/server -n chatapp-local --timeout=120s
	kubectl rollout status deployment/ws-gateway -n chatapp-local --timeout=60s
	kubectl rollout status deployment/web-client -n chatapp-local --timeout=60s
	@echo "Deployment complete! Access at http://chatapp.local"

local-down:
	@echo "Tearing down local environment..."
	kubectl delete -k infrastructure/kubernetes/overlays/local --ignore-not-found
	@echo "Teardown complete!"

local-logs:
	kubectl logs -f -l app=chatapp --all-containers -n chatapp-local

local-restart:
	kubectl rollout restart deployment/server -n chatapp-local
	kubectl rollout restart deployment/ws-gateway -n chatapp-local
	kubectl rollout restart deployment/web-client -n chatapp-local

local-status:
	@echo "=== Pods ==="
	kubectl get pods -n chatapp-local
	@echo ""
	@echo "=== Services ==="
	kubectl get svc -n chatapp-local
	@echo ""
	@echo "=== Ingress ==="
	kubectl get ingress -n chatapp-local

# ============================================================================
# Terraform Operations
# ============================================================================

tf-init:
ifndef ENV
	$(error ENV is required. Usage: make tf-init ENV=staging)
endif
	cd infrastructure/terraform/environments/$(ENV) && terraform init

tf-plan:
ifndef ENV
	$(error ENV is required. Usage: make tf-plan ENV=staging)
endif
	cd infrastructure/terraform/environments/$(ENV) && terraform plan -out=tfplan

tf-apply:
ifndef ENV
	$(error ENV is required. Usage: make tf-apply ENV=staging)
endif
	cd infrastructure/terraform/environments/$(ENV) && terraform apply tfplan

tf-destroy:
ifndef ENV
	$(error ENV is required. Usage: make tf-destroy ENV=staging)
endif
	@echo "WARNING: This will destroy all infrastructure in $(ENV)!"
	cd infrastructure/terraform/environments/$(ENV) && terraform destroy

tf-output:
ifndef ENV
	$(error ENV is required. Usage: make tf-output ENV=staging)
endif
	cd infrastructure/terraform/environments/$(ENV) && terraform output

# Bootstrap Terraform backend (run once)
tf-bootstrap:
	cd infrastructure/terraform/shared/backend-bootstrap && \
	terraform init && \
	terraform apply

# ============================================================================
# Kubernetes Deployment
# ============================================================================

deploy:
ifndef ENV
	$(error ENV is required. Usage: make deploy ENV=staging)
endif
	@./infrastructure/scripts/deploy.sh $(ENV) $(TAG)

teardown:
ifndef ENV
	$(error ENV is required. Usage: make teardown ENV=staging)
endif
	@./infrastructure/scripts/teardown.sh $(ENV)

# Run database migrations
migrate:
ifndef ENV
	$(error ENV is required. Usage: make migrate ENV=staging)
endif
	kubectl delete job db-migration -n chatapp-$(ENV) --ignore-not-found
	kubectl apply -k infrastructure/kubernetes/base/migrations -n chatapp-$(ENV)
	kubectl wait --for=condition=complete job/db-migration -n chatapp-$(ENV) --timeout=300s

# ============================================================================
# Monitoring
# ============================================================================

monitoring-install:
	@echo "Installing Prometheus and Grafana..."
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
	helm repo update
	kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
	helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
		-n monitoring \
		-f infrastructure/kubernetes/components/monitoring/prometheus-values.yaml
	kubectl apply -k infrastructure/kubernetes/components/monitoring
	@echo "Monitoring stack installed!"
	@echo "Run 'make monitoring-port-forward' to access Grafana"

monitoring-port-forward:
	@echo "Grafana available at http://localhost:3000 (admin/admin)"
	kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

monitoring-alerts:
	kubectl get prometheusrules -n monitoring

# ============================================================================
# Docker Operations
# ============================================================================

docker-build:
	@echo "Building all Docker images..."
	docker build -t chatapp/server:latest -f server/Dockerfile .
	docker build -t chatapp/ws-gateway:latest -f ws-gateway/Dockerfile .
	docker build -t chatapp/web-client:latest -f web-client/Dockerfile .
	@echo "Build complete!"

docker-push:
ifndef TAG
	$(error TAG is required. Usage: make docker-push TAG=v1.0.0)
endif
	@echo "Pushing images with tag $(TAG)..."
	$(eval REGISTRY := $(shell aws ecr describe-repositories --repository-names chatapp/server --query 'repositories[0].repositoryUri' --output text | cut -d'/' -f1))
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(REGISTRY)
	docker tag chatapp/server:latest $(REGISTRY)/chatapp/server:$(TAG)
	docker tag chatapp/ws-gateway:latest $(REGISTRY)/chatapp/ws-gateway:$(TAG)
	docker tag chatapp/web-client:latest $(REGISTRY)/chatapp/web-client:$(TAG)
	docker push $(REGISTRY)/chatapp/server:$(TAG)
	docker push $(REGISTRY)/chatapp/ws-gateway:$(TAG)
	docker push $(REGISTRY)/chatapp/web-client:$(TAG)
	@echo "Push complete!"

# ============================================================================
# Utility Commands
# ============================================================================

# Configure kubectl for an environment
kubeconfig:
ifndef ENV
	$(error ENV is required. Usage: make kubeconfig ENV=staging)
endif
ifeq ($(ENV),local)
	minikube update-context
else
	aws eks update-kubeconfig --region us-east-1 --name chatapp-$(ENV)
endif

# Show cluster info
cluster-info:
	kubectl cluster-info
	kubectl get nodes

# Validate Kubernetes manifests
validate:
	kubectl apply -k infrastructure/kubernetes/overlays/local --dry-run=client
	kubectl apply -k infrastructure/kubernetes/overlays/staging --dry-run=client
	kubectl apply -k infrastructure/kubernetes/overlays/production --dry-run=client
	@echo "All manifests are valid!"
