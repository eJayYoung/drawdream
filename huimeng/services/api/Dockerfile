FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat git python3 make g++ py3-pip
RUN pip3 install --break-system-packages setuptools
WORKDIR /app

# Copy workspace root config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages/shared-types ./packages/shared-types
COPY services/api ./services/api

# Install all workspace dependencies (including shared-types)
# Use shamefully-hoist to avoid symlink issues in Docker
RUN npm install -g pnpm@8 && pnpm config set shamefully-hoist true && pnpm install -w

# Build API
FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm@8
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/services ./services
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/turbo.json ./turbo.json

# Build
RUN cd services/api && npx nest build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built dist and package.json
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./package.json

# Copy the entire node_modules from builder (contains .pnpm virtual store)
# This ensures symlinks resolve correctly since everything is under /app
COPY --from=builder /app/node_modules ./node_modules

# Copy packages (shared-types)
COPY --from=builder /app/packages ./packages

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
