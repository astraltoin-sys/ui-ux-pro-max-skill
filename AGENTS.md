# Base44 Dev Environment

## What this app is
This repo is **UI/UX Pro Max** — an AI design-intelligence skill (Python search engine + CSV data). The runnable web app is in `gallery/`, a self-contained Next.js 14 app ("Style Gallery") that reads `gallery/data/styles.csv` and renders interactive style cards.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: port 3000 (Next.js dev server, bind 0.0.0.0)
- No database, no external APIs, no secrets required
- `npm install` runs automatically at container start; node_modules and .next are kept in named volumes to avoid polluting the bind mount
- `WATCHPACK_POLLING=true` ensures hot reload works through the bind mount

## Key paths
- `gallery/` — the Next.js app (app router, Tailwind, next-themes)
- `gallery/app/page.tsx` — server component, reads `data/styles.csv` via fs
- `gallery/components/` — StyleCard, GalleryGrid, FilterBar, StyleDetailModal, etc.
- `gallery/lib/` — CSV parsing, color extraction, CSS generation, filtering
- `src/ui-ux-pro-max/` — the Python skill source (search.py, core.py, design_system.py)

## Notes
- `next.config.js` includes `allowedDevOrigins` for the Base44 preview origin (no-op on Next 14, required on Next 15+)
- The repo also contains a `stack/` directory (Claude Code design stack) and `cli/` (npm installer) — neither is needed to run the gallery
