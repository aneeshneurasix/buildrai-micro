# Amazon Bedrock Integration Guide

## Overview

We've migrated from **direct Anthropic/OpenAI API calls** to **Amazon Bedrock** for all AI functionality. This provides significant cost savings, better AWS integration, and private connectivity.

---

## Why Amazon Bedrock?

### **Benefits vs Direct API Calls**

| Feature | Direct API | Amazon Bedrock |
|---------|-----------|----------------|
| **Cost (Infrastructure)** | $65/month NAT Gateway | $7/month VPC Endpoint |
| **Connectivity** | Public internet | Private VPC |
| **Authentication** | API keys in Secrets Manager | IAM roles (no keys!) |
| **Monitoring** | Custom CloudWatch | Native integration |
| **Billing** | Separate bills | Single AWS bill |
| **Security** | Internet breakout required | Fully private |
| **Models Available** | Anthropic only | Anthropic + Meta + more |

**Net Savings: ~$58/month infrastructure + simpler management**

---

## Available Models

### **Anthropic Claude (Primary)**
- **Claude 3.5 Sonnet** - `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - Best for code generation
  - $3 per million input tokens, $15 per million output tokens

- **Claude 3 Haiku** - `anthropic.claude-3-haiku-20240307-v1:0`
  - Fast and cheap
  - $0.25 per million input, $1.25 per million output

- **Claude 3 Opus** - `anthropic.claude-3-opus-20240229-v1:0`
  - Most powerful
  - $15 per million input, $75 per million output

### **Meta Llama (Alternative/Backup)**
- **Llama 3.1 70B** - `meta.llama3-1-70b-instruct-v1:0`
  - Open-source alternative
  - Cheaper than Claude

---

## Architecture

### **Before (Direct API)**
```
ECS Task (private subnet)
  ↓
NAT Gateway ($65/month)
  ↓
Internet
  ↓
Anthropic API
```

### **After (Bedrock via VPC Endpoint)**
```
ECS Task (private subnet)
  ↓
VPC Endpoint ($7/month)
  ↓
Amazon Bedrock (AWS private network)
  ↓
Claude models
```

---

## Infrastructure Components

### **1. VPC Endpoint**
- **Service**: `com.amazonaws.ap-south-1.bedrock-runtime`
- **Type**: Interface endpoint
- **Subnets**: Private subnets (2 AZs)
- **Cost**: ~$7/month

### **2. Security Group**
- Allows HTTPS (443) from ECS task subnets
- Attached to VPC endpoint

### **3. IAM Policy**
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": [
    "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-5-sonnet-*",
    "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-haiku-*"
  ]
}
```
- Attached to ECS task role
- No API keys needed!

---

## Code Changes

### **Updated Dependencies**

**Before** (`ai-service/package.json`):
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.96.0",
    "openai": "^4.0.0"
  }
}
```

**After**:
```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.645.0"
  }
}
```

### **Updated Client Code**

**File**: `ai-service/src/lib/client.ts`

**Before**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await client.messages.create({...});
```

**After**:
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: 'ap-south-1'
  // Credentials auto-loaded from ECS task IAM role!
});

const command = new InvokeModelCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  body: JSON.stringify({...})
});

const response = await client.send(command);
```

---

## Deployment Steps

### **1. Request Model Access** (One-time, manual)

⚠️ **IMPORTANT**: You must request model access in Bedrock console first!

```bash
# Go to AWS Console
https://ap-south-1.console.aws.amazon.com/bedrock/home?region=ap-south-1#/modelaccess

# Click "Request model access"
# Enable these models:
- Anthropic Claude 3.5 Sonnet
- Anthropic Claude 3 Haiku
- Anthropic Claude 3 Opus
- Meta Llama 3.1 70B (optional)

# Access is usually granted within minutes
```

### **2. Apply Terraform**

```bash
cd terraform

# Initialize (first time only)
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply

# Outputs:
# - bedrock_vpc_endpoint_id
# - bedrock_policy_arn
```

### **3. Update AI Service**

The AI service code already uses Bedrock. Just rebuild and deploy:

```bash
cd ai-service

# Install new dependencies
npm install

# Build
npm run build

# Build Docker image
docker build -t <ECR_REPO>:ai-service-latest -f Dockerfile ..

# Push to ECR
docker push <ECR_REPO>:ai-service-latest

# Update ECS service
aws ecs update-service \
  --cluster builderai-cluster \
  --service builderai-ai-service \
  --force-new-deployment
```

### **4. Remove Old Secrets** (Optional)

Since we no longer need API keys:

```bash
# Delete Anthropic API key from Secrets Manager
aws secretsmanager delete-secret \
  --secret-id /builderai/prod/anthropic-api-key \
  --force-delete-without-recovery

# Delete OpenAI API key
aws secretsmanager delete-secret \
  --secret-id /builderai/prod/openai-api-key \
  --force-delete-without-recovery
```

**Savings**: $0.80/month from Secrets Manager

---

## Environment Variables

### **Removed** (No longer needed):
```bash
ANTHROPIC_API_KEY=<secret>
OPENAI_API_KEY=<secret>
```

### **Added**:
```bash
AWS_REGION=ap-south-1  # For Bedrock client
```

All other variables remain the same.

---

## Testing

### **1. Test Bedrock Access**

```bash
# SSH into ECS task (if ECS Exec enabled)
aws ecs execute-command \
  --cluster builderai-cluster \
  --task <task-id> \
  --command "/bin/sh" \
  --interactive

# Or test from local with AWS credentials
export AWS_REGION=ap-south-1
export AWS_PROFILE=your-profile

node -e "
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: 'ap-south-1' });

const command = new InvokeModelCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

client.send(command).then(response => {
  const body = JSON.parse(new TextDecoder().decode(response.body));
  console.log('Success:', body);
}).catch(err => console.error('Error:', err));
"
```

### **2. Test AI Service Endpoint**

```bash
# Generate code using Bedrock
curl -X POST https://your-alb-domain.com/api/generate/code \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project",
    "requirements": "Create a Hello World function",
    "model": "claude-3-5-sonnet-20241022"
  }'

# Should return generated code
```

---

## Monitoring

### **CloudWatch Metrics**

Bedrock automatically provides these metrics:

- `Invocations` - Number of model calls
- `ModelInvocationLatency` - Response time
- `ClientErrors` - 4xx errors
- `ServerErrors` - 5xx errors

View in CloudWatch Console:
```
Services → CloudWatch → Metrics → Bedrock
```

### **CloudWatch Logs**

AI service logs include:
```
[INFO] Bedrock client initialized in region ap-south-1
[INFO] Creating chat completion with Bedrock: Claude 3.5 Sonnet
[INFO] AI request completed - Model: claude-3-5-sonnet, Tokens: 1234, Cost: $0.05
```

---

## Cost Comparison

### **Before (Direct API)**

| Item | Monthly Cost |
|------|--------------|
| NAT Gateway (2x) | $65 |
| Data transfer | $5 |
| Secrets Manager (2 secrets) | $0.80 |
| Anthropic API (variable) | $X |
| **Total** | **$70.80 + $X** |

### **After (Bedrock)**

| Item | Monthly Cost |
|------|--------------|
| NAT Gateway (1x) | $32 (still needed for other services) |
| VPC Endpoint | $7 |
| Data transfer | $2 (reduced) |
| Bedrock API (variable) | $X (same pricing) |
| **Total** | **$41 + $X** |

**Net Savings: ~$30/month infrastructure**

---

## Troubleshooting

### **Error: "AccessDeniedException"**

```
An error occurred (AccessDeniedException) when calling the InvokeModel operation:
You don't have access to the model with the specified model ID.
```

**Solution**: Request model access in Bedrock console (see Step 1 above)

### **Error: "ValidationException: Malformed input"**

Check request body format. Each model has different format:

**Anthropic Claude**:
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 4096,
  "messages": [{"role": "user", "content": "Hello"}]
}
```

**Meta Llama**:
```json
{
  "prompt": "[INST] Hello [/INST]",
  "max_gen_len": 4096,
  "temperature": 0.7
}
```

### **Error: "Network timeout"**

- Check VPC endpoint security group allows 443 from ECS subnets
- Verify private DNS enabled on VPC endpoint
- Check ECS task security group allows outbound HTTPS

---

## Migration Checklist

- [x] Create Bedrock Terraform module
- [x] Update main.tf to include Bedrock
- [x] Update ECS task IAM role with Bedrock permissions
- [x] Update AI service code to use Bedrock SDK
- [x] Update package.json dependencies
- [ ] Request model access in Bedrock console
- [ ] Apply Terraform to create VPC endpoint
- [ ] Test Bedrock connectivity
- [ ] Deploy updated AI service
- [ ] Monitor CloudWatch metrics
- [ ] Remove old API key secrets (optional)

---

## Next Steps

1. **Request model access** in Bedrock console (required!)
2. **Apply Terraform** to create VPC endpoint and IAM policies
3. **Deploy updated AI service** with Bedrock SDK
4. **Monitor performance** and costs in CloudWatch
5. **Consider reducing NAT Gateway** to 1 (or 0 if all services use VPC endpoints)

---

## Additional Resources

- [Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Bedrock Model IDs](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [VPC Endpoints Guide](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
