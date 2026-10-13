// Presentation-only API checks; exported for the real-browser living-crypt suite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function heroDirectionChecks(a) {
  for (const [x, y, name, flip] of [
    [0, 1, 'down', false], [1, 1, 'down-diagonal', false],
    [1, 0, 'side', false], [1, -1, 'up-diagonal', false],
    [0, -1, 'up', false], [-1, -1, 'up-diagonal', true],
    [-1, 0, 'side', true], [-1, 1, 'down-diagonal', true],
  ]) {
    const facing = a.directions({ x, y });
    assert.equal(facing.name, name, `direction ${x},${y}`);
    assert.equal(facing.flip, flip, `mirror ${x},${y}`);
    assert.equal(a.directions({ x: x * .03, y: y * .03 }).name, name,
      'direction must ignore movement magnitude');
  }
  assert.equal(a.directions({ x: 0, y: 0 }).name, 'down');
  for (const [x, y, row, flip] of [[0, 1, 0, false], [1, 0, 1, false],
    [0, -1, 2, false], [-1, 0, 1, true], [1, 1, 1, false]]) {
    const selected = a.choose({ kind: 'gravecaller', direction: { x, y },
      moving: true, phase: Math.PI / 3 * 2.1 });
    assert.equal(selected.row, row, 'legacy selector remains compatible');
    assert.equal(selected.col, 2);
    assert.equal(selected.flip, flip);
  }
}

function unit() {
  const images = [], draws = [];
  function context(canvas) {
    return { globalAlpha: 1, drawImage(img) { draws.push(img); },
      getImageData(x, y, width, height) {
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 3; i < data.length; i += 4) data[i] = 255;
        return { data };
      }, putImageData() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {} };
  }
  const window = {};
  const sandbox = { window, console, performance: { now: () => 1000 },
    document: { createElement() { const canvas = { width: 0, height: 0 };
      canvas.getContext = () => context(canvas); return canvas; } },
    Image: class { constructor() { images.push(this); }
      set src(value) { this.path = value; } get src() { return this.path; } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,
    '../assets/cinematic/hero-animation.js'), 'utf8'), sandbox);
  const a = window.EmberHeroAnimation;
  heroDirectionChecks(a);
  a.ensure();
  assert.equal(images.length, 7, 'legacy ensure loads base sheets only');
  const base = images.find(img => img.path.endsWith('gravecaller-animation.webp'));
  base.naturalWidth = 96; base.naturalHeight = 100; base.onload();
  a.ensure('gravecaller');
  assert.equal(images.length, 8, 'only the active hero extension is requested');
  const extension = images.at(-1);
  assert.equal(extension.path, 'assets/cinematic/living-crypt/heroes/gravecaller.webp');
  extension.onerror();
  assert.equal(extension.path, 'assets/cinematic/living-crypt/heroes/gravecaller.png');
  extension.naturalWidth = extension.naturalHeight = 1344; extension.onload();
  const actor = Object.freeze({ x: 0, y: 0 });
  const o = { actor, kind: 'gravecaller', height: 192, isometric: true,
    moving: true, direction: { x: 1, y: 1 }, phase: 2.1 * Math.PI / 3, clock: 1 };
  assert.equal(a.choose(o).index, 32, 'down diagonal uses authored extension');
  assert.ok(a.frame('gravecaller', 32), 'extended frames are decoded and addressable');
  for (const [x, y, first, flip] of [[0, 1, 0, false], [1, 1, 30, false],
    [1, 0, 6, false], [1, -1, 36, false], [0, -1, 12, false],
    [-1, -1, 36, true], [-1, 0, 6, true], [-1, 1, 30, true]]) {
    const selected = a.choose({ ...o, direction: { x, y } });
    assert.equal(selected.index, first + 2, `authored pose direction ${x},${y}`);
    assert.equal(selected.flip, flip);
  }
  assert.equal(a.choose({ ...o, moving: false, clock: .5 }).index, 61,
    'idle breathing uses the matching diagonal facing');
  assert.equal(a.choose({ ...o, isometric: false }).index, 8,
    'Classic view retains its legacy directional walk');
  assert.equal(a.choose({ ...o, moving: false, isometric: false, clock: .5 }).index, 49,
    'Classic idle uses the matching cardinal breathing row');
  const low = a.choose({ ...o, phase: 3.1 * Math.PI / 3, quality: { maxAtmosphere: 8 } });
  assert.equal(low.index, 32, 'Low quality samples half of the movement frames');
  for (const [quality, count] of [[{ maxAtmosphere: 32 }, 6], [{ maxAtmosphere: 8 }, 3]]) {
    const indices = Array.from({ length: 6 }, (_, col) => a.choose({ ...o,
      quality, phase: (col + .1) * Math.PI / 3 }).index);
    assert.equal(new Set(indices).size, count, 'quality sampling retains one full stride cycle');
  }
  assert.equal(new Set([0, .46, .91, 1.36].map(clock =>
    a.choose({ ...o, moving: false, clock }).index)).size, 4, 'four idle breathing poses');
  const ctx = context({});
  draws.length = 0; a.draw(ctx, o);
  assert.equal(draws.length, 1, 'first direction draws once');
  draws.length = 0; a.draw(ctx, { ...o, direction: { x: 1, y: -1 }, clock: 1.02 });
  assert.equal(draws.length, 2, 'turn crossfade uses two cached poses briefly');
  draws.length = 0; a.draw(ctx, { ...o, direction: { x: 1, y: -1 }, clock: 1.2 });
  assert.equal(draws.length, 1, 'turn crossfade ends without a persistent extra pass');
  a.frame('gravecaller', 32, 1);
  a.frame('gravecaller', 33, 2);
  a.frame('gravecaller', 32, 3);
  assert.ok(a.diagnostics().variantSets <= 2, 'mastery palettes remain bounded');
  assert.equal(a.diagnostics().extensionFrames, 32, 'blank atlas cells are not cached');
  a.ensure('ranger');
  const missing = images.at(-1);
  missing.onerror(); missing.onerror();
  const requestCount = images.length;
  a.ensure('ranger');
  assert.equal(images.length, requestCount, 'missing sheets do not fetch every draw');
  assert.equal(a.choose({ ...o, kind: 'ranger' }).index, 8,
    'both extension formats missing retain the old still/animation selection');
  assert.ok(!a.extensionReady('ranger'));
  assert.equal(JSON.stringify(actor), '{"x":0,"y":0}', 'cosmetic turns never mutate actors');
  for (const pose of [{ cast: .12 }, { hit: .55 }, { dead: true, deathProgress: .4 }]) {
    assert.equal(a.choose({ ...o, ...pose }).index,
      a.choose({ ...o, ...pose, isometric: undefined }).index,
      'combat pose indices retain the original API');
  }
  function finishExtension(kind) {
    a.ensure(kind);
    const image = images.at(-1);
    assert.equal(image.path, `assets/cinematic/living-crypt/heroes/${kind}.webp`);
    image.naturalWidth = image.naturalHeight = 1344;
    image.onload();
  }
  finishExtension('bloodknight');
  finishExtension('sunwarden');
  assert.equal(a.diagnostics().extensions.length, 2, 'retain only two decoded hero extensions');
  assert.equal(a.diagnostics().extensionFrames, 64, 'decoded extension frame budget is bounded');
  assert.ok(!a.extensionReady('gravecaller'), 'oldest unused hero extension is evicted');
  assert.ok(a.extensionReady('bloodknight') && a.extensionReady('sunwarden'));
  assert.equal(a.diagnostics().variantSets, 0, 'eviction releases that hero\'s colored frame references');
  assert.equal(a.diagnostics().frames, 30, 'legacy base cache survives extension eviction');
  assert.ok(a.ready('gravecaller'));
  assert.ok(!a.diagnostics().extensionFailed.includes('gravecaller'),
    'ordinary eviction never marks the sheet as unavailable');
  finishExtension('gravecaller');
  assert.ok(a.extensionReady('gravecaller'), 'evicted extension can load again');
  assert.ok(!a.extensionReady('bloodknight'));
  a.ensure('sunwarden');
  finishExtension('ember');
  assert.ok(a.extensionReady('sunwarden'), 'ensure refreshes recency without another request');
  assert.ok(!a.extensionReady('gravecaller'), 'least recently used sheet is evicted');
  assert.equal(a.diagnostics().extensionFrames, 64);
  assert.equal(a.diagnostics().frames, 30);
  a.frame('sunwarden', 30);
  finishExtension('bloodknight');
  assert.ok(a.extensionReady('sunwarden'), 'drawing a cached frame refreshes recency');
  assert.ok(!a.extensionReady('ember'));
  return { directions: 8, extensionFrames: a.diagnostics().extensionFrames,
    extensionLimit: a.diagnostics().extensionLimit,
    fallback: true, turnBlend: true, reloadable: true };
}

module.exports = { heroDirectionChecks, unit };
if (require.main === module) console.log('PASS', unit());
