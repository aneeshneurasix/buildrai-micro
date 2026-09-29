# Getting Started with BuildeRAI Microservices

Complete guide to set up and deploy the BuildeRAI microservices architecture.

---

## 📋 Prerequisites

### Required Software
- **Node.js** 20.x or higher
- **Docker** & **Docker Compose**
- **AWS CLI** configured with `aneesh-personal` profile
- **Terraform** 1.0+
- **Git**

### AWS Resources Needed
- AWS Account with programmatic access
- Domain name (for SSL certificate)
- MongoDB Atlas account (or AWS DocumentDB)

---

## 🚀 Quick Start (Local Development)

### 1. Clone and Setup

```bash
cd builderai-microservice

# Install shared library
cd shared
npm install
npm run build
cd ..

# Install all services
for service in ai-service auth-service worker-service api-service frontend; do
  cd $service
  npm install
  cd ..
done
```

### 2. Configure Environment Variables

```bash
# Copy global environment file
cp .env.example .env.local

# Copy service-specific env files
cp ai-service/.env.example ai-service/.env
cp auth-service/.env.example auth-service/.env
cp worker-service/.env.example worker-service/.env
cp api-service/.env.example api-service/.env
cp frontend/.env.example frontend/.env.local

# Edit .env.local and add your credentials
# IMPORTANT: Add your API keys (Anthropic, Clerk, Stripe, etc.)
```

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up --build

# Or start individual services
docker-compose up ai-service
docker-compose up auth-service
```

### 4. Access Services

- **Frontend**: http://localhost:3000
- **AI Service**: http://localhost:4000/api/health
- **Auth Service**: http://localhost:4001/api/health
- **API Service**: http://localhost:3001/api/health
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

---

## 🏗️ Production Deployment

### Phase 1: AWS Infrastructure Setup

#### Step 1: Create S3 Bucket for Terraform State

```bash
aws s3api create-bucket \
  --bucket codstack-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1 \
  --profile aneesh-personal

aws s3api put-bucket-versioning \
  --bucket codstack-terraform-state \
  --versioning-configuration Status=Enabled \
  --profile aneesh-personal

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name codstack-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1 \
  --profile aneesh-personal
```

#### Step 2: Request SSL Certificate

```bash
# Request ACM certificate
aws acm request-certificate \
  --domain-name codstack.com \
  --subject-alternative-names *.codstack.com \
  --validation-method DNS \
  --region ap-south-1 \
  --profile aneesh-personal

# Note the CertificateArn from output
# Add DNS validation records to Route 53

# Wait for validation
aws acm describe-certificate \
  --certificate-arn YOUR_CERTIFICATE_ARN \
  --region ap-south-1 \
  --profile aneesh-personal
```

#### Step 3: Store Secrets in Secrets Manager

```bash
# MongoDB URI
aws secretsmanager create-secret \
  --name codstack/mongodb-uri \
  --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/codstack" \
  --region ap-south-1 \
  --profile aneesh-personal

# Anthropic API Key
aws secretsmanager create-secret \
  --name codstack/anthropic-api-key \
  --secret-string "your-anthropic-api-key" \
  --region ap-south-1 \
  --profile aneesh-personal

# Clerk Keys
aws secretsmanager create-secret \
  --name codstack/clerk-secret-key \
  --secret-string "your-clerk-secret-key" \
  --region ap-south-1 \
  --profile aneesh-personal

# JWT Secret
aws secretsmanager create-secret \
  --name codstack/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region ap-south-1 \
  --profile aneesh-personal

# Encryption Key
aws secretsmanager create-secret \
  --name codstack/encryption-key \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-south-1 \
  --profile aneesh-personal

# Internal API Key
aws secretsmanager create-secret \
  --name codstack/internal-api-key \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-south-1 \
  --profile aneesh-personal

# Stripe Keys
aws secretsmanager create-secret \
  --name codstack/stripe-secret-key \
  --secret-string "your-stripe-secret-key" \
  --region ap-south-1 \
  --profile aneesh-personal

# GitHub OAuth
aws secretsmanager create-secret \
  --name codstack/github-client-secret \
  --secret-string "your-github-client-secret" \
  --region ap-south-1 \
  --profile aneesh-personal
```

#### Step 4: Deploy Infrastructure with Terraform

```bash
cd terraform

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_profile         = "aneesh-personal"
aws_region          = "ap-south-1"
project_name        = "codstack"
environment         = "prod"
domain_name         = "codstack.com"
acm_certificate_arn = "arn:aws:acm:ap-south-1:ACCOUNT:certificate/CERT_ID"
alarm_email         = "your-email@example.com"
EOF

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply (create infrastructure)
terraform apply

# Save outputs
terraform output > outputs.txt
```

### Phase 2: Build and Push Docker Images

#### Create ECR Repositories

```bash
# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile aneesh-personal)
AWS_REGION=ap-south-1

# Create ECR repositories
for service in ai-service auth-service worker-service api-service; do
  aws ecr create-repository \
    --repository-name codstack-${service} \
    --region $AWS_REGION \
    --profile aneesh-personal \
    --image-scanning-configuration scanOnPush=true
done
```

#### Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 --profile aneesh-personal | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

# Build and push each service
cd builderai-microservice

# AI Service
cd ai-service
docker build -t codstack-ai-service .
docker tag codstack-ai-service:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-ai-service:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-ai-service:latest
cd ..

# Auth Service
cd auth-service
docker build -t codstack-auth-service .
docker tag codstack-auth-service:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-auth-service:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-auth-service:latest
cd ..

# Worker Service
cd worker-service
docker build -t codstack-worker-service .
docker tag codstack-worker-service:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-worker-service:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-worker-service:latest
cd ..

# API Service
cd api-service
docker build -t codstack-api-service .
docker tag codstack-api-service:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-api-service:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-api-service:latest
cd ..
```

### Phase 3: Deploy Frontend to S3 + CloudFront

```bash
cd frontend

# Set environment variables for build
export BUILD_MODE=static
export NEXT_PUBLIC_API_URL=https://api.codstack.com
export NEXT_PUBLIC_AI_SERVICE_URL=https://api.codstack.com

# Build static export
npm run build:static

# Get S3 bucket name from Terraform output
S3_BUCKET=$(terraform -chdir=../terraform output -raw frontend_bucket_name)

# Deploy to S3
aws s3 sync out/ s3://$S3_BUCKET --delete --profile aneesh-personal

# Get CloudFront distribution ID
CLOUDFRONT_ID=$(terraform -chdir=../terraform output -raw cloudfront_distribution_id)

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*" \
  --profile aneesh-personal
```

### Phase 4: Deploy ECS Services

```bash
# Force new deployment for all services
for service in ai-service auth-service worker-service api-service; do
  aws ecs update-service \
    --cluster codstack-prod-cluster \
    --service codstack-${service} \
    --force-new-deployment \
    --region ap-south-1 \
    --profile aneesh-personal
done

# Wait for services to stabilize
aws ecs wait services-stable \
  --cluster codstack-prod-cluster \
  --services codstack-ai-service codstack-auth-service codstack-api-service \
  --region ap-south-1 \
  --profile aneesh-personal
```

### Phase 5: Verify Deployment

```bash
# Check service health
curl https://api.codstack.com/api/health

# Check ECS tasks
aws ecs list-tasks \
  --cluster codstack-prod-cluster \
  --region ap-south-1 \
  --profile aneesh-personal

# Check logs
aws logs tail /ecs/codstack-ai-service --follow --region ap-south-1 --profile aneesh-personal
```

---

## 🔧 Common Operations

### View Logs

```bash
# AI Service logs
aws logs tail /ecs/codstack-ai-service --follow --region ap-south-1 --profile aneesh-personal

# Auth Service logs
aws logs tail /ecs/codstack-auth-service --follow --region ap-south-1 --profile aneesh-personal

# Filter logs
aws logs tail /ecs/codstack-ai-service --filter-pattern "ERROR" --region ap-south-1 --profile aneesh-personal
```

### Scale Services

```bash
# Scale AI service to 5 tasks
aws ecs update-service \
  --cluster codstack-prod-cluster \
  --service codstack-ai-service \
  --desired-count 5 \
  --region ap-south-1 \
  --profile aneesh-personal
```

### Update a Service

```bash
# Build new image
docker build -t codstack-ai-service .
docker tag codstack-ai-service:latest $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-ai-service:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/codstack-ai-service:latest

# Force deployment
aws ecs update-service \
  --cluster codstack-prod-cluster \
  --service codstack-ai-service \
  --force-new-deployment \
  --region ap-south-1 \
  --profile aneesh-personal
```

### Rollback

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix codstack-ai-service \
  --region ap-south-1 \
  --profile aneesh-personal

# Update to previous task definition
aws ecs update-service \
  --cluster codstack-prod-cluster \
  --service codstack-ai-service \
  --task-definition codstack-ai-service:42 \
  --region ap-south-1 \
  --profile aneesh-personal
```

---

## 📊 Monitoring

### CloudWatch Dashboard

Access: https://console.aws.amazon.com/cloudwatch/

**Key Metrics to Monitor**:
- ECS CPU & Memory utilization
- ALB request count & latency
- Error rates (4xx, 5xx)
- AI token usage
- Database connections

### Set Up Alerts

Terraform automatically creates alarms for:
- Service health check failures
- High CPU/Memory usage
- High error rates
- High response times

Alerts are sent to the email specified in `alarm_email` variable.

---

## 🔒 Security Checklist

- [ ] All secrets stored in AWS Secrets Manager
- [ ] No hardcoded credentials in code
- [ ] ECS tasks in private subnets
- [ ] Security groups configured with least privilege
- [ ] HTTPS enforced everywhere (TLS 1.3)
- [ ] MongoDB connection encrypted
- [ ] Redis connection encrypted
- [ ] Container running as non-root user
- [ ] WAF configured on ALB
- [ ] CloudWatch logging enabled

---

## 💰 Cost Optimization Tips

1. **Use Fargate Spot** for non-critical workloads (70% discount)
2. **Right-size tasks** - Monitor and adjust CPU/Memory
3. **Enable auto-scaling** - Scale down during low traffic
4. **Use CloudFront** for static content caching
5. **Set S3 lifecycle policies** - Move old files to Glacier
6. **Review NAT Gateway usage** - Biggest fixed cost

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check task status
aws ecs describe-tasks \
  --cluster codstack-prod-cluster \
  --tasks TASK_ARN \
  --region ap-south-1 \
  --profile aneesh-personal

# Check stopped reason
aws ecs describe-tasks \
  --cluster codstack-prod-cluster \
  --tasks TASK_ARN \
  --query 'tasks[0].stoppedReason' \
  --region ap-south-1 \
  --profile aneesh-personal
```

### Can't Connect to Database

- Check security group allows traffic from ECS tasks
- Verify MongoDB Atlas IP whitelist includes NAT Gateway IPs
- Test connection from ECS task using AWS Systems Manager Session Manager

### High Costs

- Review CloudWatch cost explorer
- Check NAT Gateway data transfer
- Review ECS task CPU/Memory allocation
- Check if auto-scaling is working properly

---

## 📚 Next Steps

1. Set up CI/CD with GitHub Actions
2. Configure custom domain in Route 53
3. Enable X-Ray for distributed tracing
4. Set up log aggregation and analysis
5. Implement blue/green deployments
6. Add integration tests
7. Set up staging environment

---

## 🤝 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@codstack.com

---

**Last Updated**: 2026-09-28
