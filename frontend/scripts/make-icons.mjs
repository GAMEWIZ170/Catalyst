// Draws the app icons (a white "C" on the lagoon accent) as PNG files, with no packages: the PNG format is
// written by hand using Node's built-in zlib. Run it again only if the icon design changes:
//   node scripts/make-icons.mjs
// The colour below is the default (lagoon) accent from tokens.css. A PNG cannot read CSS variables.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACCENT = [14, 116, 144];
const WHITE = [255, 255, 255];
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};
const png = (size, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits per channel
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // no filter
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
};

// Inside the rounded square? corner is the corner radius as a share of the size (0 = a full square).
const inSquare = (x, y, corner) => {
  const r = corner;
  const dx = Math.max(r - x, 0, x - (1 - r));
  const dy = Math.max(r - y, 0, y - (1 - r));
  return dx * dx + dy * dy <= r * r;
};
// The "C": a ring with a gap on the right, rounded at both ends. glyph is the ring's outer radius as a share of the size.
const inC = (x, y, glyph) => {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const dist = Math.hypot(dx, dy);
  const outer = glyph;
  const inner = glyph * 0.58;
  const mid = (outer + inner) / 2;
  const half = (outer - inner) / 2;
  const gap = (42 * Math.PI) / 180; // half-width of the opening, measured from the right-hand side
  const angle = Math.atan2(dy, dx);
  if (dist >= inner && dist <= outer && Math.abs(angle) > gap) return true;
  // round caps where the ring is cut
  for (const sign of [-1, 1]) {
    const cx = 0.5 + mid * Math.cos(sign * gap);
    const cy = 0.5 + mid * Math.sin(sign * gap);
    if (Math.hypot(x - cx, y - cy) <= half) return true;
  }
  return false;
};

function draw(size, { corner, glyph }) {
  const rgba = Buffer.alloc(size * size * 4);
  const grid = 4; // 4x4 samples per pixel, so the edges are smooth
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < grid; sy++) {
        for (let sx = 0; sx < grid; sx++) {
          const x = (px + (sx + 0.5) / grid) / size;
          const y = (py + (sy + 0.5) / grid) / size;
          if (!inSquare(x, y, corner)) continue;
          const colour = inC(x, y, glyph) ? WHITE : ACCENT;
          r += colour[0]; g += colour[1]; b += colour[2]; a += 1;
        }
      }
      const i = (py * size + px) * 4;
      const n = grid * grid;
      if (a) { rgba[i] = Math.round(r / a); rgba[i + 1] = Math.round(g / a); rgba[i + 2] = Math.round(b / a); }
      rgba[i + 3] = Math.round((a / n) * 255);
    }
  }
  return png(size, rgba);
}

mkdirSync(out, { recursive: true });
// "any" icons have rounded corners. The maskable and Apple icons are full squares: the phone cuts the shape,
// so the C is kept inside the middle 60% (the safe zone).
writeFileSync(join(out, "icon-192.png"), draw(192, { corner: 0.22, glyph: 0.34 }));
writeFileSync(join(out, "icon-512.png"), draw(512, { corner: 0.22, glyph: 0.34 }));
writeFileSync(join(out, "icon-maskable-512.png"), draw(512, { corner: 0, glyph: 0.28 }));
writeFileSync(join(out, "apple-touch-icon.png"), draw(180, { corner: 0, glyph: 0.3 }));
console.log("Icons written to public/icons");
