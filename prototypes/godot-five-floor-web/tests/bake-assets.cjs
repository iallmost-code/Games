// Reproducible extraction from the original browser's cached presentation assets.
// Production HTML and animation modules are served unchanged except in-memory fixture exposure.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
const out = path.resolve(__dirname, '../native-art');
const heroes = ['gravecaller', 'ranger', 'sunwarden', 'ember', 'bloodknight', 'rogue', 'frostwarden'];
const raw = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const closure = '      })();';
assert.equal(raw.split(closure).length, 2, 'One main closure must be exposed');
const source = raw.replace(closure,
  'window.nativeArtFixture={art,zoneFloorTiles};\n' + closure);
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function compressTextures() {
  const os = require('node:os');
  const metadataFile = path.join(out, 'verification.json');
  const metadata = JSON.parse(fs.readFileSync(metadataFile));
  assert(!metadata.finalCompression, 'Compress only the exact lossless bake');
  const backup = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-native-exact-'));
  const names = Object.keys(metadata.assets);
  for (const name of names) fs.copyFileSync(path.join(out, name), path.join(backup, name));
  metadata.initialExactBake = { encoding: metadata.encoding, totals: metadata.totals, assets: metadata.assets };
  for (const quality of [92, 90]) {
    const results = [];
    const assets = {};
    let cursor = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (cursor < names.length) {
        const filename = names[cursor++];
        const input = fs.readFileSync(path.join(backup, filename));
        const encoded = await sharp(input).webp({ quality, alphaQuality: 100, effort: 4 }).toBuffer();
        const original = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.deepEqual(original.info, decoded.info, filename + ' final dimensions');
        let squaredError = 0, weightedError = 0, channels = 0, max = 0, compositedMax = 0;
        for (let i = 0; i < original.data.length; i += 4) {
          const alpha = original.data[i + 3];
          assert.equal(decoded.data[i + 3], alpha, filename + ' compressed alpha');
          if (alpha) for (let c = 0; c < 3; c++) {
            const error = Math.abs(original.data[i + c] - decoded.data[i + c]);
            squaredError += error * error;
            weightedError += (error * alpha / 255) ** 2;
            channels++;
            max = Math.max(max, error);
            compositedMax = Math.max(compositedMax, error * alpha / 255);
          }
        }
        const result = { filename, alphaMismatches: 0, visibleChannels: channels,
          visibleRGBRMSE: Math.sqrt(squaredError / channels), visibleRGBMax: max,
          alphaWeightedRGBRMSE: Math.sqrt(weightedError / channels), alphaWeightedRGBMax: compositedMax };
        // Transparent edges have unstable unassociated RGB; bound their displayed
        // contribution as well as reporting the unweighted error without hiding it.
        assert(result.alphaWeightedRGBRMSE < 8, filename + ' composited RGB error bound');
        fs.writeFileSync(path.join(out, filename), encoded);
        assets[filename] = { width: original.info.width, height: original.info.height, bytes: encoded.length, sha256: sha256(encoded) };
        results.push(result);
      }
    }));
    const bytes = Object.values(assets).reduce((n, asset) => n + asset.bytes, 0);
    const visibleChannels = results.reduce((n, result) => n + result.visibleChannels, 0);
    metadata.finalCompression = { quality, alphaQuality: 100, effort: 4, dimensionsPreserved: true,
      alphaMismatches: 0, visibleRGBRMSE: Math.sqrt(results.reduce((n, r) => n + r.visibleRGBRMSE ** 2 * r.visibleChannels, 0) / visibleChannels),
      visibleRGBMax: Math.max(...results.map(r => r.visibleRGBMax)),
      alphaWeightedRGBRMSE: Math.sqrt(results.reduce((n, r) => n + r.alphaWeightedRGBRMSE ** 2 * r.visibleChannels, 0) / visibleChannels),
      alphaWeightedRGBMax: Math.max(...results.map(r => r.alphaWeightedRGBMax)),
      assets: results.sort((a, b) => a.filename.localeCompare(b.filename)) };
    metadata.assets = assets;
    metadata.encoding = 'lossy WebP RGB, exact alpha and dimensions verified; initial cached browser geometry preserved';
    metadata.totals = { ...metadata.initialExactBake.totals, bytes };
    console.log(JSON.stringify({ quality, bytes, visibleRGBRMSE: metadata.finalCompression.visibleRGBRMSE, alphaWeightedRGBRMSE: metadata.finalCompression.alphaWeightedRGBRMSE }));
    if (bytes <= 8 * 1024 * 1024) break;
  }
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
}
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(source);
  }
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream');
  res.end(fs.readFileSync(file));
});

async function bake() {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const f = window.nativeArtFixture;
      return f && window.EmberHeroAnimation.diagnostics().loaded.length === 7 &&
        f.zoneFloorTiles.filter(Boolean).length === 3 &&
        ['prop-forge-bones', 'prop-cathedral-bones', 'cryptHeart', 'frostwarden-cast', 'rogue-cast'].every(key => f.art[key]?.cinematic) &&
        Object.values(f.art).every(img => img.complete && (img.naturalWidth || img.width));
    });
    assert.deepEqual(errors, [], 'Original page must initialize without errors');
    const inventory = await page.evaluate(() => ({
      sprites: Object.keys(window.nativeArtFixture.art).sort(),
      diagnostics: window.EmberHeroAnimation.diagnostics(),
    }));
    assert.equal(inventory.diagnostics.frames, 210);
    const manifest = { sprites: {}, heroes: {}, floors: [] };
    const metadata = {
      source: { html: sha256(raw), heroAnimation: sha256(fs.readFileSync(path.join(root, 'assets/cinematic/hero-animation.js'))) },
      encoding: 'lossless WebP, exact visible RGBA verified after decode',
      heroAtlas: { width: 1344, height: 960, columns: 6, rows: 5, cellWidth: 224, cellHeight: 192, anchor: { x: 112, y: 188 }, framesPerHero: 30, palettes: [0, 1, 2] },
      assets: {}, frameChecks: [], exceptions: [],
    };
    async function save(filename, dataURL) {
      const png = Buffer.from(dataURL.split(',')[1], 'base64');
      const encoded = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
      const original = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.deepEqual(decoded.info, original.info, filename + ' dimensions');
      for (let i = 0; i < original.data.length; i += 4) {
        assert.equal(decoded.data[i + 3], original.data[i + 3], filename + ' alpha');
        if (original.data[i + 3]) {
          for (let channel = 0; channel < 3; channel++) assert.equal(decoded.data[i + channel], original.data[i + channel], filename + ' visible channel');
        }
      }
      fs.writeFileSync(path.join(out, filename), encoded);
      metadata.assets[filename] = { width: original.info.width, height: original.info.height, bytes: encoded.length, sha256: sha256(encoded) };
      return original;
    }
    for (const key of inventory.sprites) {
      const url = await page.evaluate(key => {
        const img = window.nativeArtFixture.art[key];
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/png');
      }, key);
      const filename = 'sprite-' + key + '.webp';
      await save(filename, url);
      manifest.sprites[key] = filename;
    }
    for (const hero of heroes) {
      manifest.heroes[hero] = [];
      for (let palette = 0; palette < 3; palette++) {
        const result = await page.evaluate(({ hero, palette }) => {
          const c = document.createElement('canvas');
          c.width = 224 * 6; c.height = 192 * 5;
          const g = c.getContext('2d');
          const checks = [];
          for (let index = 0; index < 30; index++) {
            const frame = window.EmberHeroAnimation.frame(hero, index, palette);
            if (!frame || frame.width !== 224 || frame.height !== 192) throw new Error('Unexpected authored frame ' + hero + ':' + index);
            const x = index % 6 * 224, y = Math.floor(index / 6) * 192;
            g.drawImage(frame, x, y);
            const original = frame.getContext('2d').getImageData(0, 0, 224, 192).data;
            const atlas = g.getImageData(x, y, 224, 192).data;
            let visible = 0, bounds = [224, 192, -1, -1];
            for (let offset = 0; offset < original.length; offset += 4) {
              if (original[offset + 3]) {
                visible++;
                const fx = offset / 4 % 224, fy = Math.floor(offset / 4 / 224);
                bounds = [Math.min(bounds[0], fx), Math.min(bounds[1], fy), Math.max(bounds[2], fx), Math.max(bounds[3], fy)];
              }
              for (let channel = 0; channel < 4; channel++) {
                if (original[offset + channel] !== atlas[offset + channel]) throw new Error('Atlas altered cached frame');
              }
            }
            if (!visible) throw new Error('Empty frame');
            checks.push({ index, visiblePixels: visible, alphaBounds: bounds });
          }
          return { url: c.toDataURL('image/png'), checks };
        }, { hero, palette });
        const filename = 'hero-' + hero + '-' + palette + '.webp';
        await save(filename, result.url);
        manifest.heroes[hero].push(filename);
        metadata.frameChecks.push({ hero, palette, frames: result.checks });
      }
    }
    for (let zone = 0; zone < 3; zone++) {
      const url = await page.evaluate(zone => window.nativeArtFixture.zoneFloorTiles[zone].toDataURL('image/png'), zone);
      const filename = 'floor-' + zone + '.webp';
      await save(filename, url);
      manifest.floors.push(filename);
    }
    assert.equal(Object.keys(manifest.heroes).length, 7);
    assert.equal(metadata.frameChecks.reduce((total, set) => total + set.frames.length, 0), 630);
    assert.equal(Object.keys(manifest.sprites).length, inventory.sprites.length);
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    metadata.totals = { sprites: inventory.sprites.length, heroAtlases: 21, authoredFrames: 210, paletteFrames: 630, floors: 3, bytes: Object.values(metadata.assets).reduce((total, asset) => total + asset.bytes, 0) };
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(metadata, null, 2) + '\n');
    console.log(JSON.stringify(metadata.totals));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
(process.argv.includes('--compress') ? compressTextures() : bake().then(compressTextures))
  .catch(error => { console.error(error); process.exitCode = 1; });
