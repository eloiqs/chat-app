variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "chatapp"
}

variable "repository_names" {
  description = "List of repository names to create"
  type        = list(string)
  default     = ["server", "ws-gateway", "web-client"]
}

variable "image_retention_count" {
  description = "Number of images to retain"
  type        = number
  default     = 30
}

variable "enable_scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
