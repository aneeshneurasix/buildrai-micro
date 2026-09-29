# Complete Migration Plan - Monolith to Microservices

**Created**: 2026-09-28
**Total Tasks**: 35
**Estimated Time**: 15-20 hours
**Current Progress**: 15% (Structure only)

---

## 📊 Migration Status

### ✅ Completed (15%)
- [x] Folder structure created
- [x] Package.json files with dependencies
- [x] Dockerfiles
- [x] Docker Compose
- [x] .env.example files
- [x] TypeScript configurations
- [x] Documentation (20,000+ words)
- [x] Terraform main files

### 🔄 In Progress (0%)
- [ ] Actual code migration

### ❌ Not Started (85%)
- [ ] All business logic
- [ ] All route handlers
- [ ] All utilities and middleware
- [ ] Terraform modules
- [ ] CI/CD workflows

---

## 📋 Detailed Task Breakdown

### Phase 1: Shared Library (8 tasks, ~3-4 hours)

**Why First?** All services depend on this foundation.

| # | Task | Files | Status |
|---|------|-------|--------|
| 1 | Copy User model | `shared/src/models/User.ts` | ✅ DONE |
| 2 | Copy Project model | `shared/src/models/Project.ts` | ⏳ NEXT |
| 3 | Copy ChatSession model | `shared/src/models/ChatSession.ts` | ⬜ TODO |
| 4 | Copy TaskQueue model | `shared/src/models/TaskQueue.ts` | ⬜ TODO |
| 5 | Copy Integration model | `shared/src/models/Integration.ts` | ⬜ TODO |
| 6 | Copy SecurityScan model | `shared/src/models/SecurityScan.ts` | ⬜ TODO |
| 7 | Copy Preview model | `shared/src/models/Preview.ts` | ⬜ TODO |
| 8 | Copy remaining models | `shared/src/models/api-*.ts` | ⬜ TODO |

**Models Summary**:
```
Source: buildrai-platform/src/lib/db/models/
Destination: builderai-microservice/shared/src/models/

Files to copy:
- User.ts ✅
- Project.ts ⏳
- ChatSession.ts
- TaskQueue.ts
- Integration.ts
- SecurityScan.ts
- Preview.ts
- IgnoredIssue.ts
- api-collection.ts
- api-history.ts
```

---

### Phase 2: Shared Utilities & Middleware (8 tasks, ~2-3 hours)

| # | Task | Files | Complexity |
|---|------|-------|------------|
| 9 | Logger utility | `shared/src/utils/logger.ts` | Medium |
| 10 | Encryption utility | `shared/src/utils/encryption.ts` | Medium |
| 11 | Validation utility | `shared/src/utils/validation.ts` | Low |
| 12 | Auth middleware | `shared/src/middleware/auth.ts` | High |
| 13 | Error handler | `shared/src/middleware/error-handler.ts` | Medium |
| 14 | Rate limiter | `shared/src/middleware/rate-limit.ts` | Medium |
| 15 | Database config | `shared/src/config/database.ts` | Low |
| 16 | Redis config | `shared/src/config/redis.ts` | Low |

**Implementation Details**:

#### Logger (Winston)
```typescript
// shared/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // CloudWatch transport for production
  ],
});
```

#### Encryption (AES-256-GCM)
```typescript
// shared/src/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  // ... implementation
}

export function decrypt(encrypted: string): string {
  // ... implementation
}
```

#### Auth Middleware (JWT)
```typescript
// shared/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

### Phase 3: AI Service (4 tasks, ~4-5 hours)

**Priority**: HIGH (Core business logic)

| # | Task | Source | Destination | Lines |
|---|------|--------|-------------|-------|
| 17 | Generate routes | `buildrai-platform/src/app/api/generate/` | `ai-service/src/routes/generate.ts` | ~300 |
| 18 | Chat routes | `buildrai-platform/src/app/api/chat/` | `ai-service/src/routes/chat.ts` | ~400 |
| 19 | Analysis routes | `buildrai-platform/src/app/api/code-review/`, `/quality/`, `/security/` | `ai-service/src/routes/analysis.ts` | ~500 |
| 20 | AI libraries | `buildrai-platform/src/lib/ai/` | `ai-service/src/lib/` | ~2000 |

**Files to Migrate**:

**Routes** (from `buildrai-platform/src/app/api/`):
- `generate/code/route.ts`
- `generate/chat/route.ts`
- `ai/generate/route.ts`
- `chat/stream/route.ts`
- `chat/sessions/route.ts`
- `code-review/route.ts`
- `quality/analyze/route.ts`
- `security/scan/route.ts`

**Libraries** (from `buildrai-platform/src/lib/ai/`):
- `anthropic.ts` - Claude API client
- `code-generator.ts` - Code generation logic
- `context-loader.ts` - Context management
- `token-optimizer.ts` - Token optimization
- `cost-calculator.ts` - Cost tracking
- `code-review-agent.ts` - Code review
- `agents/` directory - All AI agents

**Estimated Lines**: ~3,200 lines of code

---

### Phase 4: Auth Service (3 tasks, ~2-3 hours)

**Priority**: HIGH (Authentication is critical)

| # | Task | Source | Destination | Lines |
|---|------|--------|-------------|-------|
| 21 | Auth routes | `buildrai-platform/src/app/api/auth/` | `auth-service/src/routes/auth.ts` | ~200 |
| 22 | User routes | `buildrai-platform/src/app/api/usage/`, `/tokens/` | `auth-service/src/routes/users.ts` | ~300 |
| 23 | Clerk integration | `buildrai-platform/src/app/api/webhooks/clerk/` | `auth-service/src/lib/clerk.ts` | ~150 |

**Files to Migrate**:
- `api/auth/validate/route.ts`
- `api/usage/route.ts`
- `api/tokens/purchase/route.ts`
- `api/webhooks/clerk/route.ts`

**Estimated Lines**: ~650 lines of code

---

### Phase 5: Worker Service (2 tasks, ~3-4 hours)

**Priority**: MEDIUM (Background processing)

| # | Task | Source | Destination | Lines |
|---|------|--------|-------------|-------|
| 24 | Autonomous agent | `buildrai-platform/src/lib/ai/autonomous-agent.ts` | `worker-service/src/workers/autonomous-agent.ts` | ~800 |
| 25 | Email worker | `buildrai-platform/src/lib/notifications/` | `worker-service/src/workers/email-worker.ts` | ~400 |

**Files to Migrate**:
- `lib/ai/autonomous-agent.ts`
- `lib/queue/` directory
- `lib/notifications/email-service.ts`
- `lib/workers/agent-worker.ts`

**Estimated Lines**: ~1,200 lines of code

---

### Phase 6: API Service (4 tasks, ~4-5 hours)

**Priority**: MEDIUM-HIGH

| # | Task | Source | Destination | Lines |
|---|------|--------|-------------|-------|
| 26 | Project routes | `buildrai-platform/src/app/api/projects/` | `api-service/src/routes/projects.ts` | ~600 |
| 27 | File routes | `buildrai-platform/src/app/api/files/` | `api-service/src/routes/files.ts` | ~400 |
| 28 | GitHub routes | `buildrai-platform/src/app/api/github/` | `api-service/src/routes/github.ts` | ~500 |
| 29 | Integration routes | `buildrai-platform/src/app/api/integrations/` | `api-service/src/routes/integrations.ts` | ~400 |

**Additional Files**:
- `api/deployment/` - Deployment routes
- `api/preview/` - Preview environments
- `api/api-testing/` - API testing
- `lib/s3.ts` - S3 operations
- `lib/github.ts` - GitHub API client
- `lib/docker.ts` - Docker operations

**Estimated Lines**: ~2,900 lines of code

---

### Phase 7: Terraform Modules (4 tasks, ~3-4 hours)

**Priority**: MEDIUM (For deployment)

| # | Task | Files | Lines |
|---|------|-------|-------|
| 30 | VPC module | `terraform/modules/vpc/main.tf` | ~200 |
| 31 | ECS module | `terraform/modules/ecs/main.tf` | ~400 |
| 32 | ALB module | `terraform/modules/alb/main.tf` | ~300 |
| 33 | S3+CloudFront | `terraform/modules/s3-cloudfront/main.tf` | ~250 |

**Modules to Create**:

#### VPC Module (`terraform/modules/vpc/`)
- `main.tf` - VPC, subnets, NAT gateways, IGW
- `variables.tf` - Input variables
- `outputs.tf` - VPC ID, subnet IDs, etc.

#### ECS Module (`terraform/modules/ecs/`)
- `main.tf` - ECS cluster, services, task definitions
- `task-definitions/` - JSON for each service
- `auto-scaling.tf` - Auto-scaling policies
- `variables.tf`
- `outputs.tf`

#### ALB Module (`terraform/modules/alb/`)
- `main.tf` - ALB, target groups
- `listeners.tf` - HTTP/HTTPS listeners
- `target-groups.tf` - Target groups for each service
- `variables.tf`
- `outputs.tf`

#### S3+CloudFront Module (`terraform/modules/s3-cloudfront/`)
- `s3.tf` - S3 bucket for frontend
- `cloudfront.tf` - CloudFront distribution
- `variables.tf`
- `outputs.tf`

**Estimated Lines**: ~1,150 lines of Terraform code

---

### Phase 8: CI/CD & Scripts (2 tasks, ~2 hours)

**Priority**: LOW (Can deploy manually first)

| # | Task | Files | Lines |
|---|------|-------|-------|
| 34 | GitHub Actions | `.github/workflows/*.yml` | ~400 |
| 35 | Deployment scripts | `scripts/*.sh` | ~300 |

**Workflows to Create**:
- `ai-service.yml` - Build, test, deploy AI service
- `auth-service.yml` - Build, test, deploy Auth service
- `worker-service.yml` - Build, test, deploy Worker service
- `api-service.yml` - Build, test, deploy API service
- `frontend.yml` - Build, deploy to S3+CloudFront

**Scripts to Create**:
- `build-and-push.sh` - Build all Docker images, push to ECR
- `deploy-ecs.sh` - Deploy all services to ECS
- `deploy-frontend.sh` - Deploy frontend to S3
- `create-secrets.sh` - Create AWS Secrets Manager secrets
- `rollback.sh` - Rollback to previous version

**Estimated Lines**: ~700 lines (YAML + bash)

---

## 📊 Summary Statistics

### Total Code to Migrate
- **Database Models**: 11 files, ~1,500 lines
- **Utilities/Middleware**: 8 files, ~800 lines
- **AI Service**: ~3,200 lines
- **Auth Service**: ~650 lines
- **Worker Service**: ~1,200 lines
- **API Service**: ~2,900 lines
- **Terraform**: ~1,150 lines
- **CI/CD**: ~700 lines

**TOTAL**: ~12,100 lines of code to migrate/create

### Time Estimates
- Phase 1 (Shared Library): 3-4 hours
- Phase 2 (Utils/Middleware): 2-3 hours
- Phase 3 (AI Service): 4-5 hours
- Phase 4 (Auth Service): 2-3 hours
- Phase 5 (Worker Service): 3-4 hours
- Phase 6 (API Service): 4-5 hours
- Phase 7 (Terraform): 3-4 hours
- Phase 8 (CI/CD): 2 hours

**TOTAL**: 23-30 hours of focused work

---

## 🎯 Recommended Approach

### Option 1: Full Migration (Recommended)
**Timeline**: 3-4 days of focused work

**Day 1**: Shared library + utilities (Phases 1-2)
**Day 2**: AI Service + Auth Service (Phases 3-4)
**Day 3**: Worker + API Services (Phases 5-6)
**Day 4**: Terraform + CI/CD (Phases 7-8)

### Option 2: Phased Approach
**Week 1**: Shared library + AI Service (most critical)
**Week 2**: Auth Service + Worker Service
**Week 3**: API Service
**Week 4**: Terraform + CI/CD + Testing

### Option 3: Minimal Viable Migration
**Focus on**: AI Service + Auth Service only
**Deploy**: 2 services first, add others later
**Timeline**: 1-2 days

---

## ⚠️ Migration Complexity Notes

### High Complexity Areas
1. **AI Service** - Lots of logic, streaming, Claude API integration
2. **Service-to-service auth** - Need internal API key validation
3. **Database connections** - Shared MongoDB, need proper connection pooling
4. **Environment variables** - Different per service, need careful mapping

### Medium Complexity
1. **Auth middleware** - JWT validation, user context
2. **Worker queues** - BullMQ setup, job processing
3. **Terraform modules** - ECS task definitions, networking

### Low Complexity
1. **Models** - Mostly copy-paste with minor adjustments
2. **Static utilities** - Logger, encryption functions
3. **Simple routes** - CRUD operations

---

## 🚀 Next Steps

**Current Status**: ✅ User model migrated (1/35 tasks complete)

**Immediate Next**:
1. Continue with remaining models (Tasks 2-8)
2. Implement utilities and middleware (Tasks 9-16)
3. Then start on services

**Do you want me to**:
- [ ] **Continue migrating everything now** (will take significant time in this session)
- [ ] **Create detailed code snippets for each task** (for you to implement)
- [ ] **Prioritize and migrate AI + Auth services only** (most critical 40%)
- [ ] **Create automated migration scripts** (to speed up the process)

---

**Current Progress**: 1/35 tasks (3%)
**Estimated Remaining**: 29 hours of work
**Recommendation**: Either continue in this session, or I can create detailed implementation guides for you to execute at your own pace.

Let me know how you'd like to proceed! 🚀
