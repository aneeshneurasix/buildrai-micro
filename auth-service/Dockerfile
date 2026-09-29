# Multi-stage build for Auth Service

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 authservice

COPY --from=builder --chown=authservice:nodejs /app/dist ./dist
COPY --from=builder --chown=authservice:nodejs /app/node_modules ./node_modules
COPY --chown=authservice:nodejs package.json ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER authservice
EXPOSE 4001
CMD ["node", "dist/server.js"]
