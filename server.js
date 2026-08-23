import http from "node:http";
import pg from "pg";

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

const CELL_W = 26;
const CELL_H = 42;
const GAP = 3;
const PAD = 8;

function odometerSvg(count) {
  const digits = String(count).padStart(MIN_DIGITS, "0").split("");
  const w = PAD * 2 + digits.length * CELL_W + (digits.length - 1) * GAP;
  const h = PAD * 2 + CELL_H;

  const cells = digits
    .map((d, i) => {
      const x = PAD + i * (CELL_W + GAP);
      return `
  <g>
    <rect x="${x}" y="${PAD}" width="${CELL_W}" height="${CELL_H}" rx="3" fill="url(#drum)"/>
    <text x="${x + CELL_W / 2}" y="${PAD + CELL_H / 2}" dy="0.36em"
      font-family="'Courier New', Courier, monospace" font-size="30" font-weight="bold"
      fill="#f5f5f0" text-anchor="middle">${d}</text>
    <rect x="${x}" y="${PAD}" width="${CELL_W}" height="${CELL_H}" rx="3" fill="url(#shade)"/>
  </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Visitor counter: ${count}">
  <defs>
    <linearGradient id="drum" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000"/>
      <stop offset="0.5" stop-color="#2e2e2e"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="0.25" stop-color="#000000" stop-opacity="0"/>
      <stop offset="0.75" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a8a8a"/>
      <stop offset="0.5" stop-color="#4a4a4a"/>
      <stop offset="1" stop-color="#6f6f6f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="url(#bezel)"/>
  <rect x="${PAD - 3}" y="${PAD - 3}" width="${w - (PAD - 3) * 2}" height="${h - (PAD - 3) * 2}" rx="4" fill="#111111"/>
${cells}
</svg>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }
  if (url.pathname === "/" || url.pathname === "/counter.svg") {
    try {
      const count = await getCount();
      res.writeHead(200, {
        "content-type": "image/svg+xml",
        "cache-control": "no-cache, max-age=0",
        "access-control-allow-origin": "*",
      });
      return res.end(odometerSvg(count));
    } catch {
      res.writeHead(503, { "content-type": "text/plain" });
      return res.end("counter unavailable");
    }
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
