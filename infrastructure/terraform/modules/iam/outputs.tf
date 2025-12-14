output "server_role_arn" {
  description = "ARN of the server IRSA role"
  value       = aws_iam_role.server.arn
}

output "migrations_role_arn" {
  description = "ARN of the migrations IRSA role"
  value       = aws_iam_role.migrations.arn
}

output "external_secrets_role_arn" {
  description = "ARN of the External Secrets IRSA role"
  value       = aws_iam_role.external_secrets.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions deployment role"
  value       = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = aws_iam_openid_connect_provider.github.arn
}
