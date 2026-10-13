/* Original image_gen artwork normalization. No game state or runtime code. */
const sharp = require('sharp');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
sharp.concurrency(1);
sharp.cache({ memory: 16, files: 0, items: 32 });

const sources = {
  frostGolem: '/workspace/generated_images/exec-f1e02bb2-c112-4750-9b40-f548688a5285.png',
  cinderImp: '/workspace/generated_images/exec-9e280cdd-807c-4bfb-8422-bc947418b37b.png',
  sporeSpitter: '/workspace/generated_images/exec-c0c925e7-683c-455c-bb99-e392cf92eba4.png',
  champion: '/workspace/generated_images/exec-cb32298b-c0f9-4a00-ad79-098767169511.png'
};
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/cinematic/living-crypt/enemies');
const W = 144, H = 160, AX = 72, AY = 156;

function components(data, w, h) {
  const labels = new Int32Array(w * h), queue = new Int32Array(w * h), list = [];
  let serial = 0;
  for (let pos = 0; pos < w * h; pos++) {
    if (labels[pos] || data[pos * 4 + 3] < 80) continue;
    const id = ++serial;
    let a = 0, b = 1, x0 = w, y0 = h, x1 = 0, y1 = 0;
    queue[0] = pos; labels[pos] = id;
    const pixels = [];
    while (a < b) {
      const p = queue[a++], x = p % w, y = (p / w) | 0;
      pixels.push(p); x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          const n = yy * w + xx;
          if (!labels[n] && data[n * 4 + 3] >= 80) { labels[n] = id; queue[b++] = n; }
        }
      }
    }
    if (pixels.length > 2500) list.push({ id, pixels, x0, y0, x1, y1 });
  }
  return { labels, list };
}

function bounds(pixels, w) {
  let x0 = w, y0 = Infinity, x1 = 0, y1 = 0;
  for (const p of pixels) { const x = p % w, y = (p / w) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

async function normalize(kind, source) {
  const sourceBytes = await fs.readFile(source);
  const { data, info } = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { list, labels } = components(data, info.width, info.height);
  // Two neighbouring translucent toxic puffs touch. Their painted bodies are
  // separate; divide the effect at their natural column boundary before padding.
  if (kind === 'sporeSpitter') {
    const shared = list.find(c => c.pixels.length > 35000);
    if (shared) {
      list.splice(list.indexOf(shared), 1);
      const splitX = Math.round(info.width * 4 / 6);
      for (const left of [true, false]) {
        const pixels = shared.pixels.filter(p => (p % info.width < splitX) === left);
        list.push({ id: shared.id, pixels, ...bounds(pixels, info.width), splitX, left });
      }
    }
  }
  if (list.length !== 32) throw new Error(`${kind}: expected 32 silhouettes, found ${list.length}`);
  const rows = Array.from({ length: 6 }, () => []);
  for (const c of list) {
    const row = Math.max(0, Math.min(5, Math.round(((c.y0 + c.y1) / 2 - info.height / 12) / (info.height / 6))));
    rows[row].push(c);
  }
  for (let row = 0; row < 6; row++) {
    rows[row].sort((a, b) => a.x0 - b.x0);
    if (rows[row].length !== (row === 4 ? 2 : 6)) throw new Error(`${kind}: bad row ${row}`);
  }
  const prepared = [];
  for (let row = 0; row < 6; row++) for (let col = 0; col < rows[row].length; col++) {
    const c = rows[row][col], owned = new Set(c.pixels), frontier = [...c.pixels];
    // Preserve soft anti-aliasing/glow around this figure, while excluding all
    // adjacent figures even when a raised weapon crosses an uneven source row.
    let edge = frontier;
    for (let step = 0; step < 3; step++) {
      const next = [];
      for (const p of edge) {
        const x = p % info.width, y = (p / info.width) | 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(info.height - 1, y + 1); yy++) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(info.width - 1, x + 1); xx++) {
            const n = yy * info.width + xx;
            if (owned.has(n) || !data[n * 4 + 3]) continue;
            if (labels[n] && labels[n] !== c.id) continue;
            if (c.splitX && ((xx < c.splitX) !== c.left)) continue;
            owned.add(n); next.push(n);
          }
        }
      }
      edge = next;
    }
    const b = bounds(owned, info.width), width = b.x1 - b.x0 + 1, height = b.y1 - b.y0 + 1;
    const rgba = Buffer.alloc(width * height * 4);
    for (const p of owned) {
      const x = p % info.width, y = (p / info.width) | 0;
      const dst = ((y - b.y0) * width + x - b.x0) * 4;
      data.copy(rgba, dst, p * 4, p * 4 + 4);
      if (c.splitX) {
        // The shared toxic mist dissipates before the neighbouring creature;
        // avoid a hard cropped fog edge while preserving both whole bodies.
        const distance = c.left ? c.splitX - x : x - c.splitX;
        rgba[dst + 3] = Math.round(rgba[dst + 3] * Math.min(1, distance / 14));
      }
    }
    prepared.push({ row, col, rgba, width, height, sourceBounds: [b.x0, b.y0, width, height] });
  }
  const walk = prepared.filter(f => f.row < 3);
  const heights = walk.map(f => f.height).sort((a, b) => a - b);
  const medianHeight = heights[9];
  const walkXFit = Math.min(1, 138 / Math.max(...walk.map(f => 148 * f.width / f.height)));
  const composites = [], frames = [];
  for (const f of prepared) {
    let width, height;
    if (f.row < 3) { height = 148; width = Math.round(148 * f.width / f.height * walkXFit); }
    else {
      const scale = Math.min(148 / medianHeight, 138 / f.width, 150 / f.height);
      width = Math.max(1, Math.round(f.width * scale)); height = Math.max(1, Math.round(f.height * scale));
    }
    const input = await sharp(f.rgba, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
    const left = AX - Math.round(width / 2), top = AY - height;
    composites.push({ input, left: f.col * W + left, top: f.row * H + top });
    frames.push({ index: f.row * 6 + f.col, sourceBounds: f.sourceBounds, bounds: [left, top, width, height] });
  }
  const image = sharp({ create: { width: W * 6, height: H * 6, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites);
  const png = await image.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  const webp = await sharp(png).webp({ quality: 80, alphaQuality: 100, effort: 6 }).toBuffer();
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, kind + '.png'), png);
  await fs.writeFile(path.join(OUT, kind + '.webp'), webp);
  const metadata = { kind, originalArt: true, source: 'image_gen original painted poses, referenced current Ember Crypt monster costume',
    sourceSha256: crypto.createHash('sha256').update(sourceBytes).digest('hex'),
    columns: 6, rows: 6, cell: { width: W, height: H, footX: AX, footY: AY },
    poses: { down: [0, 6], side: [6, 6], up: [12, 6], attack: [18, 6], hit: [24, 2], death: [30, 6] },
    transparentIndices: [26, 27, 28, 29], webpBytes: webp.length, pngBytes: png.length, frames };
  await fs.writeFile(path.join(OUT, kind + '.art.json'), JSON.stringify(metadata, null, 2) + '\n');
  console.log(kind, `${webp.length} WebP bytes`, `${png.length} PNG bytes`, '32 original poses');
}

(async () => { for (const [kind, source] of Object.entries(sources)) {
  if (!process.argv[2] || process.argv.slice(2).includes(kind)) await normalize(kind, source);
} })()
  .catch(error => { console.error(error); process.exitCode = 1; });
