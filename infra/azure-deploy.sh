#!/usr/bin/env bash
# Build and deploy the PTO Tracker to Azure Container Apps.
#
# Build order matters. The frontend is a Vite SPA, so VITE_SUPABASE_URL is
# INLINED INTO THE BUNDLE AT BUILD TIME — the gateway must already exist and
# have its FQDN before the app image can be built. Changing the gateway URL or
# the anon key is a rebuild, never a restart.
#
#   ./infra/azure-deploy.sh            # build everything and roll all apps
#   ./infra/azure-deploy.sh app        # just the frontend
#   ./infra/azure-deploy.sh functions  # just the Edge Functions
set -euo pipefail

RG="${RG:-rg-pto-tracker}"
ACR="${ACR:-acrfswpto2f270c}"
KV="${KV:-kv-fsw-pto-2f270c}"
ENVIRONMENT="${ENVIRONMENT:-cae-pto-tracker}"
PG_SERVER="${PG_SERVER:-psql-pto-tracker-2f270c}"
TARGET="${1:-all}"
TAG="v$(date +%Y%m%d%H%M%S)"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

secret() { az keyvault secret show --vault-name "$KV" -n "$1" --query value -o tsv; }
ENV_DOMAIN="$(az containerapp env show -g "$RG" -n "$ENVIRONMENT" --query properties.defaultDomain -o tsv)"
KONG_FQDN="$(az containerapp show -g "$RG" -n ca-pto-kong --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || true)"

if [[ "$TARGET" == "all" || "$TARGET" == "functions" ]]; then
  echo "==> building pto-functions:$TAG"
  az acr build -r "$ACR" -t "pto-functions:$TAG" -f infra/Dockerfile.functions . -o none
  az containerapp update -g "$RG" -n ca-pto-functions \
    --image "$ACR.azurecr.io/pto-functions:$TAG" --revision-suffix "${TAG//v/r}" -o none
fi

if [[ "$TARGET" == "all" || "$TARGET" == "kong" ]]; then
  echo "==> building pto-kong:$TAG"
  az acr build -r "$ACR" -t "pto-kong:$TAG" -f infra/Dockerfile.kong . -o none
  az containerapp update -g "$RG" -n ca-pto-kong \
    --image "$ACR.azurecr.io/pto-kong:$TAG" --revision-suffix "${TAG//v/r}" -o none
fi

if [[ "$TARGET" == "all" || "$TARGET" == "app" ]]; then
  [[ -n "$KONG_FQDN" ]] || { echo "ca-pto-kong has no FQDN yet — deploy the gateway first" >&2; exit 1; }
  echo "==> building pto-app:$TAG against https://$KONG_FQDN"
  # EmailJS ids are public by design (they identify a browser-side template, and
  # EmailJS enforces its allow-list domain-side), so they are plain build args.
  az acr build -r "$ACR" -t "pto-app:$TAG" -f infra/Dockerfile.app . -o none \
    --build-arg "VITE_SUPABASE_URL=https://$KONG_FQDN" \
    --build-arg "VITE_SUPABASE_ANON_KEY=$(secret anon-key)" \
    --build-arg "VITE_EMAILJS_SERVICE_ID=${VITE_EMAILJS_SERVICE_ID:-}" \
    --build-arg "VITE_EMAILJS_PUBLIC_KEY=${VITE_EMAILJS_PUBLIC_KEY:-}" \
    --build-arg "VITE_EMAILJS_NEW_REQUEST_TEMPLATE_ID=${VITE_EMAILJS_NEW_REQUEST_TEMPLATE_ID:-}" \
    --build-arg "VITE_EMAILJS_REVIEWED_TEMPLATE_ID=${VITE_EMAILJS_REVIEWED_TEMPLATE_ID:-}" \
    --build-arg "VITE_EMAILJS_CANCELLED_TEMPLATE_ID=${VITE_EMAILJS_CANCELLED_TEMPLATE_ID:-}" \
    --build-arg "VITE_EMAILJS_SUBMITTED_TEMPLATE_ID=${VITE_EMAILJS_SUBMITTED_TEMPLATE_ID:-}"
  az containerapp update -g "$RG" -n ca-pto-app \
    --image "$ACR.azurecr.io/pto-app:$TAG" --revision-suffix "${TAG//v/r}" -o none
fi

APP_FQDN="$(az containerapp show -g "$RG" -n ca-pto-app --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || true)"
if [[ -n "$APP_FQDN" ]]; then
  echo "==> smoke test https://$APP_FQDN"
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$APP_FQDN/")
  echo "    GET / -> $code"
  [[ "$code" == "200" ]] || { echo "app did not return 200" >&2; exit 1; }
fi
echo "deployed $TAG"
