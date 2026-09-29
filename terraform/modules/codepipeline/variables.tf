variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  type        = string
}

variable "github_connection_arn" {
  description = "AWS CodeStar Connection ARN for GitHub"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository (owner/repo)"
  type        = string
  default     = "aneeshneurasix/buildrai-micro"
}

variable "github_branch" {
  description = "GitHub branch to track"
  type        = string
  default     = "main"
}
