# Infrastructure Documentation

This directory contains all infrastructure-as-code for the ChatApp, including Terraform modules for AWS resources and Kubernetes manifests for deployment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (us-east-1)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                 VPC                                    │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  Public Subnet  │  │  Public Subnet  │  │  Public Subnet  │       │  │
│  │  │   (us-east-1a)  │  │   (us-east-1b)  │  │   (us-east-1c)  │       │  │
│  │  │       ALB       │  │                 │  │                 │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  Private Subnet │  │  Private Subnet │  │  Private Subnet │       │  │
│  │  │   (us-east-1a)  │  │   (us-east-1b)  │  │   (us-east-1c)  │       │  │
│  │  │   EKS Nodes     │  │   EKS Nodes     │  │   EKS Nodes     │       │  │
│  │  │   RDS           │  │   RDS (standby) │  │   ElastiCache   │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
infrastructure/
├── terraform/
│   ├── modules/           # Reusable Terraform modules
│   │   ├── networking/    # VPC, subnets, security groups
│   │   ├── eks/           # EKS cluster and node groups
│   │   ├── rds/           # PostgreSQL RDS
│   │   ├── elasticache/   # Redis ElastiCache
│   │   ├── ecr/           # Container registries
│   │   └── iam/           # IAM roles (IRSA, GitHub Actions)
│   ├── environments/
│   │   ├── staging/       # Staging environment config
│   │   └── production/    # Production environment config
│   └── shared/
│       └── backend-bootstrap/  # S3 + DynamoDB for state
│
├── kubernetes/
│   ├── base/              # Common K8s manifests
│   │   ├── server/
│   │   ├── ws-gateway/
│   │   ├── web-client/
│   │   └── migrations/
│   ├── overlays/
│   │   ├── local/         # Minikube with in-cluster DB
│   │   ├── staging/       # AWS staging
│   │   └── production/    # AWS production with HPA
│   └── components/
│       └── monitoring/    # Prometheus/Grafana
│
└── scripts/
    ├── local-setup.sh     # Initialize local environment
    ├── deploy.sh          # Deploy to any environment
    └── teardown.sh        # Tear down environment
```

## Quick Start

### Local Development (Minikube)

```bash
# One-time setup
make local-setup

# Build and deploy
make local-up

# View logs
make local-logs

# Tear down
make local-down
```

Access the app at http://chatapp.local

### AWS Deployment

#### 1. Bootstrap Terraform Backend (One-time)

```bash
cd infrastructure/terraform/shared/backend-bootstrap
terraform init
terraform apply
```

Update `backend.tf` files in staging/production with the S3 bucket name.

#### 2. Deploy Staging

```bash
# Initialize and apply Terraform
make tf-init ENV=staging
make tf-plan ENV=staging
make tf-apply ENV=staging

# Deploy to Kubernetes
make deploy ENV=staging
```

#### 3. Deploy Production

```bash
# Initialize and apply Terraform
make tf-init ENV=production
make tf-plan ENV=production
make tf-apply ENV=production

# Deploy to Kubernetes
make deploy ENV=production
```

## Environment Comparison

| Resource | Local | Staging | Production |
|----------|-------|---------|------------|
| Kubernetes | Minikube | EKS (t3.medium) | EKS (t3.large) |
| PostgreSQL | In-cluster pod | RDS (db.t3.micro) | RDS Multi-AZ (db.t3.small) |
| Redis | In-cluster pod | ElastiCache (cache.t3.micro) | ElastiCache cluster (cache.t3.small) |
| Replicas | 1 each | 2 each | 2-10 (HPA) |
| Ingress | Nginx | ALB | ALB |
| Secrets | K8s native | External Secrets | External Secrets |

## CI/CD Pipeline

The pipeline is defined in `.github/workflows/`:

1. **ci.yml** - Runs on every push/PR
   - Lint, build, and run E2E tests

2. **build-push.yml** - Runs on push to main
   - Build Docker images
   - Push to ECR
   - Trigger staging deployment

3. **deploy-staging.yml** - Triggered by build-push
   - Run migrations
   - Deploy to staging
   - Run smoke tests

4. **deploy-production.yml** - Triggered by release
   - Manual approval required
   - Run migrations
   - Deploy to production
   - Run smoke tests

## Monitoring

### Install Monitoring Stack

```bash
make monitoring-install
```

### Access Grafana

```bash
make monitoring-port-forward
# Open http://localhost:3000 (admin/admin)
```

### Pre-configured Dashboards

- Kubernetes Cluster Overview
- Pod Resource Usage
- Node Exporter (host metrics)

### Alerting Rules

- High error rate (>5% for 5 minutes)
- Pod not ready
- High memory/CPU usage
- Pod restart loop

## Terraform Modules

### Networking Module

Creates VPC with:
- 3 public subnets (for ALB)
- 3 private subnets (for EKS, RDS, ElastiCache)
- NAT Gateway (single for staging, HA for production)
- Security groups for all services

### EKS Module

Provisions:
- EKS cluster (v1.29)
- Managed node group
- OIDC provider for IRSA
- AWS Load Balancer Controller IAM role
- EKS add-ons (VPC CNI, CoreDNS, kube-proxy)

### RDS Module

Provisions:
- PostgreSQL 16 instance
- Subnet group
- Parameter group
- Secrets in AWS Secrets Manager
- Enhanced monitoring

### ElastiCache Module

Provisions:
- Redis 7 cluster
- Single node (staging) or replication group (production)
- Automatic failover (production)

### ECR Module

Creates repositories for:
- chatapp/server
- chatapp/ws-gateway
- chatapp/web-client

With lifecycle policies for image cleanup.

### IAM Module

Creates:
- IRSA roles for server and migrations
- GitHub Actions OIDC role for deployments
- External Secrets Operator role

## Secrets Management

### Local

Secrets are stored as plain Kubernetes Secrets (for development only).

### AWS (Staging/Production)

Secrets are stored in AWS Secrets Manager and synced to Kubernetes using External Secrets Operator:

1. RDS credentials are automatically created by Terraform
2. External Secrets Operator pulls credentials from Secrets Manager
3. Kubernetes Secrets are created from External Secrets

## Troubleshooting

### Common Issues

**Pod stuck in Pending state:**
```bash
kubectl describe pod <pod-name> -n <namespace>
# Check events for scheduling issues
```

**Database connection errors:**
```bash
# Check secrets
kubectl get secret chatapp-secrets -n <namespace> -o yaml
# Check External Secrets sync
kubectl get externalsecret -n <namespace>
```

**ALB not provisioning:**
```bash
# Check AWS LB Controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

### Useful Commands

```bash
# View all resources in namespace
kubectl get all -n chatapp-staging

# Port-forward to a pod
kubectl port-forward deployment/server 3001:3001 -n chatapp-staging

# Execute shell in pod
kubectl exec -it deployment/server -n chatapp-staging -- sh

# View HPA status
kubectl get hpa -n chatapp-production

# View pod disruption budgets
kubectl get pdb -n chatapp-production
```

## Cost Optimization

### Staging (Estimated: ~$150/month)
- EKS control plane: $73
- 2x t3.medium nodes: $60
- RDS db.t3.micro: $15
- ElastiCache cache.t3.micro: $12

### Production (Estimated: ~$350/month)
- EKS control plane: $73
- 3x t3.large nodes: $180
- RDS db.t3.small Multi-AZ: $50
- ElastiCache cluster: $50

*Costs are estimates and may vary based on usage.*
