# Terraform Variables for BuildeRAI Microservices
# Follows AWS naming best practices and tagging standards

variable "aws_region" {
  description = "AWS Region for deployment"
  type        = string
  default     = "ap-south-1"
}

variable "aws_profile" {
  description = "AWS CLI Profile"
  type        = string
  default     = "buildrai-aws"
}

variable "project_name" {
  description = "Project name (used for resource naming and tags)"
  type        = string
  default     = "builderai"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "builderai.app"
}

variable "acm_certificate_arn" {
  description = "ACM Certificate ARN for HTTPS (leave empty for HTTP only)"
  type        = string
  default     = ""
}

# VPC Configuration
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability Zones"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ECS Services Configuration
variable "ecs_services" {
  description = "ECS Services configuration"
  type = map(object({
    cpu          = number
    memory       = number
    port         = number
    desired_count = number
    min_count    = number
    max_count    = number
    image        = string
  }))

  default = {
    ai-service = {
      cpu           = 2048
      memory        = 4096
      port          = 4000
      desired_count = 2
      min_count     = 2
      max_count     = 10
      image         = "codstack-ai-service:latest"
    }
    auth-service = {
      cpu           = 512
      memory        = 1024
      port          = 4001
      desired_count = 2
      min_count     = 2
      max_count     = 6
      image         = "codstack-auth-service:latest"
    }
    api-service = {
      cpu           = 1024
      memory        = 2048
      port          = 3001
      desired_count = 2
      min_count     = 2
      max_count     = 8
      image         = "codstack-api-service:latest"
    }
    worker-service = {
      cpu           = 1024
      memory        = 2048
      port          = 0
      desired_count = 2
      min_count     = 2
      max_count     = 4
      image         = "codstack-worker-service:latest"
    }
  }
}

# ALB Target Groups
variable "alb_target_groups" {
  description = "ALB Target Groups configuration"
  type = map(object({
    port        = number
    protocol    = string
    path_pattern = list(string)
  }))

  default = {
    ai-service = {
      port         = 4000
      protocol     = "HTTP"
      path_pattern = ["/api/generate/*", "/api/ai/*", "/api/code-review/*", "/api/quality/*", "/api/security/scan*"]
    }
    auth-service = {
      port         = 4001
      protocol     = "HTTP"
      path_pattern = ["/api/auth/*", "/api/usage", "/api/tokens/*", "/api/webhooks/clerk"]
    }
    api-service = {
      port         = 3001
      protocol     = "HTTP"
      path_pattern = ["/api/*"]
    }
  }
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

# Secrets Configuration
variable "secrets_config" {
  description = "Secrets to create in Secrets Manager"
  type        = map(string)
  default     = {
    "mongodb-uri"           = ""
    "redis-url"             = ""
    "anthropic-api-key"     = ""
    "clerk-secret-key"      = ""
    "jwt-secret"            = ""
    "encryption-key"        = ""
    "internal-api-key"      = ""
    "stripe-secret-key"     = ""
    "github-client-secret"  = ""
  }
  sensitive = true
}

# Monitoring
variable "alarm_email" {
  description = "Email for CloudWatch alarms"
  type        = string
  default     = "alerts@builderai.app"
}
