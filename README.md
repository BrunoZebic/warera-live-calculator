# WarEra Live Damage Calculator

Small React + TypeScript app for planning WarEra battle damage.

It supports:
- `Solo` mode for one live player lookup
- `Group` mode for multi-player action totals
- hidden `Manual` fallback mode when live API lookup is unavailable
- a future-hours slider that projects health, hunger, and total damage

## Stack

- Vite
- React 19
- TypeScript
- TanStack Query
- `@wareraprojects/api`

## Development

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Config

The app talks to WarEra TRPC by default:

```bash
VITE_API_BASE=https://api2.warera.io/trpc
```

If deployment hits browser CORS issues, point `VITE_API_BASE` at a tiny proxy instead.

## Notes

- Live player data comes from WarEra API payloads.
- Runtime food restore percentages are loaded from `gameConfig.getGameConfig`.
- The calculator uses expected-value projections, not guaranteed battle outcomes.
- If live config cannot be loaded, the app falls back to cached or safe local defaults so manual calculation still works.
