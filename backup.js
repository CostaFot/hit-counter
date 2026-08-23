// Weekly cron job: append the current pageview count to a CSV on a data-only
// branch via the GitHub Contents API. Runs once and exits (Railway cron).
import pg from "pg";

const REPO = process.env.GITHUB_REPO || "CostaFot/hit-counter";
const BRANCH = process.env.BACKUP_BRANCH || "backups";
const FILE = process.env.BACKUP_FILE || "counts.csv";
const TOKEN = process.env.GITHUB_TOKEN;
const WEBSITE_ID = process.env.WEBSITE_ID || null;

if (!TOKEN) {
  console.error("GITHUB_TOKEN is not set");
  process.exit(1);
}

const api = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "hit-counter-backup",
      ...init.headers,
    },
  });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const sql = WEBSITE_ID
  ? "SELECT count(*)::bigint AS n FROM website_event WHERE event_type = 1 AND website_id = $1"
  : "SELECT count(*)::bigint AS n FROM website_event WHERE event_type = 1";
const { rows } = await pool.query(sql, WEBSITE_ID ? [WEBSITE_ID] : []);
const count = Number(rows[0].n);
await pool.end();

const res = await api(`contents/${FILE}?ref=${BRANCH}`);
if (!res.ok && res.status !== 404) {
  console.error(`GET ${FILE} failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const existing = res.ok ? await res.json() : null;
const body = existing
  ? Buffer.from(existing.content, "base64").toString()
  : "date,pageviews\n";

const line = `${new Date().toISOString()},${count}\n`;
const put = await api(`contents/${FILE}`, {
  method: "PUT",
  body: JSON.stringify({
    message: `Backup: ${count} pageviews`,
    branch: BRANCH,
    content: Buffer.from(body + line).toString("base64"),
    ...(existing ? { sha: existing.sha } : {}),
  }),
});
if (!put.ok) {
  console.error(`PUT ${FILE} failed: ${put.status} ${await put.text()}`);
  process.exit(1);
}
console.log(`Backed up count ${count} to ${REPO}@${BRANCH}/${FILE}`);
