# BuildeRAI Microservices Architecture

This is the microservices version of the BuildeRAI platform, designed for AWS ECS deployment.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFront (CDN)                         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ├──→ S3 (Static Frontend) ──→ /*, /_next/*, /images/*
              │
              └──→ Application Load Balancer (API Traffic)
                   │
                   ├──→ AI Service (ECS)         Port 4000
                   ├──→ Auth Service (ECS)       Port 4001
                   ├──→ API Service (ECS)        Port 3001
                   └──→ Worker Service (ECS)     Background
```

## 📦 Services

| Service | Type | Port | Description | Deploy To |
|---------|------|------|-------------|-----------|
| **frontend** | Next.js Static | - | React UI, SSR, Static Export | S3 + CloudFront |
| **ai-service** | Express.js | 4000 | Code generation, AI chat, Analysis | ECS Fargate |
| **auth-service** | Express.js | 4001 | Authentication, User management | ECS Fargate |
| **worker-service** | Node.js | - | Background jobs, Queue processing | ECS Fargate |
| **api-service** | Express.js | 3001 | Projects, Files, Integrations | ECS Fargate |
| **shared** | Library | - | Shared types, utilities, models | NPM package |

## 📁 Directory Structure

```
builderai-microservice/
├── frontend/                    # Next.js frontend (S3 + CloudFront)
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── next.config.js
│   └── package.json
│
├── ai-service/                  # AI & Code Generation Service
│   ├── src/
│   │   ├── routes/
│   │   ├── lib/
│   │   ├── middleware/
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
│
├── auth-service/                # Authentication & User Service
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
│
├── worker-service/              # Background Worker Service
│   ├── src/
│   │   ├── workers/
│   │   ├── jobs/
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
│
├── api-service/                 # General API Service
│   ├── src/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
│
├── shared/                      # Shared code and types
│   ├── src/
│   │   ├── types/
│   │   ├── utils/
│   │   └── models/
│   └── package.json
│
├── terraform/                   # Infrastructure as Code
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── vpc/
│       ├── ecs/
│       ├── alb/
│       ├── s3-cloudfront/
│       └── monitoring/
│
├── docker-compose.yml           # Local development
├── .env.example                 # Example environment variables
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- AWS CLI configured
- Terraform 1.0+

### Local Development

1. **Install dependencies for all services**:
```bash
# Install shared library
cd shared && npm install && npm run build && cd ..

# Install service dependencies
cd frontend && npm install && cd ..
cd ai-service && npm install && cd ..
cd auth-service && npm install && cd ..
cd worker-service && npm install && cd ..
cd api-service && npm install && cd ..
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. **Run with Docker Compose**:
```bash
docker-compose up --build
```

4. **Access services**:
- Frontend: http://localhost:3000
- AI Service: http://localhost:4000
- Auth Service: http://localhost:4001
- API Service: http://localhost:3001

### Production Deployment

1. **Deploy Infrastructure**:
```bash
cd terraform
terraform init
terraform plan -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

2. **Build and Push Docker Images**:
```bash
./scripts/build-and-push.sh
```

3. **Deploy Frontend to S3**:
```bash
cd frontend
npm run build
aws s3 sync out/ s3://codstack-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

4. **Deploy Services to ECS**:
```bash
./scripts/deploy-ecs.sh
```

## 💰 Cost Estimate (Monthly)

| Component | Configuration | Cost |
|-----------|--------------|------|
| **Frontend (S3 + CloudFront)** | 100GB storage, 1TB transfer | **$15** |
| AI Service (2-10 tasks) | 2 vCPU, 4GB | $100-500 |
| Auth Service (2 tasks) | 0.5 vCPU, 1GB | $25 |
| Worker Service (2 tasks) | 1 vCPU, 2GB | $50 |
| API Service (2 tasks) | 1 vCPU, 2GB | $50 |
| ALB | 1 ALB, 10M requests | $22 |
| NAT Gateway (2) | 100GB data | $90 |
| ElastiCache Redis | cache.t4g.micro | $15 |
| **TOTAL** | | **$367-767/month** |

**Savings**: ~$100/month vs monolith (Frontend on S3 vs ECS)

## 🔧 Environment Variables

See `.env.example` for full list. Key variables:

### Global
- `NODE_ENV`: production/development
- `AWS_REGION`: ap-south-1
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string

### AI Service
- `ANTHROPIC_API_KEY`: Claude API key
- `OPENAI_API_KEY`: OpenAI API key (optional)

### Auth Service
- `CLERK_SECRET_KEY`: Clerk secret
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
- `JWT_SECRET`: JWT signing secret

### All Services
- `ENCRYPTION_KEY`: AES-256 encryption key
- `API_GATEWAY_URL`: Internal service communication

## 📊 Monitoring

- **Logs**: CloudWatch Logs per service
- **Metrics**: CloudWatch Container Insights
- **Tracing**: AWS X-Ray (optional)
- **Dashboards**: CloudWatch dashboards per service

## 🔒 Security

- All services in private subnets
- Secrets in AWS Secrets Manager
- TLS 1.3 for all traffic
- Service-to-service JWT authentication
- Rate limiting enabled
- Non-root container users

## 📚 Documentation

- [ECS Task Variables](./docs/ECS_TASK_VARIABLES.md)
- [Service Communication](./docs/SERVICE_COMMUNICATION.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## 🔄 CI/CD

GitHub Actions workflows:
- `.github/workflows/frontend.yml` - Deploy frontend to S3
- `.github/workflows/ai-service.yml` - Deploy AI service to ECS
- `.github/workflows/auth-service.yml` - Deploy Auth service to ECS
- `.github/workflows/worker-service.yml` - Deploy Worker service to ECS
- `.github/workflows/api-service.yml` - Deploy API service to ECS

## 🧪 Testing

```bash
# Run tests for all services
npm run test

# Run tests for specific service
cd ai-service && npm test
```

## 📦 Versioning

Services use semantic versioning. Current versions:
- Frontend: 2.0.0
- AI Service: 2.0.0
- Auth Service: 2.0.0
- Worker Service: 2.0.0
- API Service: 2.0.0
- Shared: 1.0.0

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test locally with Docker Compose
4. Submit PR

## 📄 License

Proprietary - BuildeRAI Platform

---

**Last Updated**: 2026-09-28
**Maintained By**: BuildeRAI DevOps Team
