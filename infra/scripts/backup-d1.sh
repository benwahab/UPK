#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if command -v pnpm >/dev/null 2>&1; then
  PNPM=pnpm
else
  PNPM="corepack pnpm"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="upk-$STAMP"
SQL="${TMPDIR:-/tmp}/$BASE.sql"
GZ="$SQL.gz"
CONFIG="../../infra/wrangler.toml"
BUCKET="upk-backups"
KEY="d1/$BASE.sql.gz"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  export CLOUDFLARE_API_TOKEN="${CLOUDFARE_API_TOKEN:?CLOUDFLARE_API_TOKEN ou CLOUDFARE_API_TOKEN requis}"
fi

$PNPM -C apps/web exec wrangler d1 export upk --remote \
  --config "$CONFIG" --compatibility sqlite3_cli_only -y --output "$SQL"

gzip -c "$SQL" > "$GZ"
SHA="$(sha256sum "$GZ" | cut -d' ' -f1)"
printf '%s  %s\n' "$SHA" "$BASE.sql.gz" > "$GZ.sha256"

$PNPM -C apps/web exec wrangler r2 object put "$BUCKET/$KEY" --file "$GZ" --remote
$PNPM -C apps/web exec wrangler r2 object put "$BUCKET/$KEY.sha256" --file "$GZ.sha256" --remote

printf 'Sauvegarde : r2://%s/%s\nSHA-256 : %s\n' "$BUCKET" "$KEY" "$SHA"
rm -f "$SQL" "$GZ" "$GZ.sha256"
