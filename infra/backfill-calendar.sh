#!/usr/bin/env bash
# Push already-approved leave onto the Microsoft 365 company calendar.
#
# WHY THIS EXISTS. `sync-pto-calendar` is event-driven: it fires when a request
# is approved or edited, and writes that one event. It has no notion of history,
# so switching the integration on leaves the calendar empty while the tracker is
# full of approved leave -- which reads as broken rather than as new.
#
# The subscribable ICS feed never had this problem because Outlook re-downloads
# the whole file on every poll. Graph is push-based, so the history has to be
# pushed once. After that the event-driven sync keeps it current and this script
# is only needed again after a calendar is recreated or wiped.
#
# SAFE TO RE-RUN. The function matches an existing event on the request id held
# in a Graph extended property, so a second run updates in place rather than
# duplicating. A half-finished run can simply be repeated.
#
#   ./infra/backfill-calendar.sh          # every approved request
#   ./infra/backfill-calendar.sh 2026-01-01   # only those ending on/after a date
set -euo pipefail

RG="${RG:-rg-pto-tracker}"
KV="${KV:-kv-fsw-pto-2f270c}"
PG_HOST="${PG_HOST:-psql-pto-tracker-2f270c.postgres.database.azure.com}"
PG_USER="${PG_USER:-ptoadmin}"
PG_DB="${PG_DB:-ptotracker}"
SINCE="${1:-1900-01-01}"

export PATH="/usr/local/opt/libpq/bin:$PATH"
command -v psql >/dev/null || { echo "psql not found — brew install libpq" >&2; exit 1; }

secret() { az keyvault secret show --vault-name "$KV" -n "$1" --query value -o tsv; }

KONG="$(az containerapp show -g "$RG" -n ca-pto-kong --query properties.configuration.ingress.fqdn -o tsv)"
ANON="$(secret anon-key)"
export PGPASSWORD="$(secret pg-admin-password)"

# Approved only. The function itself re-checks status and will delete an event
# whose request is no longer approved, so this filter is an optimisation rather
# than the safety net.
IDS="$(psql "host=$PG_HOST user=$PG_USER dbname=$PG_DB sslmode=require" -tAc \
  "select id from pto_requests
    where status = 'Approved' and coalesce(end_date, start_date) >= date '$SINCE'
    order by start_date")"
unset PGPASSWORD

TOTAL=$(printf '%s\n' "$IDS" | grep -c . || true)
echo "==> $TOTAL approved request(s) ending on/after $SINCE"
[[ "$TOTAL" -gt 0 ]] || exit 0

ok=0; fail=0
while IFS= read -r id; do
  [[ -n "$id" ]] || continue
  code=$(curl -s -o /tmp/backfill-body -w '%{http_code}' --max-time 30 \
    -X POST "https://$KONG/functions/v1/sync-pto-calendar" \
    -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
    -d "{\"requestId\":\"$id\",\"action\":\"upsert\"}")
  if [[ "$code" == "200" ]]; then
    ok=$((ok+1)); printf "  %-16s ok\n" "$id"
  else
    fail=$((fail+1)); printf "  %-16s HTTP %s  %s\n" "$id" "$code" "$(head -c 200 /tmp/backfill-body)"
  fi
  # Graph throttles aggressively on burst writes; this keeps well under it.
  sleep 0.4
done <<< "$IDS"
rm -f /tmp/backfill-body

echo "==> $ok succeeded, $fail failed"
[[ "$fail" -eq 0 ]]
