# Single-install pattern for reliability (Next.js + pnpm)
FROM node:20-bullseye AS builder
WORKDIR /app

# Copy manifests first to leverage build cache
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and all deps (including dev deps needed for build)
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile

# Now copy the rest of the source
COPY . .

# Optional: Prisma generate if you add Prisma later
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Build the Next.js app
RUN pnpm build


# Runtime image
FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production

# Writable directory for SQLite/data
RUN mkdir -p /app/data

# Copy runtime artifacts from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000"]
