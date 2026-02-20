#!/bin/sh
set -eu

echo "[entrypoint] Node version: $(node -v)"
echo "[entrypoint] Working dir: $(pwd)"
cd /app

# Optional dotenv file (do not fail if missing)
if [ -f "/app/app.env" ]; then
  export DOTENV_CONFIG_PATH="app.env"
  echo "[entrypoint] using DOTENV_CONFIG_PATH=${DOTENV_CONFIG_PATH}"
else
  echo "[entrypoint] no app.env found; relying on container ENV"
fi

echo "[entrypoint] prisma:generate"
npm run prisma:generate

echo "[entrypoint] prisma:migrate:deploy"
npm run prisma:migrate:deploy

if [ "${SEED_ON_BOOT:-false}" = "true" ] && [ "${NODE_ENV:-development}" != "production" ]; then
  echo "[entrypoint] seed (non-prod)"
  npm run seed
else
  echo "[entrypoint] skip seed (SEED_ON_BOOT=${SEED_ON_BOOT:-false}, NODE_ENV=${NODE_ENV:-unset})"  
fi

echo "[entrypoint] starting Next.js"
exec npm run start