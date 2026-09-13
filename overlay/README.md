# Linear Overlay

A floating, always-on-top desktop widget showing high-level Linear ticket numbers:
**Open · In Progress · In QA · Aging (in QA 3d+)**.

Built with Electron. Fetches from Linear in the main process (no CORS), reusing the
same `VITE_LINEAR_API_KEY` from the repo-root `.env.local` as the web app. You can
also set `LINEAR_API_KEY` in the environment to override.

## Run

```bash
cd overlay
npm install      # first time only (installs Electron)
npm start
```

The panel appears top-right, floats above other apps, and follows you across spaces
and fullscreen apps. Drag it anywhere by the header. It auto-refreshes every 3 minutes;
the ↻ button refreshes on demand, ✕ quits.

## Notes
- Metrics are workspace-wide. "Aging" counts tickets that have sat in the **In QA**
  state for 3+ days (computed from issue history).
- No dock icon by design — it's a pure overlay. Quit with the ✕ button.
