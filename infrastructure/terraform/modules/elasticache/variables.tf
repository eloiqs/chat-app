variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "chatapp"
}

variable "vpc_id" {
  description = "VPC ID where ElastiCache will be created"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for ElastiCache subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for ElastiCache"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes (1 for single node, 2+ for cluster)"
  type        = number
  default     = 1
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover (requires num_cache_nodes >= 2)"
  type        = bool
  default     = false
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
