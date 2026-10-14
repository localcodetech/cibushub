#!/usr/bin/env bash
# Saves a compressed copy of the real site's database, and keeps the last 14 days
# [AC-DB-06]. The demo isn't backed up: its seeders rebuild it. Run it from anywhere:
#   ./deploy/backup.sh
set -euo pipefail

cd "$(dirname "$0")/.."
compose() { docker compose -f compose.prod.yaml --env-file .env.production "$@"; }

BACKUP_DIR=/var/backups/cibushub
TODAY=$(date +%F)
FILE="$BACKUP_DIR/cibushub-$TODAY.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "→ Backing up the cibushub database"
# Runs inside the mysql container, which fills in its own root password.
# --single-transaction: a consistent copy without locking tables, so orders keep coming in
compose exec -T mysql sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines cibushub' \
  | gzip > "$FILE"

echo "→ Removing backups older than 14 days"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +14 -delete

echo "✓ Backup saved: $FILE ($(du -h "$FILE" | cut -f1))"
