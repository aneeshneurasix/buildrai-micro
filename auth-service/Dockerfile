# Multi-stage build for Auth Service
# Build context must be the repository root to access shared package

FROM node:20-alpine AS deps
WORKDIR /app

# Copy shared package first
COPY shared/ ./shared/

# Copy service package.json and install
COPY auth-service/package.json ./auth-service/
WORKDIR /app/auth-service
RUN npm install --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app

# Copy shared package
COPY shared/ ./shared/

# Copy source and package.json
COPY auth-service/ ./auth-service/

WORKDIR /app/auth-service

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Build TypeScript
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 authservice

COPY --from=builder --chown=authservice:nodejs /app/auth-service/dist ./dist
COPY --from=builder --chown=authservice:nodejs /app/auth-service/node_modules ./node_modules
COPY --from=builder --chown=authservice:nodejs /app/auth-service/package.json ./package.json

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER authservice
EXPOSE 4001
CMD ["node", "dist/server.js"]
