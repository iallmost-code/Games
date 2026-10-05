// Audio-only validation: file integrity, admission/lifecycle, then actual Web Audio decoding.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const audio = path.join(root, 'assets/audio');
const source = fs.readFileSync(path.join(audio, 'combat-audio.js'), 'utf8');
new Function(source);
const files = fs.readdirSync(audio).filter(name => name.endsWith('.wav'));
let totalBytes = 0;
for (const name of files) {
  const bytes = fs.readFileSync(path.join(audio, name));
  totalBytes += bytes.length;
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt16LE(20), 1, 'PCM');
  assert.equal(bytes.readUInt16LE(22), 1, 'Mono');
  assert.equal(bytes.readUInt32LE(24), 24000);
  assert.equal(bytes.readUInt16LE(34), 16);
  assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
  assert.equal(bytes.readInt16LE(44), 0, name + ' has initial click');
  assert.equal(bytes.readInt16LE(bytes.length - 2), 0, name + ' has final click');
  const length = (bytes.length - 44) / 48000;
  assert(length > .2 && length < 1, name + ' unexpectedly long');
  let square = 0, peak = 0;
  for (let i = 44; i < bytes.length; i += 2) {
    const value = bytes.readInt16LE(i) / 32768;
    square += value * value; peak = Math.max(peak, Math.abs(value));
  }
  assert(peak < .8 && peak > .3, name + ' peak/headroom');
  assert(Math.sqrt(square / ((bytes.length - 44) / 2)) > .015, name + ' silent');
}
assert.equal(files.length, 15);
assert(totalBytes < 320000, 'Audio download budget exceeded');

function context() {
  function node() { return { connect() {}, disconnect() { this.disconnected = true; } }; }
  return {
    state: 'running', currentTime: 0, destination: {}, sources: [], gains: [], decodes: 0,
    resume() { throw Error('Module must not own autoplay unlocking'); },
    createGain() { const gain = Object.assign(node(), { gain: { value: 0 } }); this.gains.push(gain); return gain; },
    createDynamicsCompressor() { return Object.assign(node(), { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }); },
    createBufferSource() {
      const sample = Object.assign(node(), { playbackRate: {}, start(time) { this.started = time; },
        stop() { this.stopped = true; }, end() { if (this.onended) this.onended(); } });
      this.sources.push(sample); return sample;
    },
    decodeAudioData(bytes, ok) {
      this.decodes++;
      const result = { duration: (bytes.byteLength - 44) / 48000 };
      return Promise.resolve().then(() => { ok(result); return result; });
    }
  };
}
function moduleWith(fetch) {
  const fakeMath = Object.create(Math);
  fakeMath.random = () => { throw Error('Presentation audio consumed gameplay RNG'); };
  const sandbox = { URL, Map, Set, WeakMap, Promise, Math: fakeMath,
    document: { currentScript: { src: 'http://localhost/assets/audio/combat-audio.js' }, baseURI: 'http://localhost/' }, fetch };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  return sandbox.EmberAudio;
}

async function mockChecks() {
  let downloads = 0;
  const api = moduleWith(async url => {
    downloads++;
    assert.equal(new URL(url).searchParams.get('v'), '68', 'Versioned URLs bypass stale CDN failures');
    const bytes = fs.readFileSync(path.join(audio, new URL(url).pathname.split('/').pop()));
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  });
  const ctx = context();
  assert.equal(api.play('cast', ctx, 'gravecaller'), false, 'Must fall back during loading');
  assert.equal(await api.ensure(ctx), true);
  assert.equal(await api.ensure(ctx), true);
  assert.equal(downloads, 15, 'Downloads cached'); assert.equal(ctx.decodes, 15, 'Decodes cached');
  assert.equal(api.play('unknown', ctx), false);
  assert.equal(api.play('cast', ctx, 'gravecaller'), true);
  assert.equal(api.play('cast', ctx, 'gravecaller'), false, 'Rate limit');
  assert.equal(api.ready('cast', ctx, 'gravecaller'), true, 'Ready lets caller swallow throttled cues');
  ctx.state = 'suspended'; assert.equal(api.play('hurt', ctx), false);
  ctx.state = 'closed'; assert.equal(api.play('hurt', ctx), false);
  ctx.state = 'running'; api.stop(ctx);
  assert.equal(api.stats(ctx).active, 0);
  assert(ctx.sources.every(sample => sample.disconnected && sample.stopped), 'Mute releases sources');
  for (let i = 0; i < 20; i++) { ctx.currentTime += .2; api.play('hit', ctx); }
  assert.equal(api.stats(ctx).active, 12, 'Dense combat cap');
  const before = api.stats(ctx).scheduled;
  assert.equal(api.play('hurt', ctx), true, 'Hero damage cue displaces regular attacks');
  assert(api.stats(ctx).scheduled > before);
  assert(api.stats(ctx).active <= 12);
  for (const sample of ctx.sources) sample.end();
  assert.equal(api.stats(ctx).active, 0, 'Natural end releases nodes');
  assert(ctx.sources.every(sample => sample.disconnected));
  for (const hero of ['gravecaller', 'ranger', 'ember', 'bloodknight', 'sunwarden']) {
    ctx.currentTime += 1; assert(api.play('shoot', ctx, hero)); api.stop(ctx);
  }
  const second = context(); await api.ensure(second);
  assert.equal(downloads, 15, 'Raw files cached across contexts'); assert.equal(second.decodes, 15);
  const failed = moduleWith(async () => { throw Error('Offline'); });
  const offline = context(); assert.equal(await failed.ensure(offline), false);
  assert.equal(failed.play('hurt', offline), false, 'Legacy fallback survives load failure');
  assert.equal(failed.ready('hurt', offline), false);
  assert.equal(await failed.ensure(null), false);
  console.log('PASS: original WAV integrity/302 KB budget, cached loading, fallback, no RNG/unlock, voice cap, priority, mute and natural cleanup');
}

async function browserChecks() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      return res.end('<button id="start">START AUDIO</button><script src="/assets/audio/combat-audio.js"></script><script>start.onclick=()=>{window.ctx=new AudioContext();window.loaded=EmberAudio.ensure(ctx);};</script>');
    }
    const name = path.resolve(root, '.' + req.url.split('?')[0]);
    if (!name.startsWith(audio + path.sep) || !fs.existsSync(name)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', name.endsWith('.wav') ? 'audio/wav' : 'application/javascript');
    res.end(fs.readFileSync(name));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.click('#start');
    assert.equal(await page.evaluate(() => loaded), true);
    assert.equal(await page.evaluate(() => EmberAudio.stats(ctx).decoded), 15);
    const kinds = ['start', 'cast', 'shoot', 'swing', 'hit', 'crit', 'hurt', 'block', 'dash',
      'ultimate', 'blast', 'death', 'pickup', 'loot', 'upgrade', 'door', 'warning', 'boss', 'bossDown'];
    const scheduled = await page.evaluate(kinds => kinds.map(kind => {
      EmberAudio.stop(ctx);
      const result = EmberAudio.play(kind, ctx, 'gravecaller');
      return { kind, result, active: EmberAudio.stats(ctx).active };
    }), kinds);
    assert(scheduled.every(item => item.result && item.active > 0 && item.active <= 2), 'Real sources failed');
    await page.evaluate(() => { EmberAudio.stop(ctx); EmberAudio.play('ultimate', ctx); });
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => EmberAudio.stats(ctx).active), 0, 'Real source cleanup');
    await page.evaluate(async () => { EmberAudio.play('hurt', ctx); EmberAudio.stop(ctx); await ctx.suspend(); });
    assert.equal(await page.evaluate(() => EmberAudio.play('hurt', ctx)), false);
    assert.equal(await page.evaluate(() => EmberAudio.stats(ctx).active), 0);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: actual Chromium gesture/context, all 15 WAV decodes, 19 event schedules, natural cleanup and suspended fallback');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}

(async () => { await mockChecks(); await browserChecks(); })().catch(error => { console.error(error); process.exitCode = 1; });
