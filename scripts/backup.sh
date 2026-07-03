#!/usr/bin/env bash
# Raw backup: snapshots the SQLite DB file + data/uploads/ into a timestamped
# tar.gz under ./backups/. This is a disaster-recovery snapshot, distinct
# from the portable site export (npm run — see /api/admin/export): a backup
# restores THIS exact deployment; an export moves content between sites.
#
# Only covers a local/file-based DATABASE_URL (file:./data/dev.db, the dev
# default). A Turso-hosted DB isn't a local file — use `turso db shell
# <db> .dump` (or the Turso dashboard's backup feature) for production data,
# and point DATABASE_URL_FILE below at nothing / skip the db copy manually.
set -euo pipefail

DB_URL="${DATABASE_URL:-file:./data/dev.db}"
DB_PATH="${DB_URL#file:}"
UPLOADS_DIR="data/uploads"
BACKUP_DIR="backups"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/backup-${TS}.tar.gz"

mkdir -p "$BACKUP_DIR"

if [[ "$DB_URL" != file:* ]]; then
  echo "⚠ DATABASE_URL is not a local file ($DB_URL) — this script only backs up"
  echo "  file-based SQLite DBs. For Turso, use \`turso db shell <db> .dump\` instead."
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

if [[ -f "$DB_PATH" ]]; then
  mkdir -p "$STAGE/data"
  cp "$DB_PATH" "$STAGE/data/$(basename "$DB_PATH")"
else
  echo "⚠ No database file found at $DB_PATH — skipping (backup will have no db)."
fi

if [[ -d "$UPLOADS_DIR" ]]; then
  mkdir -p "$STAGE/data"
  cp -R "$UPLOADS_DIR" "$STAGE/data/uploads"
else
  echo "⚠ No uploads directory found at $UPLOADS_DIR — skipping."
fi

tar -czf "$OUT" -C "$STAGE" .

echo "✓ Backup written to $OUT"
echo ""
echo "To restore:"
echo "  tar -xzf $OUT -C /tmp/restore"
echo "  cp /tmp/restore/data/$(basename "$DB_PATH") $DB_PATH"
echo "  rm -rf $UPLOADS_DIR && cp -R /tmp/restore/data/uploads $UPLOADS_DIR"
