# hit-counter

Retro odometer-style visitor counter, rendered as SVG. Count sourced from a
self-hosted [umami](https://umami.is) Postgres database.

## Usage

```html
<img src="https://<your-deployment>/counter.svg" alt="visitor counter" height="58">
```

## Run

```sh
npm install
DATABASE_URL=postgres://... node server.js
```

Without a database: `MOCK_COUNT=4269 node server.js`.

## Configuration

Environment variables: `DATABASE_URL`, `WEBSITE_ID`, `CACHE_SECONDS` (60),
`MIN_DIGITS` (6), `COUNT_OFFSET` (0), `PORT` (3000). See AGENTS.md for details.

## Endpoints

- `/counter.svg` — the counter image
- `/healthz` — health check
