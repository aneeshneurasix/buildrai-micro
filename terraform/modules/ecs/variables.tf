variable "project_name" {
  description = "Name of the project"
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

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID of ALB"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of ALB listener"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL"
  type        = string
}

variable "ai_service_target_group_arn" {
  description = "Target group ARN for AI service"
  type        = string
}

variable "auth_service_target_group_arn" {
  description = "Target group ARN for Auth service"
  type        = string
}

variable "api_service_target_group_arn" {
  description = "Target group ARN for API service"
  type        = string
}

variable "ai_service_desired_count" {
  description = "Desired number of AI service tasks"
  type        = number
  default     = 2
}

variable "auth_service_desired_count" {
  description = "Desired number of Auth service tasks"
  type        = number
  default     = 2
}

variable "api_service_desired_count" {
  description = "Desired number of API service tasks"
  type        = number
  default     = 2
}

variable "ai_service_env_vars" {
  description = "Environment variables for AI service"
  type        = list(map(string))
  default     = []
}

variable "auth_service_env_vars" {
  description = "Environment variables for Auth service"
  type        = list(map(string))
  default     = []
}

variable "worker_service_env_vars" {
  description = "Environment variables for Worker service"
  type        = list(map(string))
  default     = []
}

variable "api_service_env_vars" {
  description = "Environment variables for API service"
  type        = list(map(string))
  default     = []
}

variable "bedrock_policy_arn" {
  description = "ARN of IAM policy for Bedrock access"
  type        = string
  default     = ""
}
