FROM node:24-trixie-slim AS dev
RUN mkdir -p /app/node_modules && chown -R node:node /app
USER node
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./
EXPOSE 5173
CMD [ "npm", "run", "dev" ]

# ─────────────────────────────────────────────
# Production build: the app compiled to plain files in /app/dist.
# VITE_ values are baked into the files at build time, and they are PUBLIC (anyone can read them).
# VITE_API_URL stays empty: the browser calls /api on the same address, and Caddy forwards it.
# One build serves both sites (cibushubgh.com and demo.cibushubgh.com): nothing in it is
# specific to one of them.
# ─────────────────────────────────────────────
FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_APPLE_SERVICE_ID=""
ARG VITE_FACEBOOK_APP_ID=""
ARG VITE_SENTRY_DSN=""
ENV VITE_API_URL="" \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_APPLE_SERVICE_ID=$VITE_APPLE_SERVICE_ID \
    VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

# ─────────────────────────────────────────────
# Production web server: Caddy serves the built app, forwards /api and /socket.io to the
# api container, and gets HTTPS certificates by itself (AC-SEC-10)
# ─────────────────────────────────────────────
FROM caddy:2.10-alpine AS web
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
