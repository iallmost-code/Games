#!/usr/bin/env node
'use strict';
// Bake original image_gen key drawings into uniform, grounded extension atlases.
// Source originals stay in generated_images. No gameplay or runtime state is used.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
sharp.concurrency(1);
const ROOT = path.resolve(__dirname, '..');
const SOURCE = process.env.LIVING_CRYPT_ART_SOURCE || '/workspace/generated_images';
const OUTPUT = path.join(ROOT, 'assets/cinematic/living-crypt/heroes');
const sources = {
  gravecaller: {
    front: 'exec-52dad7f2-6d96-4d5d-95a0-dd7dab281950.png',
    back: 'exec-397ba159-5a32-4f64-8362-9d186e4ddef1.png',
    idle: 'exec-d7c14004-6aab-4b68-a79b-f318213b648a.png'
  },
  ember: {
    main: 'exec-de648a92-ce73-4b0a-bedf-544298155063.png',
    back: 'exec-08da12c3-8498-4580-9606-1df631cc3964.png',
    idle: 'exec-e779f14c-19c5-4f9d-8526-15a97194e90f.png'
  },
  sunwarden: {
    main: 'exec-7b5a036a-4618-4e5d-a99c-a5466b12fbc6.png',
    back: 'exec-6e37f519-5538-497b-b6ba-4f867fb44798.png',
    idle: 'exec-86b4a711-7ef5-4ffe-a614-9d903a2672ce.png'
  }
};

async function readSource(name) {
  const bytes = fs.readFileSync(path.join(SOURCE, name));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, seen = new Uint8Array(w * h), components = [];
  for (let id = 0; id < w * h; id++) {
    if (seen[id] || data[id * 4 + 3] < 40) continue;
    const members = [id]; let at = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    seen[id] = 1;
    while (at < members.length) {
      const p = members[at++], x = p % w, y = (p / w) | 0;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (const n of [p - 1, p + 1, p - w, p + w, p - w - 1, p - w + 1, p + w - 1, p + w + 1]) {
        if (n < 0 || n >= w * h || seen[n] || data[n * 4 + 3] < 40 || Math.abs(n % w - x) > 1) continue;
        seen[n] = 1; members.push(n);
      }
    }
    if (members.length > 2000) components.push({ x0, y0, x1, y1, members });
  }
  return { name, data, w, h, components, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
function take(source, lo, hi, expected) {
  const found = source.components.filter(c => c.y0 >= lo && c.y0 < hi).sort((a, b) => a.x0 - b.x0);
  if (found.length !== expected) throw new Error(`${source.name}: ${lo}..${hi}: ${found.length} drawings, wanted ${expected}`);
  return found.map(component => ({ source, component }));
}
async function fit(entry, row, col) {
  const { source: s, component: c } = entry;
  // Isolate the selected authored silhouette, retaining its original anti-alias
  // fringe, without picking up nearby figures or an unrelated backdrop.
  const selected = new Uint8Array(s.w * s.h);
  for (const p of c.members) selected[p] = 1;
  for (const p of c.members) {
    const x = p % s.w;
    for (const n of [p - 1, p + 1, p - s.w, p + s.w, p - s.w - 1, p - s.w + 1, p + s.w - 1, p + s.w + 1]) {
      if (n >= 0 && n < s.w * s.h && Math.abs(n % s.w - x) <= 1 && s.data[n * 4 + 3] > 1) selected[n] = 1;
    }
  }
  const left = Math.max(0, c.x0 - 1), top = Math.max(0, c.y0 - 1);
  const cw = Math.min(s.w - 1, c.x1 + 1) - left + 1, ch = Math.min(s.h - 1, c.y1 + 1) - top + 1;
  const raw = Buffer.alloc(cw * ch * 4);
  let footSum = 0, footWeight = 0;
  const footTop = c.y1 - Math.max(4, Math.round((c.y1 - c.y0) * .10));
  for (let y = top; y < top + ch; y++) for (let x = left; x < left + cw; x++) {
    const p = y * s.w + x, dest = ((y - top) * cw + x - left) * 4;
    if (!selected[p]) continue;
    s.data.copy(raw, dest, p * 4, p * 4 + 4);
    if (y >= footTop && s.data[p * 4 + 3] >= 128) { footSum += x; footWeight++; }
  }
  const footX = footWeight ? footSum / footWeight - left : cw / 2;
  const scale = Math.min(170 / ch, 109 / Math.max(1, footX), 109 / Math.max(1, cw - footX));
  const width = Math.max(1, Math.round(cw * scale)), height = Math.max(1, Math.round(ch * scale));
  const x = Math.max(3, Math.min(221 - width, Math.round(112 - footX * scale))), y = 188 - height;
  const png = await sharp(raw, { raw: { width: cw, height: ch, channels: 4 } }).resize(width, height, { fit: 'fill' }).png().toBuffer();
  return { input: png, left: col * 224 + x, top: row * 192 + y,
    metadata: { row, col, bounds: [x, y, width, height], source: s.name, cut: [left, top, cw, ch], footX: Math.round(footX * 100) / 100 } };
}
async function bake(kind) {
  const cfg = sources[kind], decoded = {};
  for (const [key, filename] of Object.entries(cfg)) decoded[key] = await readSource(filename);
  let rows;
  if (kind === 'gravecaller') {
    const frontWalk = take(decoded.front, 0, 100, 6), frontIdle = take(decoded.front, 400, 500, 4);
    const backWalk = take(decoded.back, 0, 100, 6), backIdle = take(decoded.back, 350, 450, 4);
    rows = [frontWalk, backWalk, take(decoded.idle, 0, 100, 4), take(decoded.idle, 300, 450, 4), take(decoded.idle, 650, 750, 4), frontIdle, backIdle];
  } else if (kind === 'ember') {
    const backWalk = take(decoded.back, 0, 100, 6), backIdle = take(decoded.back, 450, 600, 4);
    // The source's last walk drawing cuts its staff at the canvas edge. Use the
    // complete, separately authored planted-foot return stance for loop closure.
    backWalk[5] = backIdle[3];
    rows = [take(decoded.main, 0, 100, 6), backWalk, take(decoded.idle, 0, 100, 4), take(decoded.idle, 350, 450, 4), take(decoded.idle, 700, 800, 4), take(decoded.main, 850, 950, 4), backIdle];
  } else {
    rows = [take(decoded.main, 0, 100, 6), take(decoded.back, 0, 100, 6), take(decoded.idle, 0, 100, 4), take(decoded.idle, 200, 350, 4), take(decoded.idle, 500, 650, 4), take(decoded.idle, 750, 950, 4), take(decoded.back, 400, 500, 4)];
  }
  const frames = [];
  for (let row = 0; row < rows.length; row++) for (let col = 0; col < rows[row].length; col++) frames.push(await fit(rows[row][col], row, col));
  const base = sharp({ create: { width: 1344, height: 1344, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(frames.map(({ input, left, top }) => ({ input, left, top })));
  const pngPath = path.join(OUTPUT, `${kind}.png`), webpPath = path.join(OUTPUT, `${kind}.webp`);
  await base.clone().png({ compressionLevel: 9 }).toFile(pngPath);
  await base.clone().webp({ quality: 80, alphaQuality: 100, effort: 5 }).toFile(webpPath);
  const metadata = { version: 1, authoring: 'Original image_gen painted diagonal footfalls and idle breathing key poses; no still-image perspective transforms. Alpha-isolated drawings fitted uncropped into grounded cells.',
    grid: { cols: 6, rows: 7, cellWidth: 224, cellHeight: 192, anchor: [112, 188] },
    rows: ['downRightWalk', 'upRightWalk', 'downIdle', 'rightIdle', 'upIdle', 'downRightIdle', 'upRightIdle'], activeFrames: 32,
    webpBytes: fs.statSync(webpPath).size, frames: frames.map(f => f.metadata),
    sources: Object.values(decoded).map(s => ({ source: s.name, sha256: s.sha256, size: [s.w, s.h] })) };
  if (kind === 'ember') metadata.authoringNote = 'Rear walk loop closes with an independently drawn complete return stance; the edge-clipped draft drawing is excluded.';
  fs.writeFileSync(path.join(OUTPUT, `${kind}.json`), JSON.stringify(metadata, null, 2) + '\n');
  console.log(JSON.stringify({ kind, frames: frames.length, pngBytes: fs.statSync(pngPath).size, webpBytes: metadata.webpBytes }));
}
fs.mkdirSync(OUTPUT, { recursive: true });
(async () => { for (const kind of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sources)) await bake(kind); })().catch(error => { console.error(error); process.exitCode = 1; });
