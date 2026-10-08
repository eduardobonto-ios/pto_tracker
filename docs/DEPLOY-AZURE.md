# Deploying on Azure

The PTO Tracker runs on Azure Container Apps in the **FSW Azure SYNNEX**
subscription (`e40d309f-f89b-48a9-a604-47c0449d804b`), resource group
`rg-pto-tracker`, in **East US 2** — East US is the subscription's usual
region but is restricted from provisioning PostgreSQL on this CSP
subscription.

| Resource | Name |
| --- | --- |
| Frontend (nginx, external) | `ca-pto-app` |
| API gateway (Kong, external) | `ca-pto-kong` |
| PostgREST (internal only) | `ca-pto-rest` |
| Edge Functions (Deno, internal only) | `ca-pto-functions` |
| Container apps environment | `cae-pto-tracker` |
| PostgreSQL 17 (Burstable B1ms), db `ptotracker` | `psql-pto-tracker-2f270c` |
| Storage, blob container `pto-attachments` | `stfswpto2f270c` |
| Container registry | `acrfswpto2f270c` (East US) |
| Key Vault | `kv-fsw-pto-2f270c` |
| Log Analytics | `log-pto-tracker` |

**Live URLs**

- App — https://ca-pto-app.bluedesert-d4253afc.eastus2.azurecontainerapps.io
- API — https://ca-pto-kong.bluedesert-d4253afc.eastus2.azurecontainerapps.io

**Every secret lives in Key Vault** (`anon-key`, `service-role-key`,
`jwt-secret`, `pg-admin-password`, `pto-feed-token`) and is the only copy.
Container Apps holds references, not values. Nothing is written to disk in
this repo.

## Why this shape

Supabase is a platform, not one server. Replacing it means replacing the
parts this app actually used — and only those:

| Supabase piece | Replacement | Why |
| --- | --- | --- |
| Postgres | Flexible Server | — |
| PostgREST (`/rest/v1`) | `postgrest/postgrest:v12.2.3` | Same protocol, so **all 6 table call sites and 11 RPC call sites in `src/` are unchanged** |
| Kong (`/auth`,`/rest`,`/functions` on one origin) | `ca-pto-kong` | `createClient(url, key)` expects one origin serving every path |
| Edge Functions (Deno isolates) | `ca-pto-functions` | One Deno process routing by first path segment |
| GoTrue (`/auth/v1`) | **nothing** | This app never used Supabase Auth — it has its own `pto_credentials` table and `pto_verify_login` RPC |
| Storage (`/storage/v1`) | **nothing** | Zero storage calls anywhere in `src/` or `supabase/functions/` |

Because GoTrue is not in the picture, this migration is far smaller than the
Technical Playbook's. There are no `auth.uid()` policies, no `auth` schema,
and no password re-registration: the 26 bcrypt (`$2a$`) hashes move with the
database and everyone's existing password keeps working.

### The functions are imported, not forked

`infra/functions/main.ts` imports `supabase/functions/*/index.ts`
**unchanged**. Each calls `Deno.serve(handler)` at module scope, so
`Deno.serve` is swapped for a collector during import and restored after.
That keeps those files byte-identical and still deployable to Supabase,
which matters while both stacks exist.

It also re-implements the JWT check Supabase did at its edge, because Kong
does not: `read-org-calendar` and `sync-pto-calendar` require a valid
HS256 JWT; `pto-calendar-feed` stays open because Outlook cannot send an
Authorization header — its token in the path is the credential.

## Deploying

    ./infra/azure-deploy.sh            # build everything and roll all four apps
    ./infra/azure-deploy.sh app        # frontend only
    ./infra/azure-deploy.sh functions  # Edge Functions only
    ./infra/azure-deploy.sh kong       # gateway only

Images build in ACR (`az acr build`), so a local Docker daemon is not needed.

## Refreshing the data

    SUPABASE_DB_PASSWORD=... ./infra/migrate-db.sh

Re-runnable: it drops and recreates only the `pto_*` objects, then prints a
source-vs-destination row count for all eight tables.

## Things that bite

- **The Supabase `public` schema is SHARED with the Technical Playbook.**
  25 non-`pto_` tables live there. Never dump or restore the whole schema
  from this project — everything in `migrate-db.sh` is scoped to `pto_*`.

- **`pg_dump -t 'public.pto_*'` silently omits types and functions.** It
  takes tables, sequences, indexes, constraints and RLS policies, but the
  **8 enum types** (`pto_status`, `pto_leave_type`, …) and **11 functions**
  are invisible to `-t`. Without the types the first `CREATE TABLE` fails;
  without the functions every RPC 404s. `migrate-db.sh` dumps all three
  separately for this reason.

- **Container Apps internal ingress answers plain HTTP with a 301.** Kong
  passed that redirect back to the browser instead of proxying, so every
  request returned 301 pointing at an internal hostname. Upstream URLs in
  `kong.yml.template` must be `https://`.

- **`PGRST_DB_ANON_ROLE` is deliberately NOT set.** With it, PostgREST
  serves any request carrying no JWT at all as `anon` — on Supabase, Kong's
  key-auth rejected those. Leaving it unset restores that: no credential
  → 401. `supabase-js` always sends the anon JWT, so the app is unaffected.

- **`VITE_*` is inlined at build time.** Changing the gateway URL or the
  anon key is a rebuild of `pto-app`, never a restart.

- **ACR uses admin credentials, not a managed identity.** `az containerapp
  create` tries to assign AcrPull and fails: `ebonto@fswelsford.com` is
  Contributor and cannot create role assignments. Same as `rg-talent-scout`
  and `rg-technical-playbook`.

- **`deno cache main.ts` does not follow a dynamic `import()`.** The
  Dockerfile caches each function entrypoint explicitly, or the remote
  `supabase-js` import would be fetched from esm.sh on the first request.

## Still outstanding

1. **`ORG_CALENDAR_ICS_URL` is not set.** It lives in Supabase's Edge
   Function secret store, which is not readable from the database or
   without the Supabase CLI. Until it is copied across, `read-org-calendar`
   returns `{"events":[]}` — the Company Events overlay on the PTO Calendar
   page is simply empty. It does not error. Copy it from Supabase →
   Edge Functions → Secrets, then:

       az containerapp secret set -g rg-pto-tracker -n ca-pto-functions --secrets ics-url='<url>'
       az containerapp update -g rg-pto-tracker -n ca-pto-functions --set-env-vars ORG_CALENDAR_ICS_URL=secretref:ics-url

2. **The subscribable feed URL changed, and so did its token.** Both the
   hostname and `PTO_FEED_TOKEN` are new, so **every existing Outlook
   subscription stops updating — silently, without erroring**. Everyone
   subscribed must re-subscribe to the new URL (token in Key Vault as
   `pto-feed-token`). Fronting it with a company-controlled domain before
   redistributing avoids repeating this on the next move.

3. **No custom domain.** Both public apps are on
   `*.azurecontainerapps.io`. A managed certificate on `ca-pto-app` and
   `ca-pto-kong` is a `az containerapp hostname add` away — but note that
   changing the gateway hostname means rebuilding `pto-app`.

4. **`MS_GRAPH_*` are unset**, so `sync-pto-calendar` stays dormant. It was
   already blocked on admin consent before the migration; nothing regressed.

5. **A firewall rule named `devbox-migration` allows one laptop IP** to
   reach the database directly. Remove it when it is no longer needed.

6. **Vercel and Supabase are both still running and untouched**, by
   instruction. They remain the rollback. Nothing has been pointed away from
   them: the Vercel deployment still serves the old build against Supabase,
   so the two stacks are now diverging and whichever one people use is the
   one collecting real leave requests. Decide the cutover before telling
   anyone the new URL.

## Shipping a change

Two commands. Both matter, and they do different things.

```bash
cd /Users/mac/Valveman/PTOTracker

git push origin main          # source control (and Vercel rebuilds itself)
./infra/azure-deploy.sh app   # Azure -- this is what actually updates it
```

Targets: `app` (frontend), `functions` (Edge Functions), `kong` (gateway), or
no argument for all three. Only rebuild what changed; `app` is the usual one.

**A push alone never updates Azure.** There is no CI on this repo. Azure only
moves when `azure-deploy.sh` runs, which is why Vercel carried fixes for days
that Azure did not have.

### What the script actually runs

```bash
TAG="v$(date +%Y%m%d%H%M%S)"
KONG="$(az containerapp show -g rg-pto-tracker -n ca-pto-kong \
         --query properties.configuration.ingress.fqdn -o tsv)"

az acr build -r acrfswpto2f270c -t "pto-app:$TAG" -f infra/Dockerfile.app . \
  --build-arg "VITE_SUPABASE_URL=https://$KONG" \
  --build-arg "VITE_SUPABASE_ANON_KEY=$(az keyvault secret show \
      --vault-name kv-fsw-pto-2f270c -n anon-key --query value -o tsv)"

az containerapp update -g rg-pto-tracker -n ca-pto-app \
  --image "acrfswpto2f270c.azurecr.io/pto-app:$TAG" \
  --revision-suffix "${TAG//v/r}"
```

`az acr build` builds **in Azure**, not locally, so Docker does not need to be
running on the machine you deploy from.

### Three things that cost time if you forget them

**`az acr build` uploads the WORKING TREE, not the last commit.** It will
happily deploy uncommitted changes, and it will equally happily deploy code you
never pushed. Push first, every time, or Azure and the repo drift apart and
nobody can tell which is live.

**Changing the gateway URL or the anon key is a rebuild, not a restart.** Vite
inlines `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into the bundle at
build time. Restarting a revision re-runs the same bundle with the same values
baked in.

**Hard-refresh before believing a deploy failed.** nginx sends
`no-cache, no-store` for `index.html` and caches `/assets/` for a year, which
is correct -- but a browser that already has the page will keep showing it.
`Cmd+Shift+R`, or open a private window, before concluding anything is wrong.
A deploy has been declared broken on this project when the only problem was a
cached tab.

### Checking a deploy landed

```bash
# newest image, and whether the app is running it
az acr manifest list-metadata --registry acrfswpto2f270c --name pto-app \
  --orderby time_desc --query '[0].{tag:tags[0], built:createdTime}' -o tsv
az containerapp revision list -n ca-pto-app -g rg-pto-tracker \
  --query "[?properties.active].{rev:name, image:properties.template.containers[0].image}" -o tsv
```

The only check that proves what a browser receives is the bundle itself:

```bash
APP=https://ca-pto-app.bluedesert-d4253afc.eastus2.azurecontainerapps.io
ASSET=$(curl -sL "$APP/?cb=$(date +%s)" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
curl -sL "$APP/$ASSET" | grep -c 'some-string-from-your-change'
```

A new image and an active revision can both look right while the served file
is still the old one.

## Source control

The repository is mirrored to two remotes:

```
origin  github.com/eduardobonto-ios/pto_tracker
azure   dev.azure.com/fswelsford/pto_tracker/_git/pto_tracker
```

Push to both until Vercel is retired — **Vercel builds from `origin`**, so
skipping it silently stops the rollback from updating.

```bash
git push origin main && git push azure main && ./infra/azure-deploy.sh app
```

Azure DevOps authenticates with a **Personal Access Token**, not a password:
avatar → Personal access tokens → New Token → scope *Code (read, write &
manage)*. Let git prompt for it so `osxkeychain` stores it; passing it inside
the clone URL works but writes the token into shell history in plaintext.

Once Vercel is gone, `azure` can become `origin` and GitHub can be archived.
Do that as its own change.
