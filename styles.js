// SVG renderers for the counter. Each style takes an array of digit chars
// and the raw count (for the aria-label) and returns a complete SVG string.

const wrap = (w, h, count, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Visitor counter: ${count}">${inner}</svg>`;

// ---------------------------------------------------------------- odometer
function odometer(digits, count) {
  const CW = 26, CH = 42, GAP = 3, PAD = 8;
  const w = PAD * 2 + digits.length * CW + (digits.length - 1) * GAP;
  const h = PAD * 2 + CH;
  const cells = digits.map((d, i) => {
    const x = PAD + i * (CW + GAP);
    return `<g>
      <rect x="${x}" y="${PAD}" width="${CW}" height="${CH}" rx="3" fill="url(#drum)"/>
      <text x="${x + CW / 2}" y="${PAD + CH / 2}" dy="0.36em" font-family="'Courier New', Courier, monospace" font-size="30" font-weight="bold" fill="#f5f5f0" text-anchor="middle">${d}</text>
      <rect x="${x}" y="${PAD}" width="${CW}" height="${CH}" rx="3" fill="url(#shade)"/>
    </g>`;
  }).join("");
  return wrap(w, h, count, `<defs>
    <linearGradient id="drum" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000"/><stop offset="0.5" stop-color="#2e2e2e"/><stop offset="1" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.25" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a8a8a"/><stop offset="0.5" stop-color="#4a4a4a"/><stop offset="1" stop-color="#6f6f6f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="url(#bezel)"/>
  <rect x="${PAD - 3}" y="${PAD - 3}" width="${w - (PAD - 3) * 2}" height="${h - (PAD - 3) * 2}" rx="4" fill="#111"/>${cells}`);
}

// ------------------------------------------------------- seven-segment core
// Segment layout inside an 18x32 digit box.
const SEG_SHAPES = {
  A: [3, 0, 12, 3], G: [3, 14.5, 12, 3], D: [3, 29, 12, 3],
  F: [0, 3.5, 3, 11], B: [15, 3.5, 3, 11], E: [0, 17.5, 3, 11], C: [15, 17.5, 3, 11],
};
const SEG_MAP = {
  0: "ABCDEF", 1: "BC", 2: "ABGED", 3: "ABGCD", 4: "FGBC",
  5: "AFGCD", 6: "AFGECD", 7: "ABC", 8: "ABCDEFG", 9: "ABCDFG",
};

function sevenSegment(digits, count, { bg, frame, lit, unlit, glow }) {
  const DW = 18, DH = 32, GAP = 9, PAD = 11;
  const w = PAD * 2 + digits.length * DW + (digits.length - 1) * GAP;
  const h = PAD * 2 + DH;
  const cells = digits.map((d, i) => {
    const ox = PAD + i * (DW + GAP);
    const on = SEG_MAP[d];
    return Object.entries(SEG_SHAPES).map(([name, [sx, sy, sw, sh]]) => {
      const isOn = on.includes(name);
      return `<rect x="${ox + sx}" y="${PAD + sy}" width="${sw}" height="${sh}" rx="1.5" fill="${isOn ? lit : unlit}"${isOn && glow ? ' filter="url(#glow)"' : ""}/>`;
    }).join("");
  }).join("");
  const defs = glow
    ? `<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    : "";
  return wrap(w, h, count, `${defs}
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="5" fill="${frame}"/>
  <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="3" fill="${bg}"/>${cells}`);
}

// green LED display, glowing digits on black
const led = (d, c) =>
  sevenSegment(d, c, { bg: "#0a0f0a", frame: "#2b2b2b", lit: "#41ff5a", unlit: "#12210f", glow: true });

// calculator LCD, dark segments on pale green with ghost segments
const lcd = (d, c) =>
  sevenSegment(d, c, { bg: "#b5bfa1", frame: "#6f6f66", lit: "#1e281e", unlit: "rgba(30,40,30,0.09)", glow: false });

// ----------------------------------------------------------------- strip
// Count.cgi look: one continuous black band, beveled ridge border
function strip(digits, count) {
  const CW = 22, CH = 38, B = 4;
  const w = B * 2 + digits.length * CW;
  const h = B * 2 + CH;
  const cells = digits.map((d, i) => {
    const x = B + i * CW;
    const sep = i > 0 ? `<line x1="${x}" y1="${B + 2}" x2="${x}" y2="${B + CH - 2}" stroke="#333" stroke-width="1"/>` : "";
    return `${sep}<text x="${x + CW / 2}" y="${B + CH / 2}" dy="0.36em" font-family="'Courier New', Courier, monospace" font-size="30" font-weight="bold" fill="#e8e8e0" text-anchor="middle">${d}</text>`;
  }).join("");
  return wrap(w, h, count, `
  <rect x="0" y="0" width="${w}" height="${h}" fill="#c0c0c0"/>
  <path d="M0,${h} L0,0 L${w},0" stroke="#f2f2f2" stroke-width="2" fill="none"/>
  <path d="M${w},0 L${w},${h} L0,${h}" stroke="#484848" stroke-width="2" fill="none"/>
  <rect x="${B - 1}" y="${B - 1}" width="${w - B * 2 + 2}" height="${h - B * 2 + 2}" fill="#000"/>${cells}`);
}

// ----------------------------------------------------------------- nixie
function nixie(digits, count) {
  const CW = 26, CH = 42, GAP = 4, PAD = 9;
  const w = PAD * 2 + digits.length * CW + (digits.length - 1) * GAP;
  const h = PAD * 2 + CH;
  const cells = digits.map((d, i) => {
    const x = PAD + i * (CW + GAP);
    return `<g>
      <rect x="${x}" y="${PAD}" width="${CW}" height="${CH}" rx="8" fill="#150d08" stroke="#3a2e24" stroke-width="1"/>
      <text x="${x + CW / 2}" y="${PAD + CH / 2}" dy="0.36em" font-family="'Courier New', Courier, monospace" font-size="28" fill="#2b1608" text-anchor="middle">8</text>
      <text x="${x + CW / 2}" y="${PAD + CH / 2}" dy="0.36em" font-family="'Courier New', Courier, monospace" font-size="28" fill="#ffb02e" text-anchor="middle" filter="url(#nglow)">${d}</text>
    </g>`;
  }).join("");
  return wrap(w, h, count, `<defs>
    <filter id="nglow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.8" result="b"/>
      <feFlood flood-color="#ff7a00" flood-opacity="0.8"/><feComposite in2="b" operator="in" result="c"/>
      <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="7" fill="#0c0805"/>${cells}`);
}

// ------------------------------------------------------------------ flip
// split-flap: two-tone halves with a hinge line
function flip(digits, count) {
  const CW = 28, CH = 42, GAP = 4, PAD = 8;
  const w = PAD * 2 + digits.length * CW + (digits.length - 1) * GAP;
  const h = PAD * 2 + CH;
  const mid = PAD + CH / 2;
  const cells = digits.map((d, i) => {
    const x = PAD + i * (CW + GAP);
    return `<g>
      <clipPath id="top${i}"><rect x="${x}" y="${PAD}" width="${CW}" height="${CH / 2}"/></clipPath>
      <clipPath id="bot${i}"><rect x="${x}" y="${mid}" width="${CW}" height="${CH / 2}"/></clipPath>
      <rect x="${x}" y="${PAD}" width="${CW}" height="${CH / 2}" rx="3" fill="#3b3b3f"/>
      <rect x="${x}" y="${mid}" width="${CW}" height="${CH / 2}" rx="3" fill="#26262a"/>
      <rect x="${x}" y="${mid - 3}" width="${CW}" height="6" fill="#303034"/>
      <text clip-path="url(#top${i})" x="${x + CW / 2}" y="${mid}" dy="0.36em" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="bold" fill="#f2f2ee" text-anchor="middle">${d}</text>
      <text clip-path="url(#bot${i})" x="${x + CW / 2}" y="${mid}" dy="0.36em" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="bold" fill="#d8d8d2" text-anchor="middle">${d}</text>
      <line x1="${x}" y1="${mid}" x2="${x + CW}" y2="${mid}" stroke="#0d0d0f" stroke-width="1.5"/>
      <rect x="${x - 1.5}" y="${mid - 3}" width="3" height="6" rx="1" fill="#0d0d0f"/>
      <rect x="${x + CW - 1.5}" y="${mid - 3}" width="3" height="6" rx="1" fill="#0d0d0f"/>
    </g>`;
  }).join("");
  return wrap(w, h, count, `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="#141416"/>${cells}`);
}

export const STYLES = { odometer, led, lcd, strip, nixie, flip };
export const DEFAULT_STYLE = "odometer";
