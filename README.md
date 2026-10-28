# Industry BOM Registry — SPA

A React single-page app over the **Industry BOM Registry** (the static registry lives in
[`industry-bom-registry`](https://github.com/meow21091999-code/industry-bom-registry)).

This repo is the app; the static registry remains the source of truth for the analysis.

## What it does

- **Register** (`/`) — every industry, grouped by sector, searchable.
- **Entry page** (`/i/:slug`) — metric cards with a detail popup, the full digest, the
  BOM tree & company map (click a node → its companies), and the company × node matrix.
- **Companies** (`/companies`) — all companies ranked by breadth, then direct-player position.
- **Company page** (`/c/:key`) — one company, every industry it appears in, its position
  (direct / indirect / conglomerate / supplier) and the nodes it serves.

Routes use `HashRouter`, so the app works on GitHub Pages with no server rewrites.

## Data

`data/registry.json` is generated from the static registry's entry pages — it is derived,
never hand-edited:

```bash
node extract.mjs        # reads ../industry-bom-registry and writes data/registry.json
```

It carries, per industry: title, sector group, scope chips, metric cards, digest blocks and
the full `NODES` tree with each node's companies (name, ticker, exposure, materiality,
evidence). Company pages come from the registry's `companies.json`.

Every figure keeps the data label recorded on its entry page — `[REPORTED]`, `[CALCULATED]`,
`[UNAVAILABLE]`. Nothing is inferred in this repo.

## Build

```bash
npm install
node build.mjs          # esbuild → dist/ (app.js + app.css + index.html)
```

Deployment is automated: a push to `main` builds `dist/` and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`).

## Notes

- `npm run dev` uses Vite for local development. The production build uses **esbuild**
  directly, so it does not depend on Vite's toolchain.
- The bundle inlines `registry.json` (~1.5 MB), so first load carries the whole registry;
  no per-page fetch, no API.
