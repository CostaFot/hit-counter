# hit-counter — agent notes

Old-school visitor counter for costafotiadis.com in six selectable retro styles
(see `styles-preview.png`). Serves an SVG image whose count is read from the
umami analytics database. The live site currently uses the `led` style, set via
`COUNTER_STYLE` on the Railway service — not in Ghost, whose embed URL carries
no `?style=` param.

## Architecture

- Node HTTP server (`server.js`) plus SVG renderers (`styles.js`), ESM, no framework. Only dependency: `pg`.
- Reads pageview count directly from umami's Postgres: `SELECT count(*) FROM website_event WHERE event_type = 1 AND website_id = $1`. There is no umami API involvement — schema coupling to umami v2 is deliberate (avoids auth tokens).
- Count is cached in memory for `CACHE_SECONDS`; on DB error the last known value is served (stale-on-error).
- SVG renderers live in `styles.js` (`STYLES` map: odometer, led, lcd, strip, nixie, flip). Style is chosen per-request via `?style=` or globally via the `COUNTER_STYLE` env var (default `odometer`). `GET /styles` serves an HTML gallery of all of them with the live count. No external fonts (SVG in `<img>` cannot load them); text styles use `Courier New`/monospace.

## Endpoints

- `GET /` or `/counter.svg` — the counter image (`Cache-Control: no-cache`, CORS `*`); optional `?style=` overrides the configured style, unknown names 400 with the valid list
- `GET /styles` — HTML gallery of all styles rendering the live count
- `GET /healthz` — plain "ok"

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | umami Postgres (Railway reference `${{Postgres.DATABASE_URL}}`) |
| `WEBSITE_ID` | unset = all sites | umami website UUID to count |
| `COUNTER_STYLE` | `odometer` | default style; prod sets `led` |
| `CACHE_SECONDS` | 60 | in-memory cache TTL |
| `MIN_DIGITS` | 6 | zero-padding width |
| `COUNT_OFFSET` | 0 | added to the real count |
| `MOCK_COUNT` | unset | local dev: skip DB, render this number |
| `PORT` | 3000 | Railway injects 8080 |

## Deployment

- Railway project **analytics** (`aa7277e9-2ee8-4a0d-a658-bebc9c9d5399`), service **hit-counter**, environment `production`.
- The service deploys from GitHub: pushes to `main` on `CostaFot/hit-counter` auto-deploy (this also rebuilds the `count-backup` cron service, which tracks the same branch). No Dockerfile; Railpack detects Node and runs `npm start`.
- Public URL: https://hit-counter-production.up.railway.app/counter.svg
- Same project also hosts the `umami` and `Postgres` services; the counter reaches Postgres via private networking.

## Backups

- `backup.js` runs as a separate Railway cron service (**count-backup**, weekly) in the same project. It reads the count from Postgres and appends `date,pageviews` to `counts.csv` on the data-only `backups` branch via the GitHub Contents API.
- The `backups` branch is an orphan branch (no code). Railway only watches `main`, so backup commits never trigger deploys.
- Extra env vars for the cron service: `GITHUB_TOKEN` (fine-grained PAT, Contents read/write on this repo), `GITHUB_REPO`, `BACKUP_BRANCH`, `BACKUP_FILE` (all defaulted).

## Local development

```sh
npm install
MOCK_COUNT=4269 PORT=3111 node server.js
curl http://localhost:3111/counter.svg
```

On startup with a real `DATABASE_URL`, the server logs the umami website list and current count — useful for finding `WEBSITE_ID`.
