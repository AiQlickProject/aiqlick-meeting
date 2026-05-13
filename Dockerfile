# =============================================================================
# AIQLick Meeting — Expo + React Native + Tamagui app (web target)
# Multi-stage: Metro export-web → nginx serve
#
# Mobile builds (iOS / Android) are produced separately by EAS Build,
# not by this Dockerfile.
# =============================================================================

ARG BUILD_VERSION=dev

# -----------------------------------------------------------------------------
# Stage 1: Build the web bundle via `expo export --platform web`
# -----------------------------------------------------------------------------
FROM node:22-slim AS builder

ARG BUILD_VERSION

WORKDIR /app

COPY package*.json ./
COPY .npmrc* ./

# Native modules need build tools available during install.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --no-audit --no-fund

COPY . .

ENV EXPO_PUBLIC_BUILD_VERSION=$BUILD_VERSION
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npx expo export --platform web --output-dir dist

# -----------------------------------------------------------------------------
# Stage 2: Serve the static export via nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="AIQLick Meeting"
LABEL org.opencontainers.image.description="Expo + React Native + Tamagui meeting client that embeds Jitsi (web target)"
LABEL org.opencontainers.image.source="https://github.com/AiQlickProject/aiqlick-meeting"

COPY <<'NGINX_CONF' /etc/nginx/conf.d/default.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Expo's static export hashes JS/CSS bundles under /_expo/static/*
    # so they can be aggressively cached forever.
    location /_expo/static/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        try_files $uri =404;
    }

    # Brand assets — short cache so logo swaps land quickly.
    location /images/ {
        access_log off;
        expires 1h;
        add_header Cache-Control "public, max-age=3600" always;
        try_files $uri =404;
    }

    # Entry HTML must always revalidate so deploys land on next load.
    location = / {
        add_header Cache-Control "no-cache" always;
        try_files /index.html =404;
    }
    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    # SPA fallback — room slugs like /aiqlick-general-... map to the
    # dynamic `[room].tsx` route via index.html.
    location / {
        try_files $uri /index.html;
    }
}
NGINX_CONF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
