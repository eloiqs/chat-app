output "primary_endpoint" {
  description = "Primary endpoint for Redis"
  value = local.use_replication_group ? aws_elasticache_replication_group.main[0].primary_endpoint_address : aws_elasticache_cluster.main[0].cache_nodes[0].address
}

output "port" {
  description = "Redis port"
  value       = var.port
}

output "redis_url" {
  description = "Redis connection URL"
  value = local.use_replication_group ? "redis://${aws_elasticache_replication_group.main[0].primary_endpoint_address}:${var.port}" : "redis://${aws_elasticache_cluster.main[0].cache_nodes[0].address}:${var.port}"
}

output "cluster_id" {
  description = "ID of the ElastiCache cluster or replication group"
  value = local.use_replication_group ? aws_elasticache_replication_group.main[0].id : aws_elasticache_cluster.main[0].cluster_id
}

output "configuration_endpoint" {
  description = "Configuration endpoint (for cluster mode)"
  value = local.use_replication_group ? aws_elasticache_replication_group.main[0].configuration_endpoint_address : null
}

output "reader_endpoint" {
  description = "Reader endpoint (for replication group)"
  value = local.use_replication_group ? aws_elasticache_replication_group.main[0].reader_endpoint_address : null
}
