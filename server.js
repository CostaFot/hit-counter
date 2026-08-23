import http from "node:http";
import pg from "pg";
import { STYLES, DEFAULT_STYLE } from "./styles.js";

const PORT = Number(process.env.PORT || 3000);
const CACHE_SECONDS = Number(process.env.CACHE_SECONDS || 60);
const MIN_DIGITS = Number(process.env.MIN_DIGITS || 6);
const COUNT_OFFSET = Number(process.env.COUNT_OFFSET || 0);
const WEBSITE_ID = process.env.WEBSITE_ID || null;
const MOCK_COUNT = process.env.MOCK_COUNT ? Number(process.env.MOCK_COUNT) : null;

const pool = MOCK_COUNT === null
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
  : null;

let cached = { count: null, at: 0 };

async function fetchCount() {
  if (MOCK_COUNT !== null) return MOCK_COUNT;
  // event_type = 1 is a pageview in umami's schema
  const sql = WEBSITE_ID
    ? "SELECT count(*)::bigint AS n FROM website_event WHERE event_type = 1 AND website_id = $1"
    : "SELECT count(*)::bigint AS n FROM website_event WHERE event_type = 1";
  const args = WEBSITE_ID ? [WEBSITE_ID] : [];
  const { rows } = await pool.query(sql, args);
  return Number(rows[0].n);
}

async function getCount() {
  const now = Date.now();
  if (cached.count !== null && now - cached.at < CACHE_SECONDS * 1000) {
    return cached.count;
  }
  try {
    const n = (await fetchCount()) + COUNT_OFFSET;
    cached = { count: n, at: now };
    return n;
  } catch (err) {
    console.error("count query failed:", err.message);
    if (cached.count !== null) return cached.count; // serve stale on error
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }
  if (url.pathname === "/" || url.pathname === "/counter.svg") {
    const style = url.searchParams.get("style") || process.env.COUNTER_STYLE || DEFAULT_STYLE;
    const render = STYLES[style];
    if (!render) {
      res.writeHead(400, { "content-type": "text/plain" });
      return res.end(`unknown style; valid: ${Object.keys(STYLES).join(", ")}`);
    }
    try {
      const count = await getCount();
      const digits = String(count).padStart(MIN_DIGITS, "0").split("");
      res.writeHead(200, {
        "content-type": "image/svg+xml",
        "cache-control": "no-cache, max-age=0",
        "access-control-allow-origin": "*",
      });
      return res.end(render(digits, count));
    } catch {
      res.writeHead(503, { "content-type": "text/plain" });
      return res.end("counter unavailable");
    }
  }
  if (url.pathname === "/styles") {
    const rows = Object.keys(STYLES)
      .map(
        (s) => `<div style="margin: 28px 0; text-align: center;">
          <p style="font-family: monospace; color: #aaa; margin-bottom: 10px;">${s}${s === DEFAULT_STYLE ? " (default)" : ""} — /counter.svg?style=${s}</p>
          <img src="/counter.svg?style=${s}" alt="${s} style" height="52">
        </div>`
      )
      .join("");
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-cache" });
    return res.end(`<!doctype html><html><head><title>hit-counter styles</title></head>
      <body style="background: #1a1a1a; padding: 40px; font-family: monospace;">
      <h1 style="color: #ddd; text-align: center;">hit-counter styles</h1>${rows}</body></html>`);
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`hit-counter listening on :${PORT}`);
  if (pool) {
    try {
      const { rows } = await pool.query(
        "SELECT website_id, name, domain FROM website"
      );
      console.log("umami websites:", JSON.stringify(rows));
      console.log("current pageview count:", await fetchCount());
    } catch (err) {
      console.error("startup DB check failed:", err.message);
    }
  }
});
