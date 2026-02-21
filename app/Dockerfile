
# syntax=docker/dockerfile:1.7

############################################
# Stage 1: deps (install dev deps for build)
############################################
FROM node:20-bookworm-slim AS deps
WORKDIR /app

ENV CI=1
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

############################################
# Stage 2: build (Next.js production build)
############################################
FROM node:20-bookworm-slim AS build
WORKDIR /app

ENV CI=1
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

# Ensure dotenv-aware code looks at /app/app.env (if used),
# but Prisma must have DATABASE_URL *at build time*:
ENV DOTENV_CONFIG_PATH=app.env
ENV DATABASE_URL=file:./data/app.db

# Prisma Client for the build (no DB connection needed)
RUN npm run prisma:generate

# Build Next.js
RUN npm run build


############################################
# Stage 3: runner (production)
############################################
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Use container-correct SQLite path at runtime
ENV DATABASE_URL=file:../data/app.db

# --- Seed-on-boot defaults (can override at docker run) ---
ENV SEED_ON_BOOT=true
ENV SEED_INSTALLS=default
ENV SEED_OPTIONS='{"seed":true}'

# OS deps for Prisma at runtime (silence libssl warnings) + curl for seed HTTP call
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*

# Install runtime deps (keep dev so prisma CLI & tsx can run in entrypoint)
COPY --from=build /app/package*.json /app/
RUN npm ci

# --- Fallback: ensure Prisma 7 in the runner as well (lockfile may pin 6.x) ---
# You can remove this block once your lockfile is updated to Prisma 7 in the repo.
RUN node -e "try{const v=require('./node_modules/prisma/package.json').version; if(!/^7\\./.test(v)) process.exit(1)}catch(e){process.exit(1)}" || \
    (echo 'Forcing Prisma 7.4.0 for runtime (lockfile has 6.x)' && \
     npm i -D prisma@7.4.0 && npm i @prisma/client@7.4.0)

# Copy build output and sources needed at runtime
COPY --from=build /app/.next /app/.next
COPY --from=build /app/public /app/public
COPY --from=build /app/app /app/app
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/prisma.config.ts /app/prisma.config.ts
COPY --from=build /app/entrypoint.sh /app/entrypoint.sh

# Persist SQLite at /app/data
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Normalize entrypoint (strip BOM/CRLF) and run via sh
RUN set -eu; \
    BOM=$(printf '\357\273\277'); \
    sed -i "1s/^$BOM//" /app/entrypoint.sh; \
    sed -i 's/\r$//' /app/entrypoint.sh; \
    chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
