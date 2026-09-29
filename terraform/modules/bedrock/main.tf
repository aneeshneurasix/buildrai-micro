/**
 * Amazon Bedrock Configuration Module
 * Enables model access and creates VPC endpoints for private connectivity
 */

# Note: Model access must be requested in Bedrock console first
# Go to AWS Console → Bedrock → Model access → Request access

# VPC Endpoint for Bedrock Runtime (for private connectivity from ECS)
resource "aws_vpc_endpoint" "bedrock_runtime" {
  vpc_id             = var.vpc_id
  service_name       = "com.amazonaws.${var.aws_region}.bedrock-runtime"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.bedrock_endpoint.id]

  private_dns_enabled = true

  tags = {
    Name        = "${var.project_name}-bedrock-runtime-endpoint"
    Environment = var.environment
  }
}

# Security group for Bedrock VPC endpoint
resource "aws_security_group" "bedrock_endpoint" {
  name        = "${var.project_name}-bedrock-endpoint-sg"
  description = "Security group for Bedrock VPC endpoint"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS from ECS tasks"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-bedrock-endpoint-sg"
    Environment = var.environment
  }
}

# IAM policy for Bedrock access (attach to ECS task role)
resource "aws_iam_policy" "bedrock_access" {
  name        = "${var.project_name}-bedrock-access-policy"
  description = "Allow ECS tasks to invoke Bedrock models"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          # Anthropic Claude models
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-opus-20240229-v1:0",

          # Meta Llama models (alternative)
          "arn:aws:bedrock:${var.aws_region}::foundation-model/meta.llama3-1-70b-instruct-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/meta.llama3-1-8b-instruct-v1:0"
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-bedrock-access"
    Environment = var.environment
  }
}
