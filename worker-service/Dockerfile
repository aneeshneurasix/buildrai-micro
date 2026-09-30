# Multi-stage build for Worker Service
# Build context must be the repository root to access shared package

FROM node:20-alpine AS deps
WORKDIR /app

# Copy shared package first
COPY shared/ ./shared/

# Copy service package.json and install
COPY worker-service/package.json ./worker-service/
WORKDIR /app/worker-service
RUN npm install --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app

# Copy and build shared package first
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install
RUN npm run build

# Copy service source and package.json
WORKDIR /app
COPY worker-service/ ./worker-service/
WORKDIR /app/worker-service

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Build TypeScript
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workerservice

COPY --from=builder --chown=workerservice:nodejs /app/worker-service/dist ./dist
COPY --from=builder --chown=workerservice:nodejs /app/worker-service/node_modules ./node_modules
COPY --from=builder --chown=workerservice:nodejs /app/worker-service/package.json ./package.json

USER workerservice
CMD ["node", "dist/index.js"]
