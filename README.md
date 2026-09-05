# Valveman PTO Tracker — Front-End Prototype (Phase 1)

A dedicated web application to replace the Google Sheets PTO Tracker, built to sit
visually alongside the existing **Valveman Technical Playbook** as part of the same
internal software suite.

**This phase is front-end only.** There is no Supabase connection, no real
authentication, and no email sending. Everything runs on mock data held in memory.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Node 18+ required.

### Signing in (mock auth)

Authentication is mocked — **any password works**. The email decides who you are:

| Email | Who you get |
|---|---|
| `princes@valveman.com` | Admin (Team Manager) — full app |
| `josh@valveman.com` | Employee — employee-only navigation |
| `amr@valveman.com` | Employee whose account still needs a first-login password change |

There is also an identity switcher in the header avatar menu so both roles can be
previewed without signing out.

---

## Stack

- **React 18** + **TypeScript** (strict)
- **Vite 5**
- **Tailwind CSS 3** with centralised design tokens
- **react-router-dom 6**
- **lucide-react** for icons

No component library — the shadcn-style primitives in `src/components/ui/` are
small, dependency-free, and easy to swap.

---

## Project structure

```
src/
├─ types/index.ts            Employee, PTORequest, UserAccount, Department,
│                            LeaveType, PTOStatus, PayStatus, DurationType…
├─ lib/
│   ├─ theme.ts              TS mirror of the Tailwind tokens + app constants
│   ├─ pto.ts                All PTO business rules (pure functions, no React)
│   └─ utils.ts              Date/format helpers, cn(), password generator
├─ data/
│   ├─ employees.ts          14 employees from the "PTO Tracker" sheet tab
│   ├─ requests.ts           26 PTO records from the "PTO Log" sheet tab
│   └─ accounts.ts           Derived account list for Account Management
├─ context/AppContext.tsx    Single in-memory store + every mutator
├─ components/
│   ├─ ui/                   Button, Card, Badge, Field/Input/Select/Textarea,
│   │                        Modal, Drawer, Table, Avatar, ProgressBar, PillGroup
│   ├─ layout/               Sidebar, Header, AppLayout, Logo
│   ├─ StatCard.tsx          StatusBadge.tsx        EmployeeTable.tsx
│   ├─ PTORequestTable.tsx   PTORequestForm.tsx     PTOBalanceCard.tsx
│   ├─ RequestDetails.tsx    Calendar.tsx           EmailPreview.tsx
│   └─ AccountCreationForm.tsx  PasswordChangeForm.tsx
└─ pages/                    One file per route
```

### Routes

| Route | Page | Access |
|---|---|---|
| `/dashboard` | Dashboard | All |
| `/file-a-leave` | File a Leave | All |
| `/my-pto` | My PTO | All |
| `/calendar` | PTO Calendar | All |
| `/requests` | PTO Requests log | All (employees see only their own) |
| `/requests/:id` | Request details + approval | All (actions are Admin-only) |
| `/employees` | Employee PTO tracker | **Admin** |
| `/accounts` | Account Management | **Admin** |
| `/email-preview` | Email Notification Preview | All |

`/requests/:id` is deliberately a standalone, linkable page — this is the URL the
notification email will point at once email is wired up.

---

## Design tokens

Colours live in **two places only**: `tailwind.config.js` (classes) and
`src/lib/theme.ts` (TS mirror for inline styles and SVG). Never hard-code a hex in
a component.

| Token | Use |
|---|---|
| `navy-900` / `navy-950` | Sidebar, headings, dark panels |
| `brand-400 → brand-600` | Primary buttons, active states, progress bars |
| `accent-300 → accent-600` | Icons, links, focus rings, small accents |
| `slateish-*` | Body copy, borders, table chrome |
| `canvas` / `tablehead` | Page background / table header fill |
| `success` / `warning` / `danger` | Semantic only — see below |

Semantic colour is reserved: **green** = Approved / Active / Eligible / Paid,
**amber** = Pending / warnings, **red** = Rejected / Not eligible / destructive.
Orange is not used anywhere as a UI accent.

---

## Business rules (`src/lib/pto.ts`)

These are pure functions with no React or data-fetching in them, so they can be
ported directly to SQL views or Supabase RPCs in phase 2.

- **Eligibility** — an employee becomes eligible **6 months after their hire date**.
  `eligibilityDate()` handles month-overflow (e.g. Aug 31 + 6 months → Feb 28).
- **Days used** — only requests that are **Approved *and* Paid** consume the
  allowance. Pending days are reported separately and never deduct until approved;
  Rejected requests never count.
- **Days remaining** — `allowance − used`, and reads `0` for anyone who has not yet
  cleared the 6-month rule. Over-draws are allowed to go negative and are shown in
  red (Josh Kirk is currently −3.0, exactly as in the spreadsheet).
- **Half days** — 0.5 is a first-class value throughout. `Custom Hours` converts to
  days against an 8-hour day, rounded to the nearest half.
- **Allowance is per-employee** (`annualPtoAllowance`), not a company-wide constant.
  The sheet currently has a mix of 5-day and 10-day allowances.

### Reconciliation with the spreadsheet

The mock data reproduces the 2026 sheet roll-up exactly:

| Metric | Sheet | App |
|---|---|---|
| Total Members | 14 | 14 |
| Eligible | 11 | 11 |
| Total PTO Pool | 90 | 90 |
| Days Used | 40.0 | 40.0 |
| Days Remaining | 35.0 | 35.0 |

> **One deliberate difference:** the sheet shows **0 pending requests**. Three
> Pending records and one Rejected record have been added to the mock data so the
> approval workflow, the amber badges and the rejection modal are demonstrable.
> None of them are Approved+Paid, so the five totals above are unaffected. Delete
> `PTO-2026-020` and `PTO-2026-024` … `026` from `src/data/requests.ts` to get a
> pixel-exact match with the sheet.

---

## Phase 2 — connecting Supabase

The work is deliberately contained:

1. **`src/context/AppContext.tsx`** — every mutator (`submitRequest`,
   `approveRequest`, `rejectRequest`, `createAccount`, `resetPassword`,
   `revokeAccess`, `deleteAccount`) is a local `setState` call with a stable
   signature. Swap the bodies for Supabase queries; no component should need to
   change.
2. **`src/data/*`** — replace the seed arrays with queries. The types in
   `src/types/index.ts` are already shaped like the intended tables.
3. **Auth** — `signIn` / `signOut` / `completeFirstLogin` are the three seams.
   Delete the identity switcher in `Header.tsx` and the "Prototype access" panel in
   `pages/Login.tsx` at the same time.
4. **Roles** — `AdminRoute` in `App.tsx` is a client-side guard for the prototype
   only; the real boundary is Row Level Security.
5. **Email** — `components/EmailPreview.tsx` holds the agreed copy and layout.
   Recipients are in `PTO_NOTIFICATION_RECIPIENTS` (`src/lib/theme.ts`):
   `princes@valveman.com`, `pgomez@fswelsford.com`. The CTA links to
   `/requests/{request-id}`.

### Known prototype limitations

- All state is in memory — a browser refresh resets to the seed data and signs you
  out. That includes deep links like `/requests/PTO-2026-024`, which will land on
  the login screen until real auth exists.
- Passwords are never checked or stored. The strength meter on the first-login
  screen validates format only.
- `Reset password` and the generated temporary passwords are display-only.

---

*Valveman PTO Tracker · Internal use only.*
