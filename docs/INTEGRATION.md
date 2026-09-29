# Linear Reporting — Integration Spec

How to mount the Linear Reporting dashboard as a section of a larger internal
platform. Covers what it does, what it needs, where it plugs in, and what is
not production-ready yet.

**Repo:** `github.com/hapana-hub/linear-reporting`
**Stack:** React 18 + TypeScript, Vite, MUI v6, React Router v6, TanStack Query, Zustand
**Status:** Working internal tool. Three integration blockers listed under
[Before you integrate](#before-you-integrate).

---

## What it is

A read-only reporting layer over a Linear workspace. It pulls issues from
Linear's GraphQL API and presents them as dashboards, filterable ticket views,
and QA-specific reporting.

It does not write to Linear. Nothing a user does here changes a ticket.

### For stakeholders

| Capability | What it answers |
|---|---|
| Dashboard | How much work is open, by team and status |
| Tickets | Filterable, searchable ticket list with detail view |
| Reports → Overview | Ticket health: totals, completion rate, stale work, trends |
| Reports → QA | QA queue, throughput, bounce rate, per-person QA workload |
| AI chat | Ask questions about the loaded ticket data in natural language |

The QA reporting is the part with no equivalent in Linear itself: it tracks how
long tickets sit in QA and how often they bounce back to development, per QA
team member.

---

## Routes

All routes are client-side (React Router, `BrowserRouter`). Mounting under a
path prefix requires a router change — see [Mounting](#mounting-under-a-path-prefix).

| Route | Page | Notes |
|---|---|---|
| `/` | Dashboard | Landing view |
| `/tickets` | Tickets | List + detail dialog |
| `/reports` | Reports | Tabs: Overview, QA |
| `/reports?tab=qa` | Reports (QA tab) | Tab state is a query param, so it is linkable |
| `/qa` | — | Redirects to `/reports?tab=qa` (legacy) |
| `/settings` | Settings | API keys, CSV upload, theme |
| `/logs` | Logs | Upload/debug output |
| `/oauth-callback` | OAuth handler | **Stub — not functional** |

### Suggested menu entries

The internal nav lives in `src/components/Layout/Sidebar.tsx` as a `NAV_ITEMS`
array. If the host platform supplies its own chrome, drop `AppLayout`/`Sidebar`
and register these directly:

```ts
[
  { label: 'Dashboard', path: '/',         icon: 'Dashboard' },
  { label: 'Tickets',   path: '/tickets',  icon: 'ConfirmationNumber' },
  { label: 'Reports',   path: '/reports',  icon: 'Assessment' },
  { label: 'Settings',  path: '/settings', icon: 'Settings' },
  { label: 'Logs',      path: '/logs',     icon: 'BugReport' },
]
```

Icons are MUI icon component names. A minimal integration exposes **Reports**
only — it is the richest view and subsumes most of the Dashboard.

---

## Configuration

### Credentials

Two keys, both entered through the **Settings** page at runtime and stored in
`localStorage`:

| Key | Storage key | Required for | Where to get it |
|---|---|---|---|
| Linear API key | `linear_api_key` | Everything — no key, no data | Linear → Settings → Security & access → Personal API keys |
| Anthropic API key | `anthropic_api_key` | AI chat only | console.anthropic.com → API Keys |

Neither key is committed to this repo, and neither should be. See
[Security](#security) for the handling rules.

### Environment variables

Build-time fallbacks, read if the corresponding `localStorage` value is absent:

```bash
# .env.local — gitignored, never commit real values
VITE_LINEAR_API_KEY=lin_api_...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

`.env`, `.env.local` and `.env.*.local` are all gitignored.

> **These are compiled into the client bundle.** Vite inlines any `VITE_`-prefixed
> variable at build time, so both keys become readable in the shipped JavaScript.
> They are acceptable for a local single-user build and unsuitable for a shared
> deployment — see [issue 3](#3-api-keys-live-in-browser-storage).

### All browser storage keys

The complete set the app reads or writes, for anyone auditing storage or
clearing state:

| Key | Store | Contents | Lifetime |
|---|---|---|---|
| `linear_api_key` | localStorage | Linear personal API key | Until cleared |
| `anthropic_api_key` | localStorage | Anthropic API key | Until cleared |
| `theme_mode` | localStorage | `light` or `dark` | Until cleared |
| `linear-upload-data` | sessionStorage | Parsed CSV issue rows | Tab session |
| `linear-upload-logs` | sessionStorage | CSV import diagnostics | Tab session |
| `linear-upload-all-mapped` | sessionStorage | Raw mapped CSV rows | Tab session |

The three `linear-upload-*` keys back the CSV fallback path. A CSV export from
Linear can be uploaded instead of supplying an API key; the API takes
precedence whenever a key is present. Because they use `sessionStorage`,
uploaded data does not survive closing the tab.

Clearing site data for the app's origin resets all six and returns it to a
first-run state.

### Services

| Service | Port | Purpose |
|---|---|---|
| Vite dev server | 5173 | Frontend |
| Express server | 4000 | Proxies Anthropic API calls for AI chat |

The Express server exists only so the Anthropic key is not sent directly from
the browser to Anthropic. It has one endpoint, `POST /api/ai/chat`, and holds
no state.

Linear's GraphQL API is called **directly from the browser** at
`https://api.linear.app/graphql`. The host platform's CSP must allow it.

---

## Data model and API usage

Issues are fetched in pages of 250 and held in TanStack Query cache
(`staleTime` 5 min, `gcTime` 10 min). A full workspace sync is roughly 3,800
issues at time of writing — expect a few seconds on first load.

Two things are fetched lazily, per ticket, on demand:

- **Comments** — full threads, loaded when a ticket is opened
- **State history** — loaded per row in the QA drill-down

History is deliberately not fetched in bulk. Linear's query complexity budget
is 10,000 points per query and a history page costs roughly 400–500 points per
issue, so fetching it for the whole workspace is not viable. This constrains
what QA metrics can appear in summary tables versus drill-downs.

---

## Mounting under a path prefix

The app assumes it owns the root path. To mount at, say, `/tools/linear`:

1. Set `base: '/tools/linear/'` in `vite.config.ts`
2. Add `basename="/tools/linear"` to the `BrowserRouter` in `src/App.tsx`
3. Update the OAuth redirect URI if OAuth is ever completed

If the host platform supplies navigation, render `<ReportsPage />` and friends
directly and skip `AppLayout`. They have no dependency on the sidebar.

### Theme

MUI theme with light/dark support, defined in `src/theme.ts` and driven by
`themeMode` in the Zustand store (persisted to `localStorage` as `theme_mode`).
To adopt the host platform's theme, replace the `ThemeProvider` in `App.tsx` —
components read theme tokens rather than hardcoded colours, with the exception
of a few chart palette constants in `src/constants/index.ts`.

---

## Before you integrate

Three issues that need decisions. None are hard to fix; all will bite during
integration if unaddressed.

### 1. The AI chat proxy is misconfigured

`vite.config.ts` proxies `/api` to port **3001**. The Express server listens on
port **4000**. AI chat cannot work in development until these agree.

**Fix:** change the proxy target to `4000`, or move the server to `3001`. One
line either way.

### 2. Linear OAuth is a stub

`src/components/LinearLogin.tsx` has a hardcoded `CLIENT_ID` of
`'YOUR_LINEAR_CLIENT_ID'`, a hardcoded `localhost:5173` redirect URI, and a
callback handler whose token exchange is commented out. The `/oauth-callback`
route renders "Logging in..." and does nothing else.

Authentication today is a personal API key pasted into Settings. If the host
platform expects SSO or per-user identity, OAuth needs building — the
scaffolding is not a head start worth much.

### 3. API keys live in browser storage

Both keys sit in `localStorage` in plain text, and the Linear key is sent from
the browser on every request. For a single-user local tool this is acceptable.
For a shared deployment it is not: any user of the page can read both keys, and
the Anthropic key in particular is a billing credential with no spend cap.

**Recommended before any shared deployment:** move both keys server-side as
environment variables and proxy Linear calls through the Express server as it
already does for Anthropic.

---

## Security

- **No write access.** The app only reads from Linear. A leaked Linear key is
  still a data-exposure risk — it can read every issue the key's owner can see.
- **Anthropic key is a billing credential.** Unbounded spend if leaked, and no
  per-key cap. Leaked keys are scraped from public repos within minutes.
- **CSP:** must allow `api.linear.app` (GraphQL) and the Express server origin.
- **CORS:** the Express server currently allows only `http://localhost:5173`.
  Update `server/index.ts` for any other origin.

### Key handling rules

1. **Never commit real key values** — not to this repo, not to the platform
   repo, not in documentation. Both are gitignored via `.env*`; keep it that
   way. GitHub secret scanning will auto-revoke a committed Anthropic key, and
   a committed key stays in git history until the history is rewritten.
2. **Share keys through a secrets manager**, not a file or a chat message.
3. **Each developer uses their own Linear key.** It is a personal API key, so
   it inherits that person's workspace visibility.
4. **Rotate immediately if exposed.** Linear: revoke under Security & access.
   Anthropic: revoke in the console, and check usage for unexpected spend.
5. **For any shared deployment**, move both keys server-side as environment
   variables on the Express server and proxy Linear through it, as is already
   done for Anthropic. Browser-held keys are readable by every user of the page.

---

## Build and run

```bash
npm install
npm run dev      # Vite (5173) + Express (4000) together
npm run build    # tsc && vite build -> dist/
npm run preview  # serve the production build
```

Production bundle is ~1.25 MB (366 KB gzipped) in a single chunk. Code-splitting
would help if the host platform is size-sensitive; nothing has been done about
it yet.

### Known build warnings

Three pre-existing TypeScript errors do not block the build but will show in
strict CI:

- `papaparse` has no type declarations (`npm i -D @types/papaparse`)
- `TicketTable.tsx:163` — a condition that is always true
- `QASummary.tsx:15` — unused import

---

## Ownership and configuration points

| What | Where |
|---|---|
| QA team roster | `QA_TEAM_MEMBERS` in `src/constants/index.ts` |
| QA state names | `QA_STATE_NAMES` — currently `['In QA']` |
| QA exit classification | `QA_FORWARD_EXIT_STATES` / `QA_BACKWARD_EXIT_STATES` |
| QA aging thresholds | `QA_AGE_BUCKETS`, `QA_AGING_THRESHOLD_DAYS` |
| Nav items | `NAV_ITEMS` in `src/components/Layout/Sidebar.tsx` |
| Routes | `NAV_ROUTES` in `src/constants/index.ts` |

The QA roster is matched against Linear display names by first name, and
falls back to matching the local part of an email — Linear reports users as
display names via the API but as email addresses in CSV exports. Adding or
removing a QA team member is a one-line change to `QA_TEAM_MEMBERS`.

Workflow state names are workspace-specific. `QA_STATE_NAMES` assumes a single
state literally named "In QA"; a workspace with several QA states, or a
different name, needs that constant updated.
