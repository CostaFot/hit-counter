# hit-counter — agent notes

Old-school odometer visitor counter for costafotiadis.com. Serves an SVG image
whose count is read from the umami analytics database.

## Architecture

- Single-file Node HTTP server (`server.js`), ESM, no framework. Only dependency: `pg`.
- Reads pageview count directly from umami's Postgres: `SELECT count(*) FROM website_event WHERE event_type = 1 AND website_id = $1`. There is no umami API involvement — schema coupling to umami v2 is deliberate (avoids auth tokens).
- Count is cached in memory for `CACHE_SECONDS`; on DB error the last known value is served (stale-on-error).
- SVG is rendered inline in `odometerSvg()` — metallic bezel, per-digit drum cells with gradient shading. No external fonts (SVG in `<img>` cannot load them); uses `Courier New`/monospace.

## Endpoints

- `GET /` or `/counter.svg` — the counter image (`Cache-Control: no-cache`, CORS `*`)
- `GET /healthz` — plain "ok"

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | umami Postgres (Railway reference `${{Postgres.DATABASE_URL}}`) |
| `WEBSITE_ID` | unset = all sites | umami website UUID to count |
| `CACHE_SECONDS` | 60 | in-memory cache TTL |
| `MIN_DIGITS` | 6 | zero-padding width |
| `COUNT_OFFSET` | 0 | added to the real count |
| `MOCK_COUNT` | unset | local dev: skip DB, render this number |
| `PORT` | 3000 | Railway injects 8080 |

## Deployment

- Railway project **analytics** (`aa7277e9-2ee8-4a0d-a658-bebc9c9d5399`), service **hit-counter**, environment `production`.
- Deploy from this directory: `railway up --service hit-counter --detach`. No Dockerfile; Railpack detects Node and runs `npm start`.
- Public URL: https://hit-counter-production.up.railway.app/counter.svg
- Same project also hosts the `umami` and `Postgres` services; the counter reaches Postgres via private networking.

## Local development

```sh
npm install
MOCK_COUNT=4269 PORT=3111 node server.js
curl http://localhost:3111/counter.svg
```

On startup with a real `DATABASE_URL`, the server logs the umami website list and current count — useful for finding `WEBSITE_ID`.
