# Linear Reporting

Two tools for reporting on a Linear workspace:

- **Web dashboard** (`src/`, Vite + React) — dashboard, tickets, comprehensive Reports with a QA summary, a dedicated QA Report, and an AI chat backed by a small Express server.
- **Desktop overlay** (`overlay/`, Electron) — a floating, always-on-top glass widget showing high-level Linear numbers, with configurable boxes, multi-select filters (team / priority / label), and click-through to Linear.

## Prerequisites

- Node.js 18+ (20/22 recommended)
- A Linear **personal API key** (Linear → Settings → Security & access → API)
- Optional: an Anthropic API key (only for the web app's AI chat)

## Setup (first time, or on a new machine)

The repo is gitignored to keep secrets and installed packages out of git, so a fresh
clone needs two local steps that don't come down with it:

```bash
git clone https://github.com/Nabziilla/linear-reporting
cd linear-reporting

# 1) Create your local secrets file (NOT committed — see .env.example)
cp .env.example .env.local
#   then edit .env.local and set at least VITE_LINEAR_API_KEY=lin_api_xxxxxxxx
#   (VITE_ANTHROPIC_API_KEY is optional, for AI chat)

# 2) Install dependencies (root = web app, overlay = Electron app)
npm install
cd overlay && npm install && cd ..
```

`.env.local` holds your API key(s). It is gitignored and must be recreated on each
machine. The web app can also take keys via its **Settings** page (stored in the
browser's localStorage) if you'd rather not use `.env.local`.

## Run the web dashboard

```bash
npm run dev
```

- Frontend: http://localhost:5173
- AI server: http://localhost:4000

## Run the desktop overlay

```bash
cd overlay
npm start
```

A floating widget appears top-right. Drag it by the header; use the ⚙ button to pick
boxes and set filters; click a box to open those issues in Linear. It reuses
`VITE_LINEAR_API_KEY` from the repo-root `.env.local`. See `overlay/README.md` for details.

## Notes

- **Secrets:** never commit `.env.local`. It is already in `.gitignore`.
- **Dependencies** (`node_modules`, `overlay/node_modules`) are gitignored — run the
  `npm install` steps above after cloning.
