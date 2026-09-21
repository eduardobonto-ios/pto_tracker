# Microsoft 365 calendar integration — setup

Two independent integrations share one Entra app registration and three of the
same secrets. Both are finished in code and inert until the Entra side exists.

| | Direction | Code | Graph permission | Status |
|---|---|---|---|---|
| **A. Org calendar overlay** | Microsoft → app | `functions/read-org-calendar`, `src/lib/orgCalendar.ts` | `Calendars.Read` | **the active one** |
| **B. PTO push** | app → Microsoft | `functions/sync-pto-calendar`, `src/lib/calendarSync.ts` | `Calendars.ReadWrite` | built, dormant, not currently wanted |

**A** shows the organisation's shared calendar (company events, holidays,
shutdowns) on the PTO Calendar page alongside leave. It reads **one** mailbox —
employees' personal calendars are deliberately out of scope.

**B** writes approved leave onto a shared calendar. It is complete and tested
against nothing; leave it switched off by simply not setting
`MS_GRAPH_CALENDAR_USER`. Set up **A** only unless you decide otherwise.

Set up A and you need `Calendars.Read` — read-only, and narrower than what B
would need. If you later want both, the permission becomes `Calendars.ReadWrite`
and the mailbox list grows by one.

Tenant: **F.S. Welsford Company** (`fswelsford.com`)
Supabase project ref: `wmglpvxdcehbrfcbrxzd`

---

## Two ways to feed the overlay

Integration A reads its calendar from **one of two sources**. Configure either.

### Option 1 — published ICS feed (no admin, works today)

Any user can publish a calendar they own and get a link. No app registration, no
admin consent, no Exchange policy, no MSP involvement.

1. In **Outlook on the web**, open **Settings → Calendar → Shared calendars**.
2. Under **Publish a calendar**, pick the calendar, set permission to **Can view
   all details**, and **Publish**.
3. Copy the **ICS** link (not the HTML one).
4. `supabase secrets set ORG_CALENDAR_ICS_URL='<the ics link>' --project-ref wmglpvxdcehbrfcbrxzd`
5. `supabase functions deploy read-org-calendar --project-ref wmglpvxdcehbrfcbrxzd`

Done. Steps 1-4 below are not needed.

**Know the trade-offs.**
- The URL is **unauthenticated** — anyone holding it can read that calendar.
  Publish only a calendar whose contents are not sensitive (company events and
  holidays, not anyone's personal calendar). Re-publishing issues a new URL,
  which is how you revoke a leaked one.
- Outlook refreshes a published feed on its own schedule, so edits can take a
  few hours to appear. Fine for holidays; poor for same-day changes.
- Tenant policy can disable calendar publishing (`Set-SharingPolicy`). If the
  Publish option is missing, it is off, and Option 2 is the only route.
- Parsing is day-granular and supports FREQ/INTERVAL/COUNT/UNTIL/BYDAY/EXDATE.
  Exotic rules (BYSETPOS, nth-weekday-of-month) yield only the first occurrence.
  See `read-org-calendar/ics.ts`; tests in `ics.test.ts`:
  `deno run supabase/functions/read-org-calendar/ics.test.ts`

### Option 2 — Microsoft Graph (needs admin, better result)

Authenticated, immediate updates, no public URL. Needs an Entra app registration
and tenant admin consent — steps 1-5 below. Prefer this as the end state.

Setting `ORG_CALENDAR_ICS_URL` takes precedence, so you can start on Option 1
today and switch to Graph later by unsetting it. No code change either way.

---

## Secrets

| Secret | Used by | Value |
|---|---|---|
| `MS_GRAPH_TENANT_ID` | both | Entra directory (tenant) ID |
| `MS_GRAPH_CLIENT_ID` | both | app registration's Application (client) ID |
| `MS_GRAPH_CLIENT_SECRET` | both | client secret **value** |
| `ORG_CALENDAR_ICS_URL` | **A**, option 1 | published .ics link; takes precedence |
| `MS_GRAPH_ORG_CALENDAR_USER` | **A**, option 2 | mailbox holding the org calendar |
| `MS_GRAPH_CALENDAR_USER` | B | mailbox the PTO push writes to |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected into every Edge
Function automatically — do not set them.

Both Edge Functions address `/users/{upn}/`, so any **user or shared mailbox**
works as a drop-in. A Microsoft 365 **Group** calendar would need a code change
(Graph addresses those at `/groups/{id}/`).

## What is *not* read

Employees' personal Outlook calendars. Integration A reads exactly one mailbox —
the org calendar named in `MS_GRAPH_ORG_CALENDAR_USER`. Reading staff calendars
would need consent across every mailbox, cannot be narrowed to one, and would
put private meeting subjects inside a PTO tool. Step 4 below is what enforces
this in the tenant rather than merely by convention.

PTO leave data always comes from Supabase, never from Microsoft. Nothing read
from Graph is persisted — the overlay is fetched per visible month and
discarded.

---

## Who can do what

`Calendars.Read` is an **application** permission using the
client-credentials flow, so it needs admin consent. `ebonto@fswelsford.com`
cannot grant it — holding a tenant account does not grant consent rights. The
tenant is managed by an external MSP; the current Global Administrator list is
in the Entra portal under Roles and administrators, and is deliberately not
reproduced here.

Global Administrator is **not** required, however. The minimum roles are:

| Step | Minimum role |
|---|---|
| 1 — identify the org calendar | none if it exists already; otherwise Exchange Administrator to create it |
| 2 — create the app registration | none; default user permission unless the tenant disables it |
| 3 — grant admin consent | Cloud Application Administrator (excluded from `AppRoleAssignment.ReadWrite.All` and `RoleManagement.ReadWrite.Directory` only — not from `Calendars.Read`) |
| 4 — Application Access Policy | Exchange Administrator (Organization Management) |
| 5 — Supabase secrets + deploy | none |

Neither role grants billing, subscriptions, role assignment, Conditional Access
or the other service admin centres — they are genuinely narrower than Global
Administrator. But neither is low-risk, and it is worth being clear why before
requesting one:

- **Exchange Administrator** can grant itself Full Access to *any* mailbox in
  the tenant (`Add-MailboxPermission`) — all executive, HR and legal mail.
- **Cloud Application Administrator** can add a client secret or certificate to
  *any* existing app. If any app in the tenant holds a privileged Graph
  permission (`RoleManagement.ReadWrite.Directory`, `Directory.ReadWrite.All`
  — common for RMM, backup and security tooling in a managed tenant), that is a
  documented escalation path to Global Administrator. This is what the
  PRIVILEGED badge in the Entra role list denotes.

So expect an MSP to scrutinise a Cloud Application Administrator request about
as hard as a Global Administrator one. Preferred order:

1. Have inWorks, who manage the tenant, run steps 1, 3 and 4. Lowest friction.
2. Step 3 via the **admin consent request workflow** if enabled — a non-admin
   raises the request, an admin approves it. Needs no role at all.
3. **PIM-eligible**, time-boxed, approval-gated activation of Exchange
   Administrator if hands-on access is genuinely needed. Never a standing
   assignment.

---

## Step 1 — Identify the org calendar

Which mailbox holds the company events / holidays calendar the overlay should
show? If one already exists, **no admin action is needed here at all** — just
its address.

If one does not exist, an Exchange Administrator creates a shared mailbox (no
licence required):

```
Exchange admin center → Recipients → Mailboxes → Add a shared mailbox
  Name:    Company Calendar
  Address: events@fswelsford.com
```

Either way, its address becomes `MS_GRAPH_ORG_CALENDAR_USER`.

## Step 2 — App registration  (Eduardo can usually do this)

Tenants allow non-admin users to register applications by default. If the
option is greyed out, this step joins the admin ask below.

Entra admin center → **App registrations** → **New registration**
- Name: `Valveman-Welsford PTO Tracker`
- Supported account types: **Single tenant**
- Redirect URI: leave blank (app-only flow, no sign-in)

From the app's **Overview**, record:
- **Directory (tenant) ID** → `MS_GRAPH_TENANT_ID`
- **Application (client) ID** → `MS_GRAPH_CLIENT_ID`

> Caution: the GUID `62e90394-69f5-4237-9190-012177145e10` that appears in the
> Roles-and-administrators portal URL is the well-known *Global Administrator
> role template* ID. It is **not** the tenant ID. Take the tenant ID from the
> app registration's Overview blade.

Then **Certificates & secrets** → **New client secret** → record the **Value**
(not the Secret ID) → `MS_GRAPH_CLIENT_SECRET`. The value is shown only once.
Max lifetime is 24 months — note the expiry, the sync breaks silently when it
lapses.

Then **API permissions** → **Add a permission** → Microsoft Graph →
**Application permissions** → `Calendars.Read` → Add.

`Calendars.Read` is all integration A needs — read-only. Widen to
`Calendars.ReadWrite` only if you also switch on the dormant PTO push, B.

The permission now sits in the list as **"Not granted"**. That is step 3.

## Step 3 — Admin consent  (needs a Global Admin)

Entra → App registrations → `Valveman-Welsford PTO Tracker` → API permissions →
**Grant admin consent for F.S. Welsford Company**.

## Step 4 — Scope the app to one mailbox  (needs Exchange Administrator)

**Do not skip.** `Calendars.Read` as an application permission reads *every*
mailbox in the tenant by default. This is what limits it to the org calendar,
and it is the only thing standing between this integration and every employee's
private calendar.

```powershell
Connect-ExchangeOnline
New-ApplicationAccessPolicy `
  -AppId <application-client-id> `
  -PolicyScopeGroupId events@fswelsford.com `
  -AccessRight RestrictAccess `
  -Description "Valveman-Welsford PTO Tracker -- org calendar only"

# verify — Granted for the org calendar, Denied for any staff mailbox
Test-ApplicationAccessPolicy -Identity events@fswelsford.com -AppId <application-client-id>
Test-ApplicationAccessPolicy -Identity ebonto@fswelsford.com -AppId <application-client-id>
```

Microsoft has been migrating this to **RBAC for Applications** in Exchange
Online, so `New-ApplicationAccessPolicy` may be deprecated or unavailable
depending on when this is run. If so, the replacement is a scoped role
assignment (`New-ServicePrincipal` + `New-ManagementRoleAssignment` for the
`Application Calendars.Read` role, scoped to this one mailbox). Confirm the
current path in Microsoft's docs before running — the goal is identical either
way: the app reaches exactly one mailbox.

## Step 5 — Supabase secrets + deploy  (Eduardo)

```bash
supabase secrets set \
  MS_GRAPH_TENANT_ID=<tenant-id> \
  MS_GRAPH_CLIENT_ID=<client-id> \
  MS_GRAPH_CLIENT_SECRET=<secret-value> \
  MS_GRAPH_ORG_CALENDAR_USER=events@fswelsford.com \
  --project-ref wmglpvxdcehbrfcbrxzd

supabase functions deploy read-org-calendar --project-ref wmglpvxdcehbrfcbrxzd
```

Deliberately **not** setting `MS_GRAPH_CALENDAR_USER` leaves the dormant PTO
push (B) switched off.

## Step 6 — Verify

Put a test event on the org calendar in Outlook, then open the PTO Calendar page
and navigate to that month. It should appear as a grey chip alongside any leave,
and the legend should gain a "Company event" entry.

Failures are deliberately silent in the UI — the overlay resolves to an empty
list and the page keeps working on Supabase data alone. So read the function
logs rather than expecting an on-screen error:

```bash
supabase functions logs read-org-calendar --project-ref wmglpvxdcehbrfcbrxzd
```

Common causes:
- `Graph auth failed: 401` — wrong secret value, or the secret expired.
- `403 ErrorAccessDenied` on the calendar call — admin consent (step 3) missing,
  or the Application Access Policy (step 4) excludes this mailbox.
- `404` on the user lookup — `MS_GRAPH_ORG_CALENDAR_USER` typo, or the mailbox
  does not exist.
- Empty overlay, no errors — the policy is right but the calendar genuinely has
  no events that month. Confirm against a known event before digging further.
