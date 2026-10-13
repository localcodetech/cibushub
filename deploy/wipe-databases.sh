#!/usr/bin/env bash
# Deletes EVERYTHING in both databases (real site and demo) and empties Redis, leaving empty
# databases behind. For testing only: every account, restaurant and order is gone for good.
#
#   ./deploy/wipe-databases.sh
#   ./deploy/deploy.sh          (migrations build the empty tables again)
#   ./deploy/first-seed.sh      (super admins, demo owners and restaurants)
set -euo pipefail

cd "$(dirname "$0")/.."
compose() { docker compose -f compose.prod.yaml --env-file .env.production "$@"; }

echo "This deletes ALL accounts, restaurants, orders and payments on BOTH sites."
read -r -p "Type WIPE to continue: " answer
if [ "$answer" != "WIPE" ]; then
  echo "Nothing was deleted."
  exit 1
fi

echo "→ Emptying both databases"
compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
  DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`;
  DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}_demo\`;
  CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  CREATE DATABASE \`${MYSQL_DATABASE}_demo\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO \"$MYSQL_USER\"@\"%\";
  GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_demo\`.* TO \"$MYSQL_USER\"@\"%\";
  FLUSH PRIVILEGES;"'

echo "→ Emptying Redis (logins, codes, queued jobs, caches)"
compose exec -T redis redis-cli FLUSHALL

echo "✓ Wiped. Next: ./deploy/deploy.sh, then ./deploy/first-seed.sh"
