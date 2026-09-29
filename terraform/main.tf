# Terraform Configuration for Codstack Microservices
# AWS ECS Fargate Deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration - S3 with state locking
  backend "s3" {
    bucket         = "builderai-terraform-state"
    key            = "microservices/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "builderai-terraform-locks"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "Codstack"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Local variables
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Terraform   = "true"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# ECR Repository for Docker Images
module "ecr" {
  source = "./modules/ecr"

  repository_name = "${var.project_name}-services"
  environment     = var.environment
}

# Amazon Bedrock with VPC Endpoint
module "bedrock" {
  source = "./modules/bedrock"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  private_subnet_cidrs = var.private_subnet_cidrs
}

# AWS CodePipeline for CI/CD
module "codepipeline" {
  source = "./modules/codepipeline"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  ecr_repository_url    = module.ecr.repository_url
  github_connection_arn = "arn:aws:codestar-connections:ap-south-1:120594650992:connection/5bbe391e-7ecf-4fc3-9e4f-61f99cb4b129"
  github_repository     = "aneeshneurasix/buildrai-micro"
  github_branch         = "main"
}

# Commenting out modules with dependencies - will deploy in phases
# Phase 1: VPC + ECR + Bedrock + CodePipeline (essentials + CI/CD)
# Phase 2: Redis + ECS + ALB (requires Docker images in ECR)

# # ElastiCache Redis
# module "redis" {
#   source = "./modules/redis"
#   ...
# }
#
# Once we have Docker images in ECR, we'll enable ECS and ALB

# # ECS Cluster
# module "ecs" {
#   source = "./modules/ecs"
#   ...
# }
#
# # Application Load Balancer
# module "alb" {
#   source = "./modules/alb"
#   ...
# }
#
# # S3 + CloudFront for Frontend
# module "s3_cloudfront" {
#   source = "./modules/s3-cloudfront"
#   ...
# }

# Secrets Manager - Secrets already created manually via AWS CLI
# module "secrets" {
#   source = "./modules/secrets"
#
#   name_prefix = local.name_prefix
#   secrets     = var.secrets_config
#
#   tags = local.common_tags
# }

# CloudWatch Monitoring - Basic monitoring via ECS Container Insights
# Can be enhanced with custom dashboards later
# module "monitoring" {
#   source = "./modules/monitoring"
#
#   name_prefix  = local.name_prefix
#   cluster_name = module.ecs.cluster_name
#   services     = keys(var.ecs_services)
#
#   alarm_email = var.alarm_email
#
#   tags = local.common_tags
# }

# Outputs - Phase 1
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private Subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public Subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "ecr_repository_url" {
  description = "ECR Repository URL for Docker images"
  value       = module.ecr.repository_url
}

output "bedrock_vpc_endpoint_id" {
  description = "Bedrock VPC Endpoint ID"
  value       = module.bedrock.vpc_endpoint_id
}

output "bedrock_policy_arn" {
  description = "IAM Policy ARN for Bedrock access"
  value       = module.bedrock.bedrock_access_policy_arn
}

output "pipeline_name" {
  description = "CodePipeline name"
  value       = module.codepipeline.pipeline_name
}

output "pipeline_arn" {
  description = "CodePipeline ARN"
  value       = module.codepipeline.pipeline_arn
}

output "codebuild_project_name" {
  description = "CodeBuild project name"
  value       = module.codepipeline.codebuild_project_name
}

output "artifacts_bucket" {
  description = "S3 bucket for CodePipeline artifacts"
  value       = module.codepipeline.artifacts_bucket
}

# Phase 2 outputs (commented for now)
# output "redis_endpoint" {
#   value = module.redis.redis_connection_string
# }
# output "alb_dns_name" {
#   value = module.alb.dns_name
# }
