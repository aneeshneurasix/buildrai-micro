# BuildeRAI Microservices - Complete Project Structure

Generated on: 2026-09-28

---

## 📁 Directory Tree

```
builderai-microservice/
│
├── README.md                           # Main documentation
├── GETTING_STARTED.md                  # Setup and deployment guide
├── PROJECT_STRUCTURE.md                # This file
├── .env.example                        # Global environment variables
├── docker-compose.yml                  # Local development orchestration
│
├── docs/                               # Documentation
│   ├── ECS_TASK_VARIABLES.md          # Complete ECS task configurations
│   ├── SERVICE_COMMUNICATION.md        # Service communication patterns
│   ├── DEPLOYMENT.md                   # Deployment procedures
│   └── TROUBLESHOOTING.md              # Common issues and solutions
│
├── shared/                             # Shared library (@codstack/shared)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                    # Main export
│       ├── types/
│       │   └── index.ts                # Shared TypeScript types
│       ├── utils/
│       │   ├── logger.ts
│       │   ├── encryption.ts
│       │   └── validation.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   ├── error-handler.ts
│       │   └── rate-limit.ts
│       ├── models/                     # Shared Mongoose models
│       └── config/
│           ├── database.ts
│           └── redis.ts
│
├── ai-service/                         # AI & Code Generation Service
│   ├── package.json                    # Dependencies
│   ├── tsconfig.json                   # TypeScript config
│   ├── Dockerfile                      # Multi-stage Docker build
│   ├── .env.example                    # Environment variables
│   ├── .dockerignore
│   └── src/
│       ├── server.ts                   # Express server
│       ├── routes/
│       │   ├── generate.ts             # Code generation endpoints
│       │   ├── chat.ts                 # AI chat endpoints
│       │   ├── analysis.ts             # Code analysis endpoints
│       │   └── health.ts               # Health check
│       ├── lib/
│       │   ├── anthropic.ts            # Claude API client
│       │   ├── code-generator.ts       # Code generation logic
│       │   ├── context-loader.ts       # Context management
│       │   └── token-optimizer.ts      # Token optimization
│       ├── middleware/
│       │   ├── auth.ts                 # JWT validation
│       │   ├── error-handler.ts        # Error handling
│       │   ├── logger.ts               # Request logging
│       │   └── rate-limit.ts           # Rate limiting
│       └── config/
│           ├── anthropic.ts
│           └── cache.ts
│
├── auth-service/                       # Authentication & User Service
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── server.ts
│       ├── routes/
│       │   ├── auth.ts                 # Auth endpoints
│       │   ├── users.ts                # User management
│       │   ├── usage.ts                # Usage tracking
│       │   ├── tokens.ts               # Token management
│       │   └── health.ts
│       ├── models/
│       │   ├── User.ts                 # User model
│       │   └── Integration.ts          # OAuth integrations
│       ├── lib/
│       │   ├── clerk.ts                # Clerk integration
│       │   ├── jwt.ts                  # JWT utilities
│       │   └── subscription.ts         # Subscription logic
│       └── middleware/
│           ├── validate-clerk.ts
│           └── check-limits.ts
│
├── worker-service/                     # Background Worker Service
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── index.ts                    # Worker initialization
│       ├── workers/
│       │   ├── autonomous-agent.ts     # Autonomous agent worker
│       │   ├── email-worker.ts         # Email sending worker
│       │   └── cleanup-worker.ts       # Cleanup tasks
│       ├── jobs/
│       │   ├── task-processor.ts
│       │   └── email-sender.ts
│       └── lib/
│           ├── queue.ts                # BullMQ setup
│           └── ses.ts                  # AWS SES client
│
├── api-service/                        # General API Service
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── server.ts
│       ├── routes/
│       │   ├── projects.ts             # Project CRUD
│       │   ├── files.ts                # File operations
│       │   ├── github.ts               # GitHub integration
│       │   ├── integrations.ts         # OAuth integrations
│       │   ├── deployment.ts           # Deployment endpoints
│       │   ├── preview.ts              # Preview environments
│       │   └── health.ts
│       ├── lib/
│       │   ├── s3.ts                   # S3 file operations
│       │   ├── github.ts               # GitHub API client
│       │   ├── docker.ts               # Docker operations
│       │   └── git.ts                  # Git operations
│       └── middleware/
│           └── upload.ts               # File upload handling
│
├── frontend/                           # Frontend (Next.js for S3 + CloudFront)
│   ├── package.json
│   ├── next.config.js                  # Next.js config (static export)
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── .env.example
│   └── src/
│       ├── app/                        # Next.js App Router
│       │   ├── (auth)/                 # Auth pages
│       │   ├── (dashboard)/            # Dashboard pages
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/                 # React components
│       │   ├── ui/                     # shadcn/ui components
│       │   ├── project/
│       │   ├── chat/
│       │   └── dashboard/
│       ├── lib/
│       │   ├── api-client.ts           # API client for backend
│       │   └── utils.ts
│       └── types/
│           └── index.ts
│
├── terraform/                          # Infrastructure as Code
│   ├── main.tf                         # Main Terraform config
│   ├── variables.tf                    # Input variables
│   ├── outputs.tf                      # Output values
│   ├── terraform.tfvars.example        # Example variables
│   │
│   └── modules/                        # Terraform modules
│       ├── vpc/                        # VPC, subnets, NAT
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       │
│       ├── ecs/                        # ECS cluster, services, tasks
│       │   ├── main.tf
│       │   ├── task-definitions/
│       │   │   ├── ai-service.json
│       │   │   ├── auth-service.json
│       │   │   ├── worker-service.json
│       │   │   └── api-service.json
│       │   ├── variables.tf
│       │   └── outputs.tf
│       │
│       ├── alb/                        # Application Load Balancer
│       │   ├── main.tf
│       │   ├── target-groups.tf
│       │   ├── listeners.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       │
│       ├── s3-cloudfront/              # Frontend S3 + CloudFront
│       │   ├── main.tf
│       │   ├── s3.tf
│       │   ├── cloudfront.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       │
│       ├── redis/                      # ElastiCache Redis
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       │
│       ├── secrets/                    # Secrets Manager
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       │
│       └── monitoring/                 # CloudWatch monitoring
│           ├── main.tf
│           ├── dashboards.tf
│           ├── alarms.tf
│           ├── variables.tf
│           └── outputs.tf
│
├── scripts/                            # Utility scripts
│   ├── build-and-push.sh               # Build and push all Docker images
│   ├── deploy-ecs.sh                   # Deploy to ECS
│   ├── deploy-frontend.sh              # Deploy frontend to S3
│   ├── create-secrets.sh               # Create AWS secrets
│   └── rollback.sh                     # Rollback deployment
│
└── .github/                            # GitHub Actions CI/CD
    └── workflows/
        ├── ai-service.yml              # AI service CI/CD
        ├── auth-service.yml            # Auth service CI/CD
        ├── worker-service.yml          # Worker service CI/CD
        ├── api-service.yml             # API service CI/CD
        └── frontend.yml                # Frontend deployment
```

---

## 📦 Services Overview

### 1. Shared Library (`@codstack/shared`)
**Purpose**: Common code, types, and utilities used across all services

**Exports**:
- TypeScript types (User, Project, ChatSession, etc.)
- Middleware (auth, error handling, rate limiting)
- Utilities (logger, encryption, validation)
- Database models
- Config (database, Redis)

**Usage**: Installed as local dependency in all services

---

### 2. AI Service (Port 4000)
**Purpose**: AI-powered code generation, analysis, and chat

**Key Features**:
- Code generation with Claude Sonnet 4.5
- Real-time streaming chat
- Code quality analysis
- Security vulnerability scanning
- Test generation
- Token optimization
- Response caching

**Dependencies**:
- Anthropic SDK
- MongoDB (ChatSession, Project)
- Redis (caching, rate limiting)
- Auth Service (token validation)

**Resources**: 2 vCPU, 4GB RAM, Auto-scale 2-10 tasks

---

### 3. Auth Service (Port 4001)
**Purpose**: Authentication, user management, and authorization

**Key Features**:
- Clerk integration for OAuth
- JWT token generation and validation
- User profile management
- Subscription management (Stripe)
- Usage tracking and limits
- Session management (Redis)

**Dependencies**:
- Clerk SDK
- Stripe SDK
- MongoDB (User, Integration)
- Redis (sessions)

**Resources**: 0.5 vCPU, 1GB RAM, Auto-scale 2-6 tasks

---

### 4. Worker Service (No HTTP port)
**Purpose**: Background job processing

**Key Features**:
- Autonomous agent task execution
- Email sending (AWS SES)
- Scheduled cleanup jobs
- Queue processing (BullMQ)
- Long-running tasks

**Dependencies**:
- BullMQ
- AWS SES
- MongoDB (TaskQueue)
- Redis (queue backend)
- AI Service (for autonomous agent)

**Resources**: 1 vCPU, 2GB RAM, Auto-scale 2-4 tasks

---

### 5. API Service (Port 3001)
**Purpose**: General API endpoints (projects, files, integrations)

**Key Features**:
- Project CRUD operations
- File management (S3)
- GitHub integration
- OAuth integrations (Bitbucket, Azure)
- Deployment triggering
- Preview environments
- API testing

**Dependencies**:
- AWS S3
- GitHub API (Octokit)
- MongoDB (Project, Integration, Preview)
- Auth Service (validation)
- AI Service (some operations)

**Resources**: 1 vCPU, 2GB RAM, Auto-scale 2-8 tasks

---

### 6. Frontend (S3 + CloudFront)
**Purpose**: User interface (React/Next.js)

**Deployment**:
- Built as static export (`next export`)
- Deployed to S3
- Served via CloudFront CDN
- API calls to backend services via ALB

**Cost**: ~$15/month (vs ~$50/month on ECS)

---

## 🔧 Technology Stack

### Backend Services
- **Runtime**: Node.js 20 (Alpine Linux)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis (ioredis)
- **Queue**: BullMQ
- **AI**: Anthropic Claude SDK
- **Auth**: Clerk SDK, JWT
- **Payments**: Stripe

### Frontend
- **Framework**: Next.js 16.2.6 (Static Export)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS 4
- **Components**: shadcn/ui (Radix)
- **Auth**: Clerk Next.js
- **Editor**: Monaco Editor
- **Terminal**: XTerm.js

### Infrastructure
- **Cloud**: AWS (ap-south-1 Mumbai)
- **Compute**: ECS Fargate
- **Load Balancer**: Application Load Balancer
- **CDN**: CloudFront
- **Storage**: S3, ElastiCache Redis
- **Secrets**: AWS Secrets Manager
- **Monitoring**: CloudWatch
- **IaC**: Terraform
- **CI/CD**: GitHub Actions

---

## 🚀 Deployment Architecture

```
Users
  │
  ├─→ CloudFront (Static Content) ──→ S3 (Frontend)
  │
  └─→ Route 53 ──→ ALB ──→ ECS Services
                            │
                            ├─→ AI Service (4000)
                            ├─→ Auth Service (4001)
                            ├─→ API Service (3001)
                            └─→ Worker Service (background)
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                   MongoDB Atlas      ElastiCache Redis
```

---

## 📊 Cost Estimate

**Monthly Cost (Production)**:

| Component | Cost |
|-----------|------|
| Frontend (S3 + CloudFront) | $15 |
| AI Service (2-10 tasks) | $100-500 |
| Auth Service (2-6 tasks) | $25-75 |
| API Service (2-8 tasks) | $50-200 |
| Worker Service (2-4 tasks) | $50-100 |
| ALB | $22 |
| NAT Gateways (2) | $90 |
| ElastiCache Redis | $15 |
| MongoDB Atlas M10 | $60 |
| S3 Storage | $3 |
| CloudWatch | $15 |
| Secrets Manager | $6 |
| **TOTAL** | **$367-1,127/month** |

**Average (moderate load)**: ~$600/month

---

## 📝 Environment Variables Summary

### Required for All Services
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - JWT signing key
- `ENCRYPTION_KEY` - AES-256 encryption key
- `INTERNAL_API_KEY` - Service-to-service auth

### AI Service
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI key (optional)

### Auth Service
- `CLERK_SECRET_KEY` - Clerk secret
- `STRIPE_SECRET_KEY` - Stripe secret

### Worker Service
- `AWS_REGION` - AWS region for SES
- `SES_FROM_EMAIL` - Email sender address

### API Service
- `S3_BUCKET_UPLOADS` - S3 bucket name
- `GITHUB_CLIENT_SECRET` - GitHub OAuth secret

### Frontend
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `NEXT_PUBLIC_API_URL` - Backend API URL

---

## ✅ What's Included

### Core Structure ✓
- [x] Complete folder structure for all 5 services
- [x] Shared library with common code
- [x] TypeScript configuration for all services
- [x] Package.json with all dependencies

### Docker & Orchestration ✓
- [x] Multi-stage Dockerfiles for all services
- [x] Docker Compose for local development
- [x] Non-root container users
- [x] Health checks

### Infrastructure ✓
- [x] Terraform main configuration
- [x] VPC, ECS, ALB modules structure
- [x] S3 + CloudFront for frontend
- [x] ElastiCache Redis
- [x] Secrets Manager
- [x] CloudWatch monitoring

### Documentation ✓
- [x] Complete README
- [x] Getting Started guide
- [x] ECS task variables documentation
- [x] Architecture diagram
- [x] Project structure overview

### Configuration ✓
- [x] Environment variable examples for all services
- [x] Next.js config for static export
- [x] TypeScript configs
- [x] ESLint configs

---

## 🎯 Next Steps

1. **Extract Code from Monolith**:
   - Copy relevant code from `buildrai-platform` to each service
   - AI routes → `ai-service/src/routes/`
   - Auth logic → `auth-service/src/routes/`
   - Worker code → `worker-service/src/workers/`

2. **Implement Shared Library**:
   - Copy models from monolith
   - Implement middleware
   - Add utility functions

3. **Test Locally**:
   - `docker-compose up --build`
   - Test all API endpoints
   - Verify service communication

4. **Deploy to AWS**:
   - Follow `GETTING_STARTED.md`
   - Create infrastructure with Terraform
   - Build and push Docker images
   - Deploy services to ECS

5. **Set Up CI/CD**:
   - Configure GitHub Actions
   - Automated testing
   - Automated deployments

---

## 📞 Support

For questions or issues:
1. Check `GETTING_STARTED.md`
2. Review `docs/TROUBLESHOOTING.md`
3. Check CloudWatch logs
4. Contact DevOps team

---

**Project Status**: ✅ Structure Complete, Ready for Code Migration

**Created**: 2026-09-28
**Version**: 2.0.0
**Maintained By**: BuildeRAI DevOps Team
