#!/usr/bin/env bash
# Copy the PTO Tracker's tables from Supabase into the Azure flexible server.
#
# Safe to re-run: it drops and recreates only the pto_* objects, so running it
# again at cutover refreshes the data without touching anything else.
#
# The Supabase `public` schema is SHARED with the Technical Playbook (25 other
# tables live there). Everything below is therefore scoped to `pto_*` by name —
# never dump or restore the whole schema from this project.
#
#   SUPABASE_DB_PASSWORD=... ./infra/migrate-db.sh
set -euo pipefail

SRC_HOST="${SRC_HOST:-db.wmglpvxdcehbrfcbrxzd.supabase.co}"
SRC_USER="${SRC_USER:-postgres}"
SRC_DB="${SRC_DB:-postgres}"
RG="${RG:-rg-pto-tracker}"
PG_SERVER="${PG_SERVER:-psql-pto-tracker-2f270c}"
KV="${KV:-kv-fsw-pto-2f270c}"
DST_DB="${DST_DB:-ptotracker}"
DST_USER="${DST_USER:-ptoadmin}"

: "${SUPABASE_DB_PASSWORD:?set SUPABASE_DB_PASSWORD (Supabase -> Project Settings -> Database)}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

DST_HOST="$(az postgres flexible-server show -g "$RG" -n "$PG_SERVER" --query fullyQualifiedDomainName -o tsv)"
DST_PASSWORD="$(az keyvault secret show --vault-name "$KV" -n pg-admin-password --query value -o tsv)"

echo "==> dumping pto_* from $SRC_HOST"
# Enum types first: pg_dump -t covers tables, sequences and indexes but NOT the
# types their columns depend on, so a restore without these fails on the first
# CREATE TABLE.
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$SRC_HOST" -U "$SRC_USER" -d "$SRC_DB" -X -At -c "
  select 'create type public.' || t.typname || ' as enum (' ||
         string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) || ');'
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname like 'pto%'
  group by t.typname order by 1;" > "$WORK/10_types.sql"

# Tables, indexes, constraints, RLS policies and data.
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump -h "$SRC_HOST" -U "$SRC_USER" -d "$SRC_DB" \
  --no-owner --no-privileges -t 'public.pto_*' -f "$WORK/20_tables.sql"

# Functions, likewise invisible to -t.
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$SRC_HOST" -U "$SRC_USER" -d "$SRC_DB" -X -At -c "
  select string_agg(pg_get_functiondef(p.oid), E';\n\n' order by p.proname) || ';'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'pto%';" > "$WORK/30_functions.sql"

echo "==> restoring into $DST_HOST/$DST_DB"
export PGPASSWORD="$DST_PASSWORD"
run() { psql "host=$DST_HOST port=5432 dbname=$DST_DB user=$DST_USER sslmode=require" -X -v ON_ERROR_STOP=1 "$@"; }

run -f "$HERE/azure-bootstrap.sql"

# Idempotent reset of just this app's objects.
run -c "drop table if exists pto_action_tokens, pto_credentials, pto_notifications,
          pto_requests, pto_accounts, pto_employees, pto_approver_routing, pto_settings cascade;
        drop sequence if exists pto_request_seq cascade;
        do \$\$ declare r record; begin
          for r in select p.oid::regprocedure as sig from pg_proc p
                   join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname like 'pto%'
          loop execute 'drop function if exists ' || r.sig || ' cascade'; end loop;
          for r in select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
                   where n.nspname = 'public' and t.typname like 'pto%' and t.typtype = 'e'
          loop execute 'drop type if exists public.' || quote_ident(r.typname) || ' cascade'; end loop;
        end \$\$;"

run -f "$WORK/10_types.sql"
run -f "$WORK/20_tables.sql"
run -f "$WORK/30_functions.sql"
run -f "$HERE/azure-grants.sql"

echo "==> row counts (source -> destination)"
for t in pto_employees pto_accounts pto_requests pto_notifications \
         pto_approver_routing pto_settings pto_credentials pto_action_tokens; do
  src=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$SRC_HOST" -U "$SRC_USER" -d "$SRC_DB" -X -At -c "select count(*) from public.$t")
  dst=$(PGPASSWORD="$DST_PASSWORD" psql "host=$DST_HOST dbname=$DST_DB user=$DST_USER sslmode=require" -X -At -c "select count(*) from public.$t")
  flag=$([ "$src" = "$dst" ] && echo OK || echo MISMATCH)
  printf '  %-24s %6s -> %-6s %s\n' "$t" "$src" "$dst" "$flag"
done
echo "done."
