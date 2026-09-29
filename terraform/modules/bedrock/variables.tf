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

variable "vpc_id" {
  description = "VPC ID where Bedrock endpoint will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for VPC endpoint"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks for security group rules"
  type        = list(string)
}
