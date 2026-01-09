# =============================================================================
# AIQLick Meeting - Custom Jitsi Meet Web UI
# Multi-stage Docker build based on community best practices
# https://github.com/jitsi/docker-jitsi-meet/issues/1824
# =============================================================================

# Build argument for base image tag (allows pinning to specific version)
ARG JITSI_WEB_TAG=stable-9823

# =============================================================================
# Stage 1: Build the custom Jitsi Meet frontend
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies required for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./
COPY .npmrc ./

# Install dependencies with legacy peer deps (required for jitsi-meet)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application using the Makefile
# This compiles webpack bundles and deploys assets to libs/
RUN NODE_OPTIONS=--max-old-space-size=8192 make compile deploy

# =============================================================================
# Stage 2: Create production image based on official jitsi/web
# This preserves nginx config, entrypoint scripts, and runtime setup
# =============================================================================
FROM jitsi/web:${JITSI_WEB_TAG}

LABEL org.opencontainers.image.title="AIQLick Meeting"
LABEL org.opencontainers.image.description="Custom Jitsi Meet UI for AIQLick recruitment platform"
LABEL org.opencontainers.image.source="https://github.com/AiQlickProject/aiqlick-meeting"

# Copy built assets from builder stage, replacing official files
# These are the compiled JavaScript bundles and static assets
COPY --from=builder /app/libs /usr/share/jitsi-meet/libs

# Copy CSS
COPY --from=builder /app/css/all.css /usr/share/jitsi-meet/css/all.css

# Copy language files (translations)
COPY --from=builder /app/lang /usr/share/jitsi-meet/lang

# Copy images (logos, icons, backgrounds)
COPY --from=builder /app/images /usr/share/jitsi-meet/images

# Copy sounds (notification sounds)
COPY --from=builder /app/sounds /usr/share/jitsi-meet/sounds

# Copy fonts
COPY --from=builder /app/fonts /usr/share/jitsi-meet/fonts

# Copy static files
COPY --from=builder /app/static /usr/share/jitsi-meet/static

# Copy resources (prosody plugins, etc.)
COPY --from=builder /app/resources /usr/share/jitsi-meet/resources

# Copy HTML files
COPY --from=builder /app/*.html /usr/share/jitsi-meet/

# Copy root JS config files
COPY --from=builder /app/config.js /usr/share/jitsi-meet/
COPY --from=builder /app/interface_config.js /usr/share/jitsi-meet/
COPY --from=builder /app/manifest.json /usr/share/jitsi-meet/
COPY --from=builder /app/pwa-worker.js /usr/share/jitsi-meet/

# The base image already exposes ports 80 and 443
# and has the correct entrypoint for runtime configuration
