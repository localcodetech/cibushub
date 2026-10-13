#!/usr/bin/env bash
# Puts the latest main branch live on the VPS, for both the real site and the demo
# [AC-OPS-04]. Run it from anywhere:
#   ./deploy/deploy.sh
# Order matters: new code is built first, the database changes run next (while the old
# version is still serving), and only then do the new containers replace the old ones.
set -euo pipefail

cd "$(dirname "$0")/.."
compose() { docker compose -f compose.prod.yaml --env-file .env.production "$@"; }

echo "→ Getting the latest code"
git pull --ff-only

echo "→ Building the images"
compose build

echo "→ Starting the database and Redis (if they aren't already)"
compose up -d mysql redis

echo "→ Running database migrations (real site, then demo)"
compose run --rm migrate
compose run --rm demo-migrate

echo "→ Starting the new version"
compose up -d --remove-orphans

echo "→ Removing old, unused images"
docker image prune -f

compose ps
echo "✓ Deployed. Check https://$(grep '^APP_DOMAIN=' .env.production | cut -d= -f2)/api/health"
echo "  and https://$(grep '^DEMO_DOMAIN=' .env.production | cut -d= -f2)/api/health"
