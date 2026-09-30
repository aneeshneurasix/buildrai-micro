# Multi-stage build for API Service
# Build context must be the repository root to access shared package

FROM node:20-alpine AS deps
WORKDIR /app

# Copy shared package first
COPY shared/ ./shared/

# Copy service package.json and install
COPY api-service/package.json ./api-service/
WORKDIR /app/api-service
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
COPY api-service/ ./api-service/
WORKDIR /app/api-service

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Build TypeScript
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiservice

COPY --from=builder --chown=apiservice:nodejs /app/api-service/dist ./dist
COPY --from=builder --chown=apiservice:nodejs /app/api-service/node_modules ./node_modules
COPY --from=builder --chown=apiservice:nodejs /app/api-service/package.json ./package.json

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER apiservice
EXPOSE 3000
CMD ["node", "dist/server.js"]
