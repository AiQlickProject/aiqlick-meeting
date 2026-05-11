# =============================================================================
# AIQLick Meeting — React shell that embeds Jitsi via the IFrame API
# Multi-stage build: Vite build → nginx serve static assets
# =============================================================================

# Build version for cache busting (set by CI/CD).
ARG BUILD_VERSION=dev

# =============================================================================
# Stage 1: Build the React app with Vite
# =============================================================================
FROM node:22-slim AS builder

ARG BUILD_VERSION

WORKDIR /app

# Copy package files first so the npm install layer is cached
# whenever package*.json don't change.
COPY package*.json ./
COPY .npmrc* ./

RUN npm ci

# Copy source and build.
COPY . .

# Inject the build version into the bundle for cache busting / debug.
ENV VITE_BUILD_VERSION=$BUILD_VERSION

RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

# =============================================================================
# Stage 2: Serve static assets via nginx
# =============================================================================
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="AIQLick Meeting"
LABEL org.opencontainers.image.description="React shell embedding Jitsi via IFrame API for the AIQLick recruitment platform"
LABEL org.opencontainers.image.source="https://github.com/AiQlickProject/aiqlick-meeting"

# Replace the default site config so we always revalidate the entry
# bundle (so deploys land on next page load) but keep hashed assets
# under /assets/* on a long immutable cache.
COPY <<'NGINX_CONF' /etc/nginx/conf.d/default.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Vite emits hashed filenames under /assets/* — safe to long-cache.
    location /assets/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        try_files $uri =404;
    }

    # Brand assets — unhashed but rarely change. Short cache so logo
    # swaps land quickly without manual cache-busting.
    location /images/ {
        access_log off;
        expires 1h;
        add_header Cache-Control "public, max-age=3600" always;
        try_files $uri =404;
    }

    # Entry HTML must always revalidate so deploys are visible on
    # the next page load without forcing users to hard-refresh.
    location = / {
        add_header Cache-Control "no-cache" always;
        try_files /index.html =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    # SPA fallback — any path that isn't a static file maps to index.html
    # so room slugs like /aiqlick-general-... render via React.
    location / {
        try_files $uri /index.html;
    }
}
NGINX_CONF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
