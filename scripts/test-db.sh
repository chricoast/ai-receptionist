#!/usr/bin/env bash
# Runs all Supabase migrations plus the RLS isolation tests against a
# throwaway local Postgres (no Docker, no connection to the real project).
#
# Requires PostgreSQL server binaries (initdb, pg_ctl) on this machine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$BIN" ] && command -v pg_config >/dev/null; then BIN="$(pg_config --bindir)"; fi
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then
  echo "PostgreSQL server binaries not found (need initdb/pg_ctl)." >&2
  exit 1
fi

WORK="$(mktemp -d)"
PORT="${TEST_DB_PORT:-54329}"
RUN=()
# Postgres refuses to run as root; use the postgres system user if we are root.
if [ "$(id -u)" = "0" ]; then
  chown postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

cleanup() {
  "${RUN[@]}" "$BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN[@]}" "$BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"${RUN[@]}" "$BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -w start >/dev/null

PSQL=("$BIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
# All test files run in one database session, in order, so later files can
# reuse the fixtures and helpers of earlier ones.
TEST_FILES=("$ROOT/supabase/tests/rls_isolation.test.sql" "$ROOT/supabase/tests/chat_isolation.test.sql")
for f in "${TEST_FILES[@]}"; do echo "Running $(basename "$f")"; done
cat "${TEST_FILES[@]}" | "${PSQL[@]}" -tA 2>&1 \
  | sed -e '/^$/d' -e 's/^psql:[^ ]* NOTICE:  /  /' -e 's/^NOTICE:  /  /' \
  | grep -v -e '^[0-9a-f-]\{36\}$' -e '^wc_'
