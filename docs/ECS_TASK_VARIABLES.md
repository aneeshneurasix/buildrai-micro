# ECS Task Definitions & Environment Variables

Complete reference for all ECS task configurations and environment variables.

---

## 🎯 Task Definition Overview

| Service | Task CPU | Task Memory | Container Port | Desired Count | Max Count | Health Check |
|---------|----------|-------------|----------------|---------------|-----------|--------------|
| AI Service | 2048 (2 vCPU) | 4096 MB | 4000 | 2 | 10 | /api/health |
| Auth Service | 512 (0.5 vCPU) | 1024 MB | 4001 | 2 | 6 | /api/health |
| Worker Service | 1024 (1 vCPU) | 2048 MB | - | 2 | 4 | N/A (queue) |
| API Service | 1024 (1 vCPU) | 2048 MB | 3001 | 2 | 8 | /api/health |

---

## 📦 AI Service Task Definition

### Task Configuration
```json
{
  "family": "codstack-ai-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/codstack-ai-service-task-role"
}
```

### Container Definition
```json
{
  "name": "ai-service",
  "image": "ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/codstack-ai-service:latest",
  "portMappings": [
    {
      "containerPort": 4000,
      "protocol": "tcp"
    }
  ],
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:4000/api/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=4000
SERVICE_NAME=ai-service
LOG_LEVEL=info

# Database
MONGODB_URI=<from-secrets-manager>
REDIS_URL=<from-secrets-manager>

# AI APIs
ANTHROPIC_API_KEY=<from-secrets-manager>
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_API_KEY=<from-secrets-manager>  # Optional fallback

# AI Configuration
MAX_TOKENS=8192
TEMPERATURE=0.7
STREAMING_ENABLED=true
CONTEXT_WINDOW_SIZE=200000
TOKEN_OPTIMIZATION_ENABLED=true

# Caching
RESPONSE_CACHE_TTL=3600
CACHE_AI_RESPONSES=true

# Rate Limiting
AI_RATE_LIMIT_PER_MINUTE=30
AI_RATE_LIMIT_PER_HOUR=500

# Service Communication
AUTH_SERVICE_URL=http://auth-service.codstack.local:4001
API_SERVICE_URL=http://api-service.codstack.local:3001
INTERNAL_API_KEY=<from-secrets-manager>

# Security
JWT_SECRET=<from-secrets-manager>
ENCRYPTION_KEY=<from-secrets-manager>

# Monitoring
AWS_REGION=ap-south-1
CLOUDWATCH_NAMESPACE=Codstack/AI-Service
ENABLE_XRAY=true

# Cost Tracking
TRACK_TOKEN_USAGE=true
TRACK_COSTS=true
```

### Secrets (from AWS Secrets Manager)
```json
{
  "secrets": [
    {
      "name": "MONGODB_URI",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/mongodb-uri"
    },
    {
      "name": "REDIS_URL",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/redis-url"
    },
    {
      "name": "ANTHROPIC_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/anthropic-api-key"
    },
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/jwt-secret"
    },
    {
      "name": "ENCRYPTION_KEY",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/encryption-key"
    },
    {
      "name": "INTERNAL_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/internal-api-key"
    }
  ]
}
```

### Resource Limits
```json
{
  "ulimits": [
    {
      "name": "nofile",
      "softLimit": 65536,
      "hardLimit": 65536
    }
  ]
}
```

---

## 🔐 Auth Service Task Definition

### Task Configuration
```json
{
  "family": "codstack-auth-service",
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/codstack-auth-service-task-role"
}
```

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=4001
SERVICE_NAME=auth-service
LOG_LEVEL=info

# Database
MONGODB_URI=<from-secrets-manager>
REDIS_URL=<from-secrets-manager>

# Clerk Authentication
CLERK_SECRET_KEY=<from-secrets-manager>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from-secrets-manager>
CLERK_WEBHOOK_SECRET=<from-secrets-manager>

# JWT
JWT_SECRET=<from-secrets-manager>
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Session Management
SESSION_TTL=604800
SESSION_STORE=redis
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# Rate Limiting
AUTH_RATE_LIMIT_PER_MINUTE=20
AUTH_RATE_LIMIT_PER_HOUR=100

# Service Communication
API_SERVICE_URL=http://api-service.codstack.local:3001
INTERNAL_API_KEY=<from-secrets-manager>

# Security
ENCRYPTION_KEY=<from-secrets-manager>
BCRYPT_ROUNDS=12

# Subscription & Usage
STRIPE_SECRET_KEY=<from-secrets-manager>
STRIPE_WEBHOOK_SECRET=<from-secrets-manager>

# Monitoring
AWS_REGION=ap-south-1
CLOUDWATCH_NAMESPACE=Codstack/Auth-Service
```

### Secrets
```json
{
  "secrets": [
    {
      "name": "MONGODB_URI",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/mongodb-uri"
    },
    {
      "name": "CLERK_SECRET_KEY",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/clerk-secret-key"
    },
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/jwt-secret"
    },
    {
      "name": "STRIPE_SECRET_KEY",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:codstack/stripe-secret-key"
    }
  ]
}
```

---

## ⚙️ Worker Service Task Definition

### Task Configuration
```json
{
  "family": "codstack-worker-service",
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/codstack-worker-service-task-role"
}
```

### Environment Variables
```bash
# Application
NODE_ENV=production
SERVICE_NAME=worker-service
LOG_LEVEL=info
WORKER_CONCURRENCY=5

# Database
MONGODB_URI=<from-secrets-manager>
REDIS_URL=<from-secrets-manager>

# Queue Configuration
QUEUE_NAME=codstack-tasks
QUEUE_CONCURRENCY=3
QUEUE_MAX_JOBS=10
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=60000

# AI Service (for autonomous agent)
AI_SERVICE_URL=http://ai-service.codstack.local:4000
ANTHROPIC_API_KEY=<from-secrets-manager>

# Email (SES)
AWS_REGION=ap-south-1
SES_FROM_EMAIL=noreply@codstack.com
SES_REPLY_TO=support@codstack.com
EMAIL_QUEUE_CONCURRENCY=5

# Service Communication
AUTH_SERVICE_URL=http://auth-service.codstack.local:4001
API_SERVICE_URL=http://api-service.codstack.local:3001
INTERNAL_API_KEY=<from-secrets-manager>

# Security
JWT_SECRET=<from-secrets-manager>
ENCRYPTION_KEY=<from-secrets-manager>

# Autonomous Agent
AGENT_MAX_ITERATIONS=50
AGENT_TIMEOUT=3600000
AGENT_CHECKPOINT_INTERVAL=300000

# Monitoring
CLOUDWATCH_NAMESPACE=Codstack/Worker-Service
ENABLE_METRICS=true
```

### IAM Permissions (Task Role)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-south-1:ACCOUNT:codstack-tasks"
    }
  ]
}
```

---

## 🌐 API Service Task Definition

### Task Configuration
```json
{
  "family": "codstack-api-service",
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/codstack-api-service-task-role"
}
```

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3001
SERVICE_NAME=api-service
LOG_LEVEL=info

# Database
MONGODB_URI=<from-secrets-manager>
REDIS_URL=<from-secrets-manager>

# AWS Services
AWS_REGION=ap-south-1
S3_BUCKET_UPLOADS=codstack-user-uploads
S3_BUCKET_STATIC=codstack-static-assets

# GitHub Integration
GITHUB_CLIENT_ID=<from-secrets-manager>
GITHUB_CLIENT_SECRET=<from-secrets-manager>
GITHUB_CALLBACK_URL=https://api.codstack.com/api/integrations/github/callback

# Bitbucket Integration
BITBUCKET_CLIENT_ID=<from-secrets-manager>
BITBUCKET_CLIENT_SECRET=<from-secrets-manager>

# Azure DevOps Integration
AZURE_CLIENT_ID=<from-secrets-manager>
AZURE_CLIENT_SECRET=<from-secrets-manager>

# Service Communication
AUTH_SERVICE_URL=http://auth-service.codstack.local:4001
AI_SERVICE_URL=http://ai-service.codstack.local:4000
INTERNAL_API_KEY=<from-secrets-manager>

# Security
JWT_SECRET=<from-secrets-manager>
ENCRYPTION_KEY=<from-secrets-manager>

# Rate Limiting
API_RATE_LIMIT_PER_MINUTE=100
API_RATE_LIMIT_PER_HOUR=1000

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.js,.ts,.jsx,.tsx,.py,.java,.go,.rs,.md,.json,.yaml,.yml

# Monitoring
CLOUDWATCH_NAMESPACE=Codstack/API-Service
ENABLE_XRAY=true
```

### IAM Permissions (Task Role)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::codstack-user-uploads/*",
        "arn:aws:s3:::codstack-static-assets/*"
      ]
    }
  ]
}
```

---

## 🌍 Global Environment Variables

These are shared across all services:

```bash
# Environment
NODE_ENV=production
AWS_REGION=ap-south-1
TZ=Asia/Kolkata

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_TIMESTAMPS=true

# Monitoring
ENABLE_CLOUDWATCH=true
ENABLE_XRAY=false
METRICS_INTERVAL=60000

# Security
CORS_ORIGIN=https://codstack.com,https://www.codstack.com
ALLOWED_HOSTS=codstack.com,www.codstack.com,api.codstack.com
TRUST_PROXY=true

# Database Connection Pool
MONGODB_MIN_POOL_SIZE=5
MONGODB_MAX_POOL_SIZE=50
MONGODB_CONNECT_TIMEOUT=10000

# Redis Configuration
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000
REDIS_KEY_PREFIX=codstack:

# Service Discovery
SERVICE_DISCOVERY_NAMESPACE=codstack.local
```

---

## 🔧 Auto Scaling Configuration

### AI Service (CPU-based)
```json
{
  "targetTrackingScaling": {
    "targetValue": 70.0,
    "predefinedMetricSpecification": {
      "predefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "scaleInCooldown": 300,
    "scaleOutCooldown": 60
  }
}
```

### Auth Service (Request-based)
```json
{
  "targetTrackingScaling": {
    "targetValue": 1000.0,
    "predefinedMetricSpecification": {
      "predefinedMetricType": "ALBRequestCountPerTarget"
    },
    "scaleInCooldown": 300,
    "scaleOutCooldown": 60
  }
}
```

---

## 📊 CloudWatch Log Configuration

All services use the same log configuration:

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/codstack-{service-name}",
      "awslogs-region": "ap-south-1",
      "awslogs-stream-prefix": "ecs",
      "awslogs-datetime-format": "%Y-%m-%d %H:%M:%S"
    }
  }
}
```

---

## 🔒 Secrets Manager Structure

```
codstack/mongodb-uri              - MongoDB Atlas connection string
codstack/redis-url                - ElastiCache Redis endpoint
codstack/anthropic-api-key        - Claude API key
codstack/openai-api-key           - OpenAI API key (optional)
codstack/clerk-secret-key         - Clerk secret
codstack/clerk-publishable-key    - Clerk public key
codstack/clerk-webhook-secret     - Clerk webhook secret
codstack/jwt-secret               - JWT signing key
codstack/encryption-key           - AES-256 encryption key
codstack/internal-api-key         - Service-to-service auth
codstack/stripe-secret-key        - Stripe secret
codstack/stripe-webhook-secret    - Stripe webhook secret
codstack/github-client-id         - GitHub OAuth client ID
codstack/github-client-secret     - GitHub OAuth secret
codstack/bitbucket-client-id      - Bitbucket OAuth client ID
codstack/bitbucket-client-secret  - Bitbucket OAuth secret
codstack/azure-client-id          - Azure OAuth client ID
codstack/azure-client-secret      - Azure OAuth secret
```

---

## 🚀 Deployment Commands

### Update Task Definition
```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definitions/ai-service.json \
  --region ap-south-1
```

### Update Service
```bash
aws ecs update-service \
  --cluster codstack-cluster \
  --service codstack-ai-service \
  --task-definition codstack-ai-service:REVISION \
  --force-new-deployment \
  --region ap-south-1
```

### View Task Logs
```bash
aws logs tail /ecs/codstack-ai-service --follow --region ap-south-1
```

---

**Last Updated**: 2026-09-28
