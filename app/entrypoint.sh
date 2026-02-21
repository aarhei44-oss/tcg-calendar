
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

# --- Start Next.js in background so we can call the seed API ---
echo "[entrypoint] starting Next.js (background)"
npm run start &
APP_PID=$!

# --- Wait for HTTP to be ready (/api/health/check) ---
echo "[entrypoint] waiting for app to be ready..."
RETRIES=30
until curl -fsS http://127.0.0.1:3000/api/health/check >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
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

      # Build JSON array from SEED_INSTALLS (comma-separated)
      INSTALLS_ENV="${SEED_INSTALLS:-default}"
      INSTALLS_JSON="["
      IFS=','; set -- $INSTALLS_ENV
      IDX=0
      for NAME in "$@"; do
        # (Minimal changes: no trimming; assume clean values)
        if [ $IDX -gt 0 ]; then INSTALLS_JSON="${INSTALLS_JSON}, "; fi
        INSTALLS_JSON="${INSTALLS_JSON}\"${NAME}\""
        IDX=$((IDX+1))
      done
      INSTALLS_JSON="${INSTALLS_JSON}]"

      # Use provided SEED_OPTIONS or default to {"seed":true}
      OPTIONS_JSON=${SEED_OPTIONS:-'{"seed":true}'}

      # Compose payload safely via a temp file
      PAYLOAD_FILE=$(mktemp)
      printf '{"installs": %s, "options": %s}\n' "$INSTALLS_JSON" "$OPTIONS_JSON" > "$PAYLOAD_FILE"

      if curl -fsS -X POST "http://127.0.0.1:3000/api/admin/enable-profiles" \
           -H "Content-Type: application/json" \
           -d @"$PAYLOAD_FILE"; then
        echo
        echo "[entrypoint] seed succeeded"
        touch /app/.seeded
      else
        echo
        echo "[entrypoint] seed failed (continuing; check server logs)"
      fi

      rm -f "$PAYLOAD_FILE"
    else
      echo "[entrypoint] seed already done (.seeded present) — skipping"
    fi
  else
    echo "[entrypoint] skip seed (SEED_ON_BOOT=${SEED_ON_BOOT:-false})"
  fi
fi

# --- Bring the app to foreground ---
wait $APP_PID
