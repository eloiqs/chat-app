# Production Environment Configuration

aws_region   = "us-east-1"
environment  = "production"
project_name = "chatapp"

# Networking (different CIDR from staging)
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# EKS
cluster_version     = "1.29"
node_instance_types = ["t3.large"]
node_desired_size   = 3
node_min_size       = 2
node_max_size       = 10

# RDS (larger instance, multi-AZ enabled in main.tf)
rds_instance_class    = "db.t3.small"
rds_allocated_storage = 50

# ElastiCache (with automatic failover enabled in main.tf)
redis_node_type = "cache.t3.small"
redis_num_nodes = 2

# GitHub - UPDATE THESE VALUES
github_org  = "YOUR_GITHUB_ORG"
github_repo = "react-data-fetching"
