# 🚀 Deployment Checklist

## Current Status: ~80% Complete

### ✅ **What's Done**

#### **Code Migration (80%)**
- [x] Shared library with models, utilities, middleware
- [x] AI Service (code generation, chat, AI models)
- [x] Auth Service (Clerk webhooks, user management)
- [x] Worker Service (autonomous agent, email worker)
- [x] API Service (projects, files, GitHub, integrations)

#### **Infrastructure as Code (85%)**
- [x] VPC with public/private subnets (2 AZs)
- [x] NAT Gateway and Internet Gateway
- [x] Application Load Balancer with target groups
- [x] ECS Fargate cluster (4 services)
- [x] S3 + CloudFront for frontend
- [x] Security groups and IAM roles
- [x] ECR repository module
- [x] ElastiCache Redis module
- [x] **Amazon Bedrock VPC Endpoint + IAM policies**

#### **DevOps (100%)**
- [x] GitHub Actions CI/CD workflow
- [x] Deployment shell script
- [x] Docker multi-stage builds
- [x] Health checks configured

---

## ❌ **What's Missing**

### **1. Missing API Routes (~20% of functionality)**

Need to migrate these routes from monolith:

#### **Security Features**
- [ ] `/api/security/scans` - GET/POST security scans
- [ ] `/api/security/scans/:scanId` - GET scan details
- [ ] `/api/projects/:id/security/scan` - Run security scan
- [ ] `/api/projects/:id/security/fix` - Auto-fix security issues

#### **API Testing Features**
- [ ] `/api/api-testing/discover` - Discover API endpoints
- [ ] `/api/api-testing/collections` - Manage API test collections
- [ ] `/api/api-testing/execute` - Execute API tests
- [ ] `/api/api-testing/history` - API test history
- [ ] `/api/api-testing/requests` - API request management

#### **Task Management**
- [ ] `/api/tasks` - GET/POST autonomous tasks
- [ ] `/api/tasks/:taskId` - GET/PATCH/DELETE task
- [ ] `/api/tasks/:taskId/stream` - Stream task progress
- [ ] `/api/tasks/:taskId/checkpoints` - Task checkpoints

#### **Project Enhancements**
- [ ] `/api/projects/:id/commit` - Commit project changes
- [ ] `/api/projects/:id/snippets` - Code snippets
- [ ] `/api/projects/:id/insights` - Project insights
- [ ] `/api/projects/:id/progress` - Development progress
- [ ] `/api/projects/:id/search` - Search within project
- [ ] `/api/projects/:id/tests/run` - Run tests

**Where to add:** Create new routes in `api-service` or potentially a new **security-service** if needed.

---

### **2. Missing Infrastructure**

#### **Database**
- [ ] Provision **MongoDB Atlas M10** cluster
  - Region: ap-south-1 (Mumbai)
  - Tier: M10 (Production) or M0 (Free tier for dev)
  - Setup: https://cloud.mongodb.com
  - Cost: ~$60/month (M10) or $0 (M0)

#### **Amazon Bedrock Setup**
- [ ] **Request model access** (One-time, required!)
  - Go to: https://ap-south-1.console.aws.amazon.com/bedrock/home?region=ap-south-1#/modelaccess
  - Request access to:
    - Anthropic Claude 3.5 Sonnet
    - Anthropic Claude 3 Haiku
    - Meta Llama 3.1 70B (optional)
  - Access granted within minutes

#### **Secrets Management**
- [ ] Create **AWS Secrets Manager** secrets:
  ```bash
  aws secretsmanager create-secret --name /builderai/prod/mongodb-uri --secret-string "mongodb+srv://..."
  aws secretsmanager create-secret --name /builderai/prod/jwt-secret --secret-string "..."
  aws secretsmanager create-secret --name /builderai/prod/internal-api-key --secret-string "..."
  aws secretsmanager create-secret --name /builderai/prod/clerk-webhook-secret --secret-string "..."
  ```

  **Note**: ~~No longer need Anthropic/OpenAI API keys~~ - We use Amazon Bedrock with IAM!

#### **Monitoring & Alerting**
- [ ] Create **CloudWatch Dashboards**
- [ ] Set up **CloudWatch Alarms**:
  - ECS service CPU > 80%
  - ECS service memory > 80%
  - ALB 5xx errors > 10/min
  - ECS task failures
- [ ] Configure **SNS topic** for alerts

#### **Auto-Scaling**
- [ ] Create **ECS Auto Scaling Policies**:
  ```hcl
  # Target tracking scaling for CPU
  resource "aws_appautoscaling_policy" "ai_service_cpu" {
    name               = "ai-service-cpu-scaling"
    policy_type        = "TargetTrackingScaling"
    resource_id        = "service/${cluster}/${service}"
    scalable_dimension = "ecs:service:DesiredCount"
    service_namespace  = "ecs"

    target_tracking_scaling_policy_configuration {
      target_value = 70.0
      predefined_metric_specification {
        predefined_metric_type = "ECSServiceAverageCPUUtilization"
      }
    }
  }
  ```

#### **Email Service**
- [ ] Verify domain in **AWS SES**
- [ ] Move out of SES sandbox (production)
- [ ] Configure DKIM/SPF records

---

### **3. Missing Configuration**

#### **Clerk Setup**
- [ ] Create Clerk application: https://clerk.com
- [ ] Configure OAuth providers (GitHub, Google)
- [ ] Set up webhook endpoint: `https://your-domain.com/api/auth/webhooks/clerk`
- [ ] Copy webhook secret to Secrets Manager

#### **Environment Variables**
Need to set in ECS task definitions (via Secrets Manager):

```bash
# All Services
MONGODB_URI=<from-secrets-manager>
REDIS_URL=<from-elasticache>
NODE_ENV=production
JWT_SECRET=<from-secrets-manager>
INTERNAL_API_KEY=<from-secrets-manager>
AWS_REGION=ap-south-1  # For Bedrock SDK

# AI Service (uses Bedrock - no API keys needed!)
# REMOVED: ANTHROPIC_API_KEY (now uses IAM role)
# REMOVED: OPENAI_API_KEY (now uses Bedrock)

# Auth Service
CLERK_WEBHOOK_SECRET=<from-secrets-manager>

# Worker Service
FROM_EMAIL=noreply@yourdomain.com
```

---

## 📋 **Step-by-Step Deployment Plan**

### **Phase 1: Infrastructure Setup (1-2 hours)**

1. **Request Bedrock Model Access** ⚠️ **REQUIRED FIRST!**
   ```bash
   # Go to AWS Console Bedrock
   https://ap-south-1.console.aws.amazon.com/bedrock/home?region=ap-south-1#/modelaccess

   # Click "Request model access"
   # Enable these models:
   - Anthropic Claude 3.5 Sonnet ✓
   - Anthropic Claude 3 Haiku ✓
   - Meta Llama 3.1 70B (optional)

   # Access granted within minutes
   ```

2. **Provision MongoDB Atlas**
   ```bash
   # Go to https://cloud.mongodb.com
   # Create M10 cluster in ap-south-1
   # Get connection string
   ```

3. **Apply Terraform Infrastructure**
   ```bash
   cd terraform
   # Includes: VPC, ECS, ALB, Bedrock VPC Endpoint, Redis, ECR
   terraform init
   terraform plan
   terraform apply
   ```

4. **Create Secrets in AWS**
   ```bash
   ./scripts/create-secrets.sh
   # Note: Only 4 secrets now (removed API keys)
   ```

5. **Verify SES Email**
   ```bash
   aws ses verify-email-identity --email-address noreply@yourdomain.com --region ap-south-1
   ```

---

### **Phase 2: Code Completion (2-4 hours)**

5. **Add Missing Routes**
   - Create `api-service/src/routes/security.ts`
   - Create `api-service/src/routes/api-testing.ts`
   - Create `api-service/src/routes/tasks.ts`
   - Update `api-service/src/routes/index.ts`

6. **Test Locally**
   ```bash
   docker-compose up
   # Test all endpoints
   ```

---

### **Phase 3: Deployment (30 mins)**

7. **Build and Push Images**
   ```bash
   ./scripts/deploy.sh
   ```

8. **Verify Deployment**
   ```bash
   # Check ECS services
   aws ecs describe-services --cluster builderai-cluster --services builderai-ai-service

   # Check ALB health
   aws elbv2 describe-target-health --target-group-arn <arn>
   ```

---

### **Phase 4: Post-Deployment (1 hour)**

9. **Configure Monitoring**
   - Create CloudWatch dashboards
   - Set up alarms
   - Test alerting

10. **Performance Testing**
    - Load test each service
    - Verify auto-scaling
    - Monitor costs

11. **Documentation**
    - Update DNS records
    - Document API endpoints
    - Create runbooks

---

## 🎯 **Quick Commands**

### **Check Current Infrastructure**
```bash
# VPC
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=builderai-vpc"

# ECS Cluster
aws ecs describe-clusters --clusters builderai-cluster

# ALB
aws elbv2 describe-load-balancers --names builderai-alb

# S3
aws s3 ls | grep builderai-frontend

# CloudFront
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`builderai frontend distribution`]'
```

### **Deploy Updates**
```bash
# Full deployment
./scripts/deploy.sh

# Update single service
aws ecs update-service --cluster builderai-cluster --service builderai-ai-service --force-new-deployment
```

### **View Logs**
```bash
# AI Service logs
aws logs tail /ecs/builderai --follow --filter-pattern "ai-service"

# All services
aws logs tail /ecs/builderai --follow
```

### **Check Service Health**
```bash
# ECS service status
aws ecs describe-services --cluster builderai-cluster --services builderai-ai-service builderai-auth-service builderai-worker-service builderai-api-service

# ALB target health
aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names builderai-ai-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
```

---

## 💰 **Final Cost Breakdown**

| Component | Monthly Cost | Status |
|-----------|--------------|--------|
| ECS Fargate (4 services) | $128 | ✅ In Terraform |
| Application Load Balancer | $22 | ✅ In Terraform |
| NAT Gateway (1x) | $32 | ✅ In Terraform (reduced from 2) |
| **Bedrock VPC Endpoint** | **$7** | ✅ **Now in Terraform** |
| S3 + CloudFront | $5 | ✅ In Terraform |
| **MongoDB Atlas M10** | **$60** | ❌ **Need to provision** |
| **ElastiCache Redis** | **$15** | ✅ **Now in Terraform** |
| Secrets Manager | $1 | ❌ Need to create (4 secrets, reduced from 6) |
| CloudWatch Logs | $5 | ✅ Included |
| **Total** | **~$275/month** | **$27 savings from Bedrock!** |

**Cost Optimization with Bedrock**:
- Reduced NAT Gateway from 2 to 1: **-$33/month**
- Added Bedrock VPC Endpoint: **+$7/month**
- Removed 2 secrets (API keys): **-$0.80/month**
- **Net Savings: ~$27/month**

---

## ✅ **Completion Criteria**

Migration is 100% complete when:

- [x] All 4 ECS services deployed and healthy
- [x] Frontend on CloudFront serving traffic
- [ ] All API routes responding (87 total endpoints)
- [ ] MongoDB Atlas connected and operational
- [ ] Redis cluster connected and operational
- [ ] Clerk webhooks receiving events
- [ ] Auto-scaling policies active
- [ ] CloudWatch alarms configured
- [ ] All secrets in Secrets Manager
- [ ] SES verified and sending emails
- [ ] Load testing passed
- [ ] Documentation complete

**Current Progress: 80% → Target: 100%**

---

## 🆘 **Troubleshooting**

### **Service won't start**
```bash
# Check task logs
aws ecs describe-tasks --cluster builderai-cluster --tasks <task-id>

# Check CloudWatch logs
aws logs tail /ecs/builderai --since 10m
```

### **Database connection fails**
```bash
# Test from within VPC
aws ecs execute-command --cluster builderai-cluster --task <task-id> --command "/bin/sh"
# Then: curl mongodb://...
```

### **Redis connection fails**
```bash
# Check security group allows 6379 from ECS
aws ec2 describe-security-groups --group-ids <redis-sg-id>
```

---

**Next Step:** Complete Phase 1 (Infrastructure Setup) to get to 100% production readiness.
