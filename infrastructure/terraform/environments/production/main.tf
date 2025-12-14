terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Networking
module "networking" {
  source = "../../modules/networking"

  environment           = var.environment
  project_name          = var.project_name
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  enable_nat_gateway_ha = true # Multi-AZ NAT for production
}

# EKS Cluster
module "eks" {
  source = "../../modules/eks"

  environment               = var.environment
  project_name              = var.project_name
  cluster_version           = var.cluster_version
  vpc_id                    = module.networking.vpc_id
  subnet_ids                = module.networking.private_subnet_ids
  cluster_security_group_id = module.networking.eks_cluster_security_group_id
  node_security_group_id    = module.networking.eks_nodes_security_group_id
  node_instance_types       = var.node_instance_types
  node_desired_size         = var.node_desired_size
  node_min_size             = var.node_min_size
  node_max_size             = var.node_max_size
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  environment         = var.environment
  project_name        = var.project_name
  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.private_subnet_ids
  security_group_ids  = [module.networking.rds_security_group_id]
  instance_class      = var.rds_instance_class
  allocated_storage   = var.rds_allocated_storage
  multi_az            = true # Multi-AZ for production
  deletion_protection = true
  skip_final_snapshot = false
  backup_retention_period = 14
}

# ElastiCache Redis
module "elasticache" {
  source = "../../modules/elasticache"

  environment                = var.environment
  project_name               = var.project_name
  vpc_id                     = module.networking.vpc_id
  subnet_ids                 = module.networking.private_subnet_ids
  security_group_ids         = [module.networking.elasticache_security_group_id]
  node_type                  = var.redis_node_type
  num_cache_nodes            = var.redis_num_nodes
  automatic_failover_enabled = true # Automatic failover for production
  snapshot_retention_limit   = 7
}

# IAM Roles
# Note: ECR repositories are created in staging and shared
data "terraform_remote_state" "staging" {
  backend = "s3"
  config = {
    bucket = "chatapp-terraform-state-ACCOUNT_ID" # Replace with actual bucket name
    key    = "staging/terraform.tfstate"
    region = "us-east-1"
  }
}

module "iam" {
  source = "../../modules/iam"

  environment                = var.environment
  project_name               = var.project_name
  oidc_provider_arn          = module.eks.oidc_provider_arn
  oidc_provider_url          = module.eks.oidc_provider_url
  rds_credentials_secret_arn = module.rds.credentials_secret_arn
  github_org                 = var.github_org
  github_repo                = var.github_repo
  ecr_repository_arns        = values(data.terraform_remote_state.staging.outputs.ecr_repository_urls)
}
