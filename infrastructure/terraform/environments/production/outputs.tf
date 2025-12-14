# Networking Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_kubeconfig_command" {
  description = "Command to configure kubectl"
  value       = module.eks.kubeconfig_command
}

output "aws_lb_controller_role_arn" {
  description = "ARN of the AWS Load Balancer Controller IAM role"
  value       = module.eks.aws_lb_controller_role_arn
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "rds_credentials_secret_arn" {
  description = "ARN of the RDS credentials secret"
  value       = module.rds.credentials_secret_arn
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.primary_endpoint
}

output "redis_url" {
  description = "Redis URL"
  value       = module.elasticache.redis_url
}

# IAM Outputs
output "server_role_arn" {
  description = "Server IRSA role ARN"
  value       = module.iam.server_role_arn
}

output "migrations_role_arn" {
  description = "Migrations IRSA role ARN"
  value       = module.iam.migrations_role_arn
}

output "github_actions_role_arn" {
  description = "GitHub Actions role ARN"
  value       = module.iam.github_actions_role_arn
}
