# ── Stage 1: prune ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @story-generator/backend --docker

# ── Stage 2: prod-deps (runtime dependencies only) ─────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 3: installer (all deps needed to compile) ────────────────────────────
FROM node:20-alpine AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci --ignore-scripts

# ── Stage 4: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json .
RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=apps/backend

# ── Stage 5: production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

COPY --from=builder  --chown=appuser:appgroup /app/apps/backend/dist ./dist
COPY --from=builder  --chown=appuser:appgroup /app/apps/backend/drizzle ./drizzle
COPY --from=prod-deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder  --chown=appuser:appgroup /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder  --chown=appuser:appgroup /app/packages/shared/dist ./packages/shared/dist

USER appuser
EXPOSE 3001
CMD ["node", "dist/main.js"]
