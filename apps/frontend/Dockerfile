# ── Stage 1: prune ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @story-generator/frontend --docker

# ── Stage 2: install ───────────────────────────────────────────────────────────
FROM node:20-alpine AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci --ignore-scripts

# ── Stage 3: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
ARG NEXT_PUBLIC_API_URL=http://backend:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json .
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/frontend

# ── Stage 4: production ────────────────────────────────────────────────────────
# next build --standalone already traces and bundles every required node_module
# into .next/standalone/node_modules — no separate node_modules copy needed.
FROM node:20-alpine AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER appuser
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/frontend/server.js"]
