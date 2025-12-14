# Staging Environment Configuration

aws_region   = "us-east-1"
environment  = "staging"
project_name = "chatapp"

# Networking
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# EKS
cluster_version     = "1.29"
node_instance_types = ["t3.medium"]
node_desired_size   = 2
node_min_size       = 1
node_max_size       = 4

# RDS
rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20

# ElastiCache
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

# GitHub - UPDATE THESE VALUES
github_org  = "YOUR_GITHUB_ORG"
github_repo = "react-data-fetching"
