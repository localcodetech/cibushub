#!/usr/bin/env bash
# Saves a compressed copy of the real site's database, keeps the last 14 days on the VPS,
# and copies each one to Backblaze B2, so a lost VPS doesn't take the backups with it
# [AC-DB-06]. The demo isn't backed up: its seeders rebuild it. Run it from anywhere:
#   sudo ./deploy/backup.sh
# Runs every night at 02:30 from root's crontab (see docs/deployment.md).
set -euo pipefail

cd "$(dirname "$0")/.."
compose() { docker compose -f compose.prod.yaml --env-file .env.production "$@"; }

BACKUP_DIR=/var/backups/cibushub
TODAY=$(date +%F)
FILE="$BACKUP_DIR/cibushub-$TODAY.sql.gz"
# The rclone remote ("offsite", set up with: sudo rclone config) and the bucket in it
OFFSITE="offsite:cibushub-backups"

mkdir -p "$BACKUP_DIR"

echo "→ Backing up the cibushub database"
# Runs inside the mysql container, which fills in its own root password. MYSQL_PWD hands
# it over without putting it on the command line (no "insecure" warning).
# --single-transaction: a consistent copy without locking tables, so orders keep coming in
compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines cibushub' \
  | gzip > "$FILE"

echo "→ Copying it off the server"
rclone copy "$FILE" "$OFFSITE"

echo "→ Removing backups older than 14 days"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +14 -delete

echo "✓ Backup saved: $FILE ($(du -h "$FILE" | cut -f1))"
