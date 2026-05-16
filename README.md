# Onyx Paper Trader

Paper trading for live prediction-market prices from the Onyx Predictions API.

Live app: https://onyx-take-home.vercel.app/

## Features

- Local sign up, login, and logout.
- Each account starts with a $1,000 paper balance.
- Browse open Onyx markets with search, sport filtering, and pagination.
- Live price polling for visible markets, the selected market, and held positions.
- Place simulated market orders for YES or NO.
- Orders fill instantly at the latest local Onyx price and never hit the upstream order API.
- Track order history, positions, average entry, mark price, and unrealized P&L.

## Run Locally

```bash
npm install
npm run dev
```

The app runs on Vite. In local development, requests to `/onyx/*` are proxied to:

```txt
https://predictions.dev-onyxodds.com/*
```

That keeps browser requests same-origin and avoids depending on upstream CORS settings.

## Build

```bash
npm run build
```

## Deployment

The app is deployed on Vercel:

https://onyx-take-home.vercel.app/

`vercel.json` includes the same `/onyx/*` rewrite used locally, plus the SPA fallback to `index.html`.

## Design Decisions

**Client-only app:** I kept the implementation in Vite/React to move quickly from the provided clean scaffold.

**Local auth and storage:** Accounts, balances, fills, and positions are stored in `localStorage`. This is not production auth, but it keeps the paper-trading workflow self-contained for the time-box.

**Paper trading only:** The app only reads from Onyx market and price endpoints. It does not call the upstream `/orders` endpoint.

**Polling over streaming:** Prices refresh every 10 seconds for the markets currently visible, the selected order-ticket market, and symbols in the user's positions. This is simple, explainable, and avoids over-fetching the whole market universe.

**Position model:** Positions are aggregated from fills by `symbol + side`. Average entry is cost-weighted. Unrealized P&L uses the latest available mark price.

## Tradeoffs

- LocalStorage means account state is browser-local and not shared across devices.
- Passwords are not securely stored because this is a local paper-auth implementation.
- There is no settlement flow or realized P&L yet.
- Market pagination is client-side over the loaded market page.
- Some Onyx markets do not return a usable live price; the order ticket disables trading when no price is available.

## What I Would Do Next

- Replace local auth with Supabase Auth or Clerk.
- Persist accounts, balances, fills, and positions in Postgres.
- Move Onyx calls through serverless functions so API keys stay server-side.
- Add settlement handling and realized P&L.
- Add tests around balance checks, fill recording, position aggregation, and P&L.
