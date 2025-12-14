terraform {
  backend "s3" {
    bucket         = "chatapp-terraform-state-ACCOUNT_ID" # Replace with actual bucket name
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "chatapp-terraform-locks"
  }
}
