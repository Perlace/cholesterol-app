// Fabrique les icônes PNG (180, 192, 512) à partir des mêmes formes que icones/icone.svg, sans dépendance.
const fs = require("fs"), zlib = require("zlib"), path = require("path");
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const crc = b => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return (~c) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// Formes en coordonnées 0..128 (comme le SVG)
const fond = [0x2c, 0x5f, 0x8a], blanc = [255, 255, 255], vert = [0x7f, 0xd4, 0x9a];
const dSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
function couleur(x, y, marge) {
  // marge : fond plein (maskable) ou coins arrondis
  const r = 28, ix = Math.max(r - x, x - (128 - r), 0), iy = Math.max(r - y, y - (128 - r), 0);
  if (!marge && Math.hypot(ix, iy) > r) return null;
  const d = Math.hypot(x - 64, y - 64);
  if (Math.abs(d - 34) <= 4.5) return blanc;
  if (dSeg(x, y, 46, 66, 58, 78) <= 5 || dSeg(x, y, 58, 78, 82, 52) <= 5) return vert;
  return fond;
}
function fabriquer(taille, marge, nom) {
  const buf = Buffer.alloc(taille * taille * 4), ss = 4;
  for (let y = 0; y < taille; y++) for (let x = 0; x < taille; x++) {
    let acc = [0, 0, 0, 0];
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      let u = (x + (sx + .5) / ss) / taille * 128, v = (y + (sy + .5) / ss) / taille * 128;
      if (marge) { u = 64 + (u - 64) * 1.25; v = 64 + (v - 64) * 1.25; } // zone sûre maskable
      const c = couleur(u, v, marge) || (marge ? fond : null);
      if (c) { acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += 255; }
    }
    const n = ss * ss, i = (y * taille + x) * 4, a = acc[3] / n;
    buf[i] = a ? acc[0] / (acc[3] / 255) : 0; buf[i + 1] = a ? acc[1] / (acc[3] / 255) : 0; buf[i + 2] = a ? acc[2] / (acc[3] / 255) : 0; buf[i + 3] = a;
  }
  fs.writeFileSync(path.join(__dirname, "..", "icones", nom), png(taille, taille, buf));
  console.log(nom);
}
fabriquer(180, true, "icone-180.png");
fabriquer(192, false, "icone-192.png");
fabriquer(512, true, "icone-512.png");
