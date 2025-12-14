locals {
  cluster_id = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })

  # Use replication group for cluster mode, simple cluster for single node
  use_replication_group = var.num_cache_nodes > 1
}

# Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.cluster_id}-subnet-group"
  description = "Subnet group for ${local.cluster_id} ElastiCache"
  subnet_ids  = var.subnet_ids

  tags = local.common_tags
}

# Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  name        = "${local.cluster_id}-redis7"
  family      = "redis7"
  description = "Parameter group for ${local.cluster_id}"

  # Enable keyspace notifications for pub/sub
  parameter {
    name  = "notify-keyspace-events"
    value = "AKE"
  }

  tags = local.common_tags
}

# Single Node Redis Cluster (for staging)
resource "aws_elasticache_cluster" "main" {
  count = local.use_replication_group ? 0 : 1

  cluster_id           = local.cluster_id
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_nodes      = 1
  port                 = var.port
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = var.security_group_ids

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "mon:04:00-mon:05:00"

  tags = merge(local.common_tags, {
    Name = local.cluster_id
  })
}

# Replication Group (for production with failover)
resource "aws_elasticache_replication_group" "main" {
  count = local.use_replication_group ? 1 : 0

  replication_group_id = local.cluster_id
  description          = "Redis replication group for ${local.cluster_id}"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = var.port
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = var.security_group_ids

  num_cache_clusters         = var.num_cache_nodes
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.automatic_failover_enabled

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # Enable if using Redis AUTH

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "mon:04:00-mon:05:00"

  tags = merge(local.common_tags, {
    Name = local.cluster_id
  })
}
