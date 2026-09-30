# Multi-stage build for AI Service
# Optimized for production deployment
# Build context must be the repository root to access shared package

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy shared package first
COPY shared/ ./shared/

# Copy service package.json and install
COPY ai-service/package.json ./ai-service/
WORKDIR /app/ai-service
RUN npm install --omit=dev

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy shared package
COPY shared/ ./shared/

# Copy dependencies and source
COPY --from=deps /app/ai-service/node_modules ./ai-service/node_modules
COPY ai-service/ ./ai-service/

WORKDIR /app/ai-service

# Build TypeScript
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 aiservice

# Copy built application
COPY --from=builder --chown=aiservice:nodejs /app/ai-service/dist ./dist
COPY --from=builder --chown=aiservice:nodejs /app/ai-service/node_modules ./node_modules
COPY --from=builder --chown=aiservice:nodejs /app/ai-service/package.json ./package.json

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER aiservice

EXPOSE 4000

CMD ["node", "dist/server.js"]
