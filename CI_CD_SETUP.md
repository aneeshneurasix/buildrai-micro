# CI/CD Setup with AWS CodePipeline

## Overview

BuildeRAI uses AWS CodePipeline for automated CI/CD:
- **Source**: GitHub repository (aneeshneurasix/buildrai-micro)
- **Build**: AWS CodeBuild (builds Docker images for 4 microservices)
- **Deploy**: Pushes images to ECR, triggers ECS updates

---

## Infrastructure Created

### **1. S3 Bucket for Terraform State**
```
Bucket: builderai-terraform-state
Key: microservices/terraform.tfstate
Versioning: Enabled
Encryption: AES256
State Locking: DynamoDB table (builderai-terraform-locks)
```

### **2. CodePipeline Resources**
- **Pipeline**: `builderai-pipeline`
- **CodeBuild Project**: `builderai-docker-build`
- **Artifacts Bucket**: `builderai-codepipeline-artifacts`
- **GitHub Connection**: `arn:aws:codestar-connections:ap-south-1:120594650992:connection/5bbe391e-7ecf-4fc3-9e4f-61f99cb4b129`

---

## ⚠️ MANUAL STEP REQUIRED: Authorize GitHub Connection

The CodeStar connection to GitHub needs one-time manual authorization:

### **Steps:**

1. **Go to AWS Console**:
   ```
   https://ap-south-1.console.aws.amazon.com/codesuite/settings/connections?region=ap-south-1
   ```

2. **Find the connection**:
   - Name: `builderai-github`
   - Status: **Pending** (needs authorization)

3. **Click "Update pending connection"**

4. **Authorize with GitHub**:
   - Click "Install a new app" or "Connect to GitHub"
   - Authorize AWS Connector for GitHub
   - Select repository: `aneeshneurasix/buildrai-micro`
   - Complete authorization

5. **Verify**:
   - Status should change to **Available**

---

## How It Works

### **Pipeline Stages:**

**Stage 1: Source**
- Triggered on push to `main` branch
- Fetches code from GitHub

**Stage 2: Build**
- Runs CodeBuild with `buildspec.yml`
- Builds 4 Docker images in parallel:
  - `ai-service`
  - `auth-service`
  - `worker-service`
  - `api-service`
- Tags images with commit hash + `latest`
- Pushes to ECR

**Stage 3: Deploy** (optional, can be added)
- Updates ECS services with new images
- Rolling deployment with health checks

---

## Build Process (buildspec.yml)

```yaml
phases:
  pre_build:
    - Login to ECR
    - Get commit hash for tagging

  build:
    - npm install for each service
    - docker build for each service
    - Tag with commit hash and latest

  post_build:
    - Push all images to ECR
    - Update ECS services (if configured)
```

---

## Triggering the Pipeline

### **Automatic Trigger:**
```bash
# Any push to main branch triggers the pipeline
git push origin main
```

### **Manual Trigger:**
```bash
# Via AWS CLI
aws codepipeline start-pipeline-execution \
  --name builderai-pipeline \
  --region ap-south-1 \
  --profile buildrai-aws
```

### **Via AWS Console:**
```
https://ap-south-1.console.aws.amazon.com/codesuite/codepipeline/pipelines
```

---

## Monitoring

### **CodePipeline Console:**
```
https://ap-south-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/builderai-pipeline/view
```

### **CloudWatch Logs:**
```
Log Group: /aws/codebuild/builderai
Stream: docker-build
```

### **View Logs via CLI:**
```bash
aws logs tail /aws/codebuild/builderai --follow --profile buildrai-aws
```

---

## Cost Estimate

| Service | Usage | Cost/Month |
|---------|-------|------------|
| CodePipeline | 1 active pipeline | $1 |
| CodeBuild | ~100 builds/month (5 min avg) | $1 |
| S3 (artifacts) | ~10 GB storage | $0.25 |
| **Total** | | **~$2.25/month** |

Very cost-effective for automated deployments!

---

## Terraform State Management

### **Current State:**
- **Backend**: S3
- **Bucket**: `builderai-terraform-state`
- **Key**: `microservices/terraform.tfstate`
- **Locking**: DynamoDB table `builderai-terraform-locks`

### **Working with State:**

```bash
# View current state
cd terraform
terraform show

# List resources
terraform state list

# Pull remote state
terraform state pull

# Force unlock (if locked)
terraform force-unlock <lock-id>
```

---

## Next Steps

1. ✅ Authorize GitHub connection in AWS Console (see above)
2. ✅ Push code to trigger first build
3. ⏳ Wait for build to complete (~10 minutes)
4. ⏳ Verify images in ECR
5. ⏳ Deploy Phase 2 (ECS, ALB, Redis)

---

## Troubleshooting

### **Pipeline Fails at Source Stage**
- GitHub connection not authorized
- Go to CodeStar Connections and authorize

### **Build Fails**
- Check CloudWatch logs: `/aws/codebuild/builderai`
- Common issues:
  - npm install failures (check package.json)
  - Docker build failures (check Dockerfiles)
  - ECR permissions (check IAM role)

### **Images Not Showing in ECR**
- Check CodeBuild logs for push errors
- Verify ECR repository exists
- Check IAM permissions for CodeBuild role

---

## Security

- **Secrets**: Stored in AWS Secrets Manager, not in code
- **IAM**: Least privilege roles for CodeBuild and CodePipeline
- **Encryption**: S3 artifacts encrypted at rest
- **Network**: CodeBuild runs in AWS VPC (private subnets)

---

## Alternative: GitHub Actions (Currently Not Used)

If you prefer GitHub Actions over CodePipeline, the workflow is already in `.github/workflows/deploy.yml`. To use it:

1. Set GitHub secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

2. Push to main branch

CodePipeline is recommended for better AWS integration and lower cost.
