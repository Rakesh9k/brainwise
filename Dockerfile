# ==============================================================================
# BRAINWISE — ENTERPRISE PRODUCTION DOCKERFILE
# Multi-Stage, Hardened, Unprivileged Container for Google Cloud Run
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Dependencies & Source Artifacts
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy project source and configuration
COPY tsconfig.json vite.config.ts index.html ./
COPY public/ public/
COPY src/ src/
COPY server.ts ./

# Build both Vite static SPA bundle and bundled Node backend
ENV NODE_ENV=production
RUN npm run build:all

# ------------------------------------------------------------------------------
# Stage 2: Production Dependencies Only (Pruned)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime (Hardened & Non-Root)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Install tini (zombie process reaper + signal forwarder) and curl (healthcheck)
RUN apk add --no-cache tini curl

WORKDIR /app

# Security: Create non-root system user and group
RUN addgroup -S -g 10001 brainwise && \
    adduser -S -u 10001 -G brainwise -s /bin/sh -h /app brainwise

# Environment configuration
ENV NODE_ENV=production \
    PORT=8080 \
    CLIENT_DIST_DIR=/app/dist

# Copy production node_modules from dependencies stage
COPY --from=dependencies --chown=brainwise:brainwise /app/node_modules ./node_modules

# Copy package metadata
COPY --from=builder --chown=brainwise:brainwise /app/package.json ./package.json

# Copy compiled production artifacts (client SPA bundle + server.js)
COPY --from=builder --chown=brainwise:brainwise /app/dist ./dist

# Switch to unprivileged non-root user
USER brainwise

# Cloud Run defaults to port 8080
EXPOSE 8080

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health/live || exit 1

# Process supervisor and entrypoint
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
