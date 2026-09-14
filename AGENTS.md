# Base44 Dev Environment

## What this app is
This repo contains two apps:
1. **`bar-digital-menu/`** — the primary app: a Vite + React 18 + TypeScript digital menu system for a Neapolitan aperitif bar, with mobile ordering, KDS (bar production kanban), POS (cashier), and a print station with ESC/POS generation.
2. **`gallery/`** — a Next.js 14 "Style Gallery" (part of the UI/UX Pro Max skill). Not currently run by compose.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: port 3000 (Vite dev server, bind 0.0.0.0)
- No database, no external APIs, no secrets required
- In-memory database (`src/lib/database.ts`) with pub/sub for real-time updates across panels
- `npm install` runs automatically at container start; node_modules kept in a named volume
- `WATCHPACK_POLLING=true` ensures hot reload works through the bind mount

## Bar Digital Menu — Key paths
- `bar-digital-menu/src/pages/Menu.tsx` — client mobile menu (table selector, categories, cart, order submission)
- `bar-digital-menu/src/pages/KDS.tsx` — bar production kanban (Novos/Preparando/Prontos) with sound alerts
- `bar-digital-menu/src/pages/POS.tsx` — cashier panel (table map, payment, reprint)
- `bar-digital-menu/src/pages/PrintStation.tsx` — print queue, auto-print, receipt preview, ESC/POS export
- `bar-digital-menu/src/lib/database.ts` — in-memory database (Supabase-ready architecture)
- `bar-digital-menu/src/lib/print.ts` — ESC/POS binary generation + receipt HTML + auto-print via hidden iframes
- `bar-digital-menu/src/lib/audio.ts` — Web Audio API beep for new KDS orders
- `bar-digital-menu/src/data/produtos.ts` — Neapolitan bar menu (Cervejas, Drinks, Destilados, Refrigerantes, Porções, Petiscos)

## Flow
1. Client selects table (QR code simulation) → browses menu → adds to cart with observations → sends order
2. Order creates two print jobs (bar + caixa) and appears on KDS with sound alert
3. Barman moves order through KDS (Novo → Preparando → Pronto)
4. Cashier views table map, closes account with payment method (Dinheiro/Cartão/Pix)
5. Print station shows queue, auto-prints via window.print() in hidden iframes, exports ESC/POS binary

## Notes
- `vite.config.ts` includes `allowedHosts: true` for the Base44 preview origin
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed through from the platform environment
- The `gallery/` Next.js app and `src/ui-ux-pro-max/` Python skill are part of the original repo but not run
