// v69 presentation verification. Music is separately stubbed in simulation; its
// actual Web Audio module is exercised directly with real Chromium below.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright"),
  root = path.resolve(__dirname, "..");
const raw = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(Number(/GAME_VERSION = "v(\d+) · /.exec(raw)?.[1]) >= 69, "Version label older than v69 SOUND & MOTION");
assert(raw.includes("function sfx(kind) {"));
assert(raw.includes("function music(kind) {"));
const source = raw
  .replace("function music(kind) {", "function music(kind) { return;")
  .replace("function sfx(kind) {", "function sfx(kind) { return;")
  .replaceAll("requestAnimationFrame(frame);", "");
const hooks = `window.gameTest={selectSlot,begin,draw,update,applyProfile,floorEntry,renderSettings,renderMenu,damageEnemy,spawnBoss,spawnEnemy,wallAt,saveRun,readRun,makeSaveCode,loadSaveCode,fx,visualScene,ensureAudio,pauseRun,resumePaused,
 get hero(){return hero},get enemies(){return enemies},set enemies(v){enemies=v},get dungeon(){return dungeon},get art(){return art},get profile(){return profile},get mode(){return mode},set mode(v){mode=v},get quality(){return visualQuality},get sites(){return sites},get level(){return level},set level(v){level=v},get wave(){return wave},set wave(v){wave=v},set spawn(v){spawn=v},set selectedHero(v){selectedHero=v},set selectedMode(v){selectedMode=v}};`;
const server = http.createServer((req, res) => {
  const name = new URL(req.url, "http://localhost").pathname;
  if (name === "/") {
    res.setHeader("Content-Type", "text/html");
    return res.end(source.replace("      })();", hooks + "\n      })();"));
  }
  if (name === "/score") {
    res.setHeader("Content-Type", "text/html");
    return res.end(
      '<button id="unlock">UNLOCK MUSIC</button><script src="/assets/audio/music.js"></script><script>unlock.onclick=()=>{window.ctx=new AudioContext();EmberMusic.unlock(ctx);};</script>',
    );
  }
  const file = path.resolve(root, "." + name);
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Type",
    path.extname(file) === ".js"
      ? "application/javascript"
      : "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
const report = {
  scenes: [],
  music: null,
  motion: null,
  settings: null,
  errors: [],
};
// Prove procedural loops do not consume combat RNG and do not allocate with enemy count.
function musicMock() {
  const math = Object.create(Math);
  math.random = () => {
    throw Error("Music touched gameplay RNG");
  };
  const document = { hidden: false },
    window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets/audio/music.js"), "utf8"),
    { window, document, Math: math },
  );
  let nodes = 0;
  const param = () => ({
    value: 0,
    cancelScheduledValues() {},
    setValueAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime(v) {
      this.value = v;
    },
  });
  const ctx = {
    state: "running",
    currentTime: 1,
    destination: {},
    buffers: [],
    createBuffer(ch, n, rate) {
      const a = new Float32Array(n),
        b = {
          getChannelData() {
            return a;
          },
          length: n,
          sampleRate: rate,
        };
      this.buffers.push(b);
      return b;
    },
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} };
    },
    createDynamicsCompressor() {
      return { threshold: param(), ratio: param(), connect() {} };
    },
    createBufferSource() {
      nodes++;
      return {
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
        onended: null,
      };
    },
  };
  const a = window.EmberMusic;
  a.update(ctx, { scene: "menu" });
  assert.equal(a.stats(ctx).loops, 0);
  a.unlock(ctx);
  assert.equal(a.stats(ctx).loops, 1);
  a.update(ctx, { scene: "play", zone: 0, near: 12 });
  const before = nodes;
  for (let i = 0; i < 500; i++) a.update(ctx, { near: i });
  assert.equal(nodes, before, "Intensity allocated sources per enemy");
  for (let i = 0; i < 40; i++) {
    a.update(ctx, { zone: i % 3 });
    assert(a.stats(ctx).loops <= 6, "Crossfade grew without a bound");
  }
  assert(ctx.buffers.length <= 6, "Repeated zones rebuilt buffers");
  a.update(ctx, { scene: "pause" });
  assert.equal(a.sting(ctx, "Victory"), false);
  document.hidden = true;
  a.update(ctx, { lock: true });
  document.hidden = false;
  a.update(ctx, { scene: "play" });
  assert.equal(a.stats(ctx).unlocked, false);
  a.unlock(ctx);
  assert(a.stats(ctx).unlocked);
  for (const b of ctx.buffers) {
    const data = b.getChannelData(0);
    assert(Math.abs(data[0]) < 1e-6);
    assert(Math.abs(data.at(-1)) < 0.001);
    assert(
      data.some((x) => Math.abs(x) > 0.01),
      "Silent score",
    );
  }
  console.log(
    "PASS music: deterministic synthesis, lazy cached loops, bounded crossfades, no enemy-count allocation, gesture gate and paused stings",
  );
}
(async () => {
  musicMock();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const b = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const url = "http://127.0.0.1:" + server.address().port;
  try {
    const p = await b.newPage({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem(
        "ember-crypt-character-slots-v1",
        JSON.stringify([
          { name: "Sound Motion", lastPlayed: 1, playTime: 60 },
          null,
          null,
        ]),
      );
      localStorage.setItem("ember-crypt-active-slot-v1", "0");
      localStorage.setItem("ember-crypt-muted", "1");
    });
    await p.goto(url);
    await p.waitForFunction(
      () =>
        EmberHeroAnimation.diagnostics().frames === 210 &&
        gameTest.art["prop-frost-brazier"] &&
        gameTest.art["prop-venom-coffin"],
    );
    await p.evaluate(() => {
      gameTest.selectSlot(0);
      gameTest.applyProfile({
        ranger: true,
        ember: true,
        bloodknight: true,
        sunwarden: true,
      });
    });
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await p.setViewportSize(size);
      for (const hero of [
        "gravecaller",
        "bloodknight",
        "ranger",
        "sunwarden",
        "ember",
      ])
        for (let floor = 1; floor <= 5; floor++) {
          const r = await p.evaluate(
            ({ hero, floor }) => {
              const g = gameTest;
              g.selectedMode = "descent";
              g.selectedHero = hero;
              g.begin();
              g.floorEntry(floor);
              g.dungeon.title = 0;
              g.spawn = 999;
              g.enemies = [];
              const cells = [...g.dungeon.cells],
                s = g.visualScene(),
                data = EmberZones.layout(s);
              for (const key of data.voids) {
                if (g.dungeon.cells.has(key))
                  throw Error("Scenery erased walkable cell");
                const [x, y] = key.split(",").map(Number);
                if (x === 24) throw Error("Scenery erased boss door");
                if (!g.wallAt(x * 80 + 40, y * 80 + 40, 2))
                  throw Error("Void became walkable");
              }
              const before = JSON.stringify(g.hero);
              g.draw();
              if (
                JSON.stringify(g.hero) !== before ||
                JSON.stringify([...g.dungeon.cells]) !== JSON.stringify(cells)
              )
                throw Error("Draw changed physics");
              const lo = EmberZones.limits({
                  ...s,
                  quality: { maxAtmosphere: 8 },
                }),
                hi = EmberZones.limits(s);
              if (!(lo.props < hi.props && lo.voids < hi.voids))
                throw Error("Props ignore quality tier");
              if (floor !== 1 && EmberZones.diagnostics().zone !== s.zone)
                throw Error("Wrong zone");
              if (!EmberHeroAnimation.diagnostics().lastDraw[hero])
                throw Error("Hero uses legacy instead of authored frames");
              return {
                hero,
                floor,
                zone: s.zone,
                voids: data.voids.size,
                props: EmberZones.diagnostics().props,
              };
            },
            { hero, floor },
          );
          report.scenes.push({ ...r, width: size.width, height: size.height });
          if (
            (size.width === 390 && hero === "ranger" && floor === 2) ||
            (size.width === 844 && hero === "ember" && floor === 3) ||
            (size.width === 390 && hero === "sunwarden" && floor === 5)
          ) {
            fs.mkdirSync(path.join(root, "tests/screenshots"), {
              recursive: true,
            });
            await p.screenshot({
              path: path.join(
                root,
                "tests/screenshots",
                "sound-motion-" + hero + "-" + floor + ".png",
              ),
              scale: "css",
            });
          }
        }
    }
    await p.evaluate(() => {
      const g = gameTest;
      g.selectedMode = "endless";
      g.selectedHero = "ranger";
      g.begin();
      g.enemies = [];
    });
    for (const wave of [1, 6, 11, 16, 21])
      await p.evaluate((wave) => {
        const g = gameTest;
        g.wave = wave;
        g.draw();
        if (EmberZones.diagnostics().zone !== Math.floor((wave - 1) / 5) % 3)
          throw Error("Endless zone did not change");
      }, wave);
    report.motion = await p.evaluate(() => {
      const g = gameTest;
      g.selectedMode = "descent";
      g.begin();
      g.draw();
      const e = {
        x: g.hero.x + 30,
        y: g.hero.y,
        type: "skeleton",
        r: 15,
        hp: 1,
        max: 1,
        faceX: 0,
        faceY: 1,
      };
      g.enemies = [e];
      const before = { hp: g.hero.hp, time: g.hero.inv };
      g.damageEnemy(e, 100, "neutral");
      if (g.enemies.includes(e)) throw Error("Death was delayed");
      g.draw();
      if (EmberMotion.stats().queued < 1) throw Error("Death dissolve missing");
      const img = g.art.skeleton,
        a = EmberMotion.tint(img, "#a7ddeb"),
        b = EmberMotion.tint(img, "#a7ddeb");
      if (a !== b) throw Error("Tint is not cached");
      g.level++;
      g.draw();
      g.spawnBoss("warden");
      g.draw();
      if (!EmberMotion.stats().intro) throw Error("Boss card missing");
      for (const kind of ["chest", "well", "forge", "door", "stairs"])
        g.fx(kind, { x: g.hero.x, y: g.hero.y });
      g.draw();
      const stats = EmberMotion.stats();
      if (stats.particles > g.quality.maxAtmosphere * 2)
        throw Error("Particles exceeded cap");
      g.hero.hp = 0;
      g.mode = "over";
      g.draw();
      if (g.mode !== "over") throw Error("Death animation delayed game over");
      return {
        cachedTint: true,
        immediateDeath: true,
        bossCard: true,
        effectCap: stats,
      };
    });
    report.settings = await p.evaluate(() => {
      const g = gameTest;
      g.renderSettings();
      let btn = [...document.querySelectorAll("#menuPage button")].find((b) =>
        b.textContent.startsWith("MUSIC ·"),
      );
      if (!btn) throw Error("Music setting missing");
      btn.click();
      if (localStorage.getItem("ember-crypt-music-muted") !== "1")
        throw Error("Music preference not stored");
      if (localStorage.getItem("ember-crypt-muted") !== "1")
        throw Error("Music changed legacy mute");
      [...document.querySelectorAll("#menuPage button")]
        .find((b) => b.textContent.startsWith("SCREEN SHAKE ·"))
        .click();
      if (localStorage.getItem("ember-crypt-screen-shake") !== "0")
        throw Error("Shake setting not stored");
      g.saveRun(true);
      const run = g.readRun(),
        code = g.loadSaveCode(g.makeSaveCode());
      if (run.version < 11 || code.profile.version !== 2) // v72 moves runs to v12 with its own migration
        throw Error("Save formats changed");
      if (
        /EmberMusic|EmberMotion|musicEnabled|shakeEnabled|cosmetic/.test(
          JSON.stringify(run),
        )
      )
        throw Error("Presentation state leaked into save");
      if (document.querySelectorAll(".skills button").length !== 2)
        throw Error("Extra buttons");
      return {
        musicIndependent: true,
        shakeStored: true,
        profile: 2,
        run: 11,
        code: "EC1",
        controls: 2,
      };
    });
    const art = [
      "ranger-animation",
      "sunwarden-animation",
      "ember-animation",
      "frost-props",
      "venom-props",
    ];
    let bytes = 0;
    for (const name of art)
      bytes += fs.statSync(
        path.join(root, "assets/cinematic", name + ".webp"),
      ).size;
    assert(bytes <= 3000000);
    report.webpBytes = bytes;
    const score = await b.newPage();
    score.on("pageerror", (e) => report.errors.push(e.message));
    await score.goto(url + "/score");
    await score.click("#unlock");
    report.music = await score.evaluate(async () => {
      const a = EmberMusic;
      // Audio automation uses the audio clock, which can lag wall time on a busy browser worker.
      const waitForFade = async () => {
        const target = ctx.currentTime + .3, deadline = performance.now() + 10000;
        while (ctx.currentTime < target && performance.now() < deadline)
          await new Promise(r => setTimeout(r, 25));
        if (ctx.currentTime < target) throw Error("Audio clock stalled during fade");
      };
      const menu = a.stats(ctx);
      if (menu.loops !== 1) throw Error("Menu theme missing");
      for (const zone of [0, 1, 2])
        a.update(ctx, { scene: "play", zone, near: 14, boss: false });
      a.update(ctx, { boss: true });
      for (const kind of ["Level", "Clear", "Victory"])
        if (!a.sting(ctx, kind)) throw Error("Sting missing");
      if (a.sting(ctx, "Death")) throw Error("Sting cap ignored");
      const deadline = performance.now() + 10000;
      while (a.stats(ctx).stings && performance.now() < deadline)
        await new Promise((r) => setTimeout(r, 50));
      if (a.stats(ctx).stings !== 0) throw Error("Sting nodes leaked");
      if (!a.sting(ctx, "Death")) throw Error("Death sting missing");
      a.update(ctx, { scene: "pause" });
      await waitForFade();
      if (a.stats(ctx).musicLevel > 0.001)
        throw Error("Pause did not fade output");
      if (a.sting(ctx, "Level")) throw Error("Pause still admits music");
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      a.update(ctx, { lock: true });
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
      a.update(ctx, { scene: "play" });
      if (a.stats(ctx).unlocked) throw Error("Resumed without gesture");
      a.unlock(ctx);
      a.update(ctx, { enabled: false });
      await waitForFade();
      if (a.stats(ctx).musicLevel > 0.001)
        throw Error("Music toggle did not fade output");
      const result = a.stats(ctx);
      await ctx.close();
      return { menu, afterPauseResume: result };
    });
    assert.equal(report.errors.length, 0, report.errors.join("\n"));
    const dir = process.env.ARTIFACT_DIR || path.join(root, "tests");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "sound-motion-results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      "PASS v69: 50 hero/floor/orientation scenes, all Endless zone transitions, solid voids/door safety, effect caps, cached tint, motion, independent settings and v2/v11/EC1 saves",
    );
    console.log(
      "PASS actual Web Audio: menu/three zones/combat/boss, four stings, natural cleanup, pause/hidden/gesture resume, music mute",
    );
  } finally {
    await b.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
