#!/usr/bin/env bash
# Run once, after the very first ./deploy/deploy.sh on a new VPS:
#   ./deploy/first-seed.sh
# Real site: only its super admin (from SUPER_ADMIN_* in server/.env.production), never demo data.
# Demo: its super admin, and the demo restaurant owners with their 20 restaurants, dishes and
# photos. No demo customers, riders or admins: sign those up yourself to test the app by hand.
# Safe to run again: every seeder skips what already exists.
set -euo pipefail

cd "$(dirname "$0")/.."
compose() { docker compose -f compose.prod.yaml --env-file .env.production "$@"; }

echo "→ Real site: super admin"
compose run --rm migrate npx sequelize-cli db:seed --seed 20261006000001-super-admin.cjs

echo "→ Demo: super admin, restaurant owners, restaurants, dishes and photos"
for seeder in 20261006000001-super-admin.cjs 20261007000001-demo-restaurants.cjs 20261017000001-demo-photos-and-dishes.cjs; do
  compose run --rm demo-migrate npx sequelize-cli db:seed --seed "$seeder"
done

echo "✓ Seeded. Demo owners log in with password Demo2026, e.g. akua.owner@example.com."
