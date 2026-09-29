#!/bin/bash

# BuilderAI Microservices Deployment Script
# Deploys all services to AWS ECS

set -e

PROJECT_NAME="builderai"
AWS_REGION="ap-south-1"
ECR_REPOSITORY="$PROJECT_NAME-microservice"

echo "🚀 Starting deployment for $PROJECT_NAME"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

echo "📦 AWS Account: $AWS_ACCOUNT_ID"
echo "📍 Region: $AWS_REGION"

# Login to ECR
echo "🔐 Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build shared library
echo "🔨 Building shared library..."
cd shared
npm install
npm run build
cd ..

# Build and push services
SERVICES=("ai-service" "auth-service" "worker-service" "api-service")

for SERVICE in "${SERVICES[@]}"; do
    echo "🔨 Building $SERVICE..."
    docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$SERVICE-latest -f $SERVICE/Dockerfile .

    echo "⬆️  Pushing $SERVICE to ECR..."
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$SERVICE-latest
done

# Build and deploy frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

echo "⬆️  Deploying frontend to S3..."
aws s3 sync out/ s3://$PROJECT_NAME-frontend-production --delete

echo "🔄 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$PROJECT_NAME frontend distribution'].Id" --output text)
if [ -n "$DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
fi

cd ..

# Update ECS services
echo "🔄 Updating ECS services..."
for SERVICE in "${SERVICES[@]}"; do
    echo "  Updating $SERVICE..."
    aws ecs update-service --cluster $PROJECT_NAME-cluster --service $PROJECT_NAME-$SERVICE --force-new-deployment --region $AWS_REGION > /dev/null
done

echo "⏳ Waiting for services to stabilize..."
aws ecs wait services-stable --cluster $PROJECT_NAME-cluster --services \
    $PROJECT_NAME-ai-service \
    $PROJECT_NAME-auth-service \
    $PROJECT_NAME-worker-service \
    $PROJECT_NAME-api-service \
    --region $AWS_REGION

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend: https://$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$PROJECT_NAME frontend distribution'].DomainName" --output text)"
echo "🔗 API: https://$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query 'LoadBalancers[0].DNSName' --output text)"
