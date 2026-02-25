
#!/bin/sh
set -e

echo "[entrypoint] Node version: $(node -v)"
echo "[entrypoint] Working dir: $(pwd)"
cd /app

# Cleanup handler to stop background server on exit
cleanup() {
  if [ -n "${APP_PID:-}" ] && kill -0 "$APP_PID" 2>/dev/null; then
    echo "[entrypoint] stopping background app (pid=$APP_PID)"
    kill "$APP_PID" || true
  fi
}
trap cleanup EXIT

# Optional dotenv file
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

# --- Start Next.js in background so we can call the seed API ---
echo "[entrypoint] starting Next.js (background)"
npm run start &
APP_PID=$!

# --- Wait for HTTP to be ready (/api/health/check) ---
echo "[entrypoint] waiting for app to be ready..."
RETRIES=30
until curl -fsS "http://127.0.0.1:3000/api/health/check" >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo " - waiting (retries left: $RETRIES)"
  RETRIES=$((RETRIES-1))
  sleep 1
done

if [ $RETRIES -eq 0 ]; then
  echo "[entrypoint] app did not become ready in time; continuing without seed"
else
  # --- Seed via HTTP (idempotent) ---
  if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
    if [ ! -f "/app/.seeded" ]; then
      echo "[entrypoint] seed via /api/admin/enable-profiles"

      # Support URL-level fresh flag if SEED_FRESH=true
      FRESH_QS=""
      if [ "${SEED_FRESH:-false}" = "true" ]; then
        FRESH_QS="?fresh=1"
      fi

      # IMPORTANT: send a POST with NO BODY. The handler will:
      # 1) Ensure packages & installs exist,
      # 2) Default to "all installs",
      # 3) Honor ?fresh=1 if present.
      if curl -fsS -X POST "http://127.0.0.1:3000/api/admin/enable-profiles${FRESH_QS}"; then
        echo
        echo "[entrypoint] seed succeeded"
        touch /app/.seeded
      else
        echo
        echo "[entrypoint] seed failed (continuing; check server logs)"
      fi
    else
      echo "[entrypoint] seed already done (.seeded present) — skipping"
    fi
  else
    echo "[entrypoint] skip seed (SEED_ON_BOOT=${SEED_ON_BOOT:-false})"
  fi
fi

# --- Bring the app to foreground ---
wait $APP_PID
