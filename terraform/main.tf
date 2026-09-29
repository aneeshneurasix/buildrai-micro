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

  backend "s3" {
    bucket         = "codstack-terraform-state"
    key            = "microservices/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "codstack-terraform-locks"
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

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  tags = local.common_tags
}

# Amazon Bedrock with VPC Endpoint (before ECS to provide IAM policy)
module "bedrock" {
  source = "./modules/bedrock"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  private_subnet_cidrs = var.private_subnet_cidrs
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id

  # Subnets
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  # Bedrock permissions
  bedrock_policy_arn = module.bedrock.bedrock_access_policy_arn

  # Services configuration
  services = var.ecs_services

  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids

  # SSL Certificate
  certificate_arn = var.acm_certificate_arn

  # Target groups
  target_groups = var.alb_target_groups

  tags = local.common_tags
}

# S3 + CloudFront for Frontend
module "s3_cloudfront" {
  source = "./modules/s3-cloudfront"

  name_prefix     = local.name_prefix
  domain_name     = var.domain_name
  certificate_arn = var.acm_certificate_arn

  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  node_type = var.redis_node_type

  tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix
  secrets     = var.secrets_config

  tags = local.common_tags
}

# CloudWatch Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix  = local.name_prefix
  cluster_name = module.ecs.cluster_name
  services     = keys(var.ecs_services)

  alarm_email = var.alarm_email

  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = module.ecs.cluster_name
}

output "alb_dns_name" {
  description = "ALB DNS Name"
  value       = module.alb.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront Distribution Domain"
  value       = module.s3_cloudfront.cloudfront_domain
}

output "redis_endpoint" {
  description = "Redis Endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "bedrock_vpc_endpoint_id" {
  description = "Bedrock VPC Endpoint ID"
  value       = module.bedrock.vpc_endpoint_id
}

output "bedrock_policy_arn" {
  description = "IAM Policy ARN for Bedrock access"
  value       = module.bedrock.bedrock_access_policy_arn
}
