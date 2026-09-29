# Amazon Bedrock Migration - Summary

## What Changed?

We've **upgraded from direct Anthropic/OpenAI API calls to Amazon Bedrock** for all AI functionality in the BuildeRAI platform.

---

## Why This is Better

### **1. Cost Savings: ~$27/month**

| Before | After | Savings |
|--------|-------|---------|
| 2x NAT Gateway ($65) | 1x NAT Gateway ($32) | **-$33** |
| No VPC Endpoint | Bedrock VPC Endpoint ($7) | **+$7** |
| 6 Secrets Manager | 4 Secrets Manager ($1) | **-$0.80** |
| **Total: $302/mo** | **Total: $275/mo** | **-$27/mo** |

### **2. Better Security**
- ❌ **Before**: API keys stored in Secrets Manager, leaked if compromised
- ✅ **After**: IAM role-based auth, no API keys needed, automatic credential rotation

### **3. Private Connectivity**
- ❌ **Before**: ECS tasks → NAT Gateway → Internet → Anthropic
- ✅ **After**: ECS tasks → VPC Endpoint → Bedrock (all private, within AWS network)

### **4. Unified Billing**
- ❌ **Before**: Separate bills from AWS, Anthropic, potentially OpenAI
- ✅ **After**: Single AWS bill for everything

### **5. Native Monitoring**
- ❌ **Before**: Custom CloudWatch metrics, manual tracking
- ✅ **After**: Built-in CloudWatch metrics for Bedrock (invocations, latency, errors)

### **6. More Model Options**
- ❌ **Before**: Only Anthropic Claude (or separate OpenAI contract)
- ✅ **After**: Anthropic Claude + Meta Llama + Cohere + AI21 (all in one place)

---

## What AWS Services Are Used for AI?

### **Core AI Infrastructure**

1. **Amazon Bedrock** - AI model hosting
   - Hosts Claude 3.5 Sonnet, Claude 3 Haiku, Llama 3.1
   - Pay-per-token pricing (same as Anthropic direct)
   - Cost: Variable based on usage

2. **VPC Endpoint** - Private connectivity to Bedrock
   - Interface endpoint in private subnets
   - Eliminates need for NAT Gateway for AI calls
   - Cost: $7/month

3. **IAM Policies** - Authentication & authorization
   - `bedrock:InvokeModel` permission attached to ECS task role
   - No API keys needed
   - Cost: Free

4. **ECS Fargate** - Runs the AI service
   - 2 vCPU, 4GB RAM per task
   - Auto-scaling 2-10 tasks
   - Cost: $64/month

5. **ElastiCache Redis** - Caching AI responses
   - Reduces duplicate AI calls
   - Saves token costs
   - Cost: $15/month

6. **CloudWatch** - Monitoring & logging
   - Bedrock metrics (invocations, latency)
   - AI service logs
   - Cost: $5/month

7. **Application Load Balancer** - Routes AI requests
   - Path-based routing (/api/ai/*, /api/generate/*)
   - Health checks
   - Cost: $22/month (shared)

### **Supporting Services**

8. **NAT Gateway** - For other internet access
   - Still needed for GitHub API, Clerk webhooks, etc.
   - Reduced from 2 to 1 (Bedrock uses VPC endpoint instead)
   - Cost: $32/month

9. **MongoDB Atlas** (external) - Stores chat history, user data
   - Chat sessions, project knowledge, user usage
   - Cost: $60/month

10. **Secrets Manager** - Stores MongoDB URI, JWT secret, etc.
    - Reduced from 6 secrets to 4 (no API keys!)
    - Cost: $1/month

---

## Technical Changes Made

### **1. Updated Code**

**File**: `ai-service/src/lib/client.ts`

**Before**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // API key from Secrets Manager
});
```

**After**:
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: 'ap-south-1'
  // Credentials auto-loaded from ECS task IAM role - no API key!
});
```

### **2. Updated Dependencies**

**File**: `ai-service/package.json`

**Removed**:
- `@anthropic-ai/sdk`
- `openai`

**Added**:
- `@aws-sdk/client-bedrock-runtime`

### **3. New Terraform Module**

**Created**: `terraform/modules/bedrock/`
- VPC endpoint for Bedrock Runtime
- Security group for endpoint
- IAM policy for ECS tasks
- Model access configuration

### **4. Updated IAM Permissions**

ECS task role now has:
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": [
    "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-5-sonnet-*"
  ]
}
```

### **5. Environment Variables**

**Removed**:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

**Added**:
- `AWS_REGION=ap-south-1`

---

## Available AI Models

All accessible through Amazon Bedrock:

### **Anthropic Claude (Primary)**

| Model | Bedrock Model ID | Use Case | Cost |
|-------|------------------|----------|------|
| **Claude 3.5 Sonnet** | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Code generation, complex tasks | $3 in / $15 out per 1M tokens |
| **Claude 3 Haiku** | `anthropic.claude-3-haiku-20240307-v1:0` | Fast responses, simple tasks | $0.25 in / $1.25 out per 1M tokens |
| **Claude 3 Opus** | `anthropic.claude-3-opus-20240229-v1:0` | Most powerful, highest quality | $15 in / $75 out per 1M tokens |

### **Meta Llama (Backup/Alternative)**

| Model | Bedrock Model ID | Use Case | Cost |
|-------|------------------|----------|------|
| **Llama 3.1 70B** | `meta.llama3-1-70b-instruct-v1:0` | Open-source alternative | Cheaper than Claude |
| **Llama 3.1 8B** | `meta.llama3-1-8b-instruct-v1:0` | Very fast, low cost | Cheapest option |

---

## What You Need to Do

### **1. Request Bedrock Model Access** ⚠️ **REQUIRED!**

This is a **one-time manual step** in AWS Console:

```
1. Go to: https://ap-south-1.console.aws.amazon.com/bedrock/home?region=ap-south-1#/modelaccess
2. Click "Request model access"
3. Enable these models:
   ✓ Anthropic Claude 3.5 Sonnet
   ✓ Anthropic Claude 3 Haiku
   ✓ Meta Llama 3.1 70B (optional)
4. Submit request
5. Access granted within minutes
```

**Why needed?**: AWS requires explicit permission for each model to prevent abuse.

### **2. Apply Terraform**

Once model access is granted:

```bash
cd terraform
terraform init
terraform plan    # Review changes
terraform apply   # Create Bedrock VPC endpoint and IAM policies
```

### **3. Deploy Updated AI Service**

```bash
cd ai-service
npm install       # Install new AWS SDK
npm run build
docker build -t <ECR_REPO>:ai-service-latest -f Dockerfile ..
docker push <ECR_REPO>:ai-service-latest
aws ecs update-service --cluster builderai-cluster --service builderai-ai-service --force-new-deployment
```

### **4. Test**

```bash
# Test Bedrock connectivity
curl -X POST https://your-alb.com/api/generate/code \
  -H "Authorization: Bearer <token>" \
  -d '{
    "requirements": "Create a hello world function",
    "model": "claude-3-5-sonnet-20241022"
  }'
```

---

## Documentation

Three comprehensive guides created:

1. **AWS_BEDROCK_INTEGRATION.md** - Complete technical guide
   - Architecture diagrams
   - Code examples
   - Troubleshooting
   - Cost analysis

2. **DEPLOYMENT_CHECKLIST.md** - Updated with Bedrock steps
   - Deployment order
   - Commands to run
   - Verification steps

3. **BEDROCK_MIGRATION_SUMMARY.md** - This document
   - Executive summary
   - Benefits
   - Action items

---

## Summary

✅ **Completed**:
- Updated AI service code to use Bedrock SDK
- Created Bedrock Terraform module
- Updated ECS IAM roles
- Updated documentation
- Removed API key dependencies

❌ **Required Actions**:
1. Request model access in Bedrock console (5 minutes)
2. Apply Terraform (10 minutes)
3. Deploy updated AI service (15 minutes)

**Benefits**:
- **$27/month savings** on infrastructure
- **Better security** (no API keys)
- **Private connectivity** (VPC endpoints)
- **More models** (Claude + Llama)
- **Unified billing** (single AWS bill)

**No SageMaker Needed**: We don't need SageMaker because we're using pre-trained models (Claude, Llama), not training custom models. Bedrock is the right service for this use case.

---

## Questions?

Refer to **AWS_BEDROCK_INTEGRATION.md** for detailed technical information.
