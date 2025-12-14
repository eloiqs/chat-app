output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Name of the database"
  value       = aws_db_instance.main.db_name
}

output "master_username" {
  description = "Master username"
  value       = aws_db_instance.main.username
}

output "credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing credentials"
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

output "credentials_secret_name" {
  description = "Name of the Secrets Manager secret containing credentials"
  value       = aws_secretsmanager_secret.rds_credentials.name
}

output "instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "connection_url" {
  description = "Database connection URL (sensitive)"
  value       = "postgresql://${aws_db_instance.main.username}:PASSWORD@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}
