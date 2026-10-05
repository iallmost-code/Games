// Pure generation/property checks plus real Chromium integration; no external services.
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  http = require("node:http");
const { chromium } = require("playwright"),
  root = path.resolve(__dirname, ".."),
  sandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets/endgame/endless-nights.js"), "utf8"),
  sandbox,
);
const E = sandbox.window.EmberEndgame;
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
const floorJSON = source.match(
  /const descentFloors = (\[[\s\S]*?\n        \]);/,
)[1];
const floors = vm.runInNewContext(floorJSON);
function cells(spec) {
  const set = new Set();
  for (const [x, y, w, h] of [...spec.rooms, ...spec.links])
    for (let i = x; i < x + w; i++)
      for (let j = y; j < y + h; j++) set.add(i + "," + j);
  return set;
}
function reachable(set, locked = false) {
  const seen = new Set(["5,10"]),
    q = ["5,10"];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i].split(",").map(Number);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        yy = y + dy,
        key = xx + "," + yy;
      if (locked && xx === 24 && (yy === 9 || yy === 10)) continue;
      if (set.has(key) && !seen.has(key)) {
        seen.add(key);
        q.push(key);
      }
    }
  }
  return seen;
}
assert.equal(
  E.profile({
    records: { descent: { bestDepth: { gravecaller: 0, ranger: 0 } } },
  }).descentCleared,
  false,
  "Empty historical records unlock Torment",
);
assert.equal(
  E.profile({ records: { descent: { bestDepth: { gravecaller: 1 } } } })
    .descentCleared,
  true,
  "Prior recorded clear lost",
);
const shapes = new Set();
for (let seed = 0; seed < 1000; seed++)
  for (let floor = 1; floor <= floors.length; floor++) {
    const spec = E.layout(floors[floor - 1], seed, floor),
      set = cells(spec),
      open = reachable(set),
      closed = reachable(set, true);
    assert.equal(open.size, set.size, `Disconnected ${seed}/${floor}`);
    assert(open.has("28,10"), "Boss/stairs unreachable");
    assert(!closed.has("28,10"), "Boss lock bypass");
    assert.deepEqual(
      E.layout(floors[floor - 1], seed, floor),
      spec,
      "Seed not reproducible",
    );
    shapes.add(JSON.stringify(spec.rooms));
    const secret = E.secret(seed, floor);
    if (secret) {
      const joined = new Set(set);
      for (const r of [secret.room, secret.neck])
        for (let i = r[0]; i < r[0] + r[2]; i++)
          for (let j = r[1]; j < r[1] + r[3]; j++) joined.add(i + "," + j);
      assert.equal(reachable(joined).size, joined.size, "Secret disconnected");
      assert(!reachable(joined, true).has("28,10"), "Secret bypasses lock");
    }
  }
assert(shapes.size > 300, "Layouts do not vary");
for (let t = 1; t <= 10; t++) {
  const previous = E.factors({ torment: t - 1 }),
    f = E.factors({ torment: t });
  for (const k of ["hp", "damage", "density", "reward", "elite", "relic"])
    assert(f[k] > previous[k]);
}
assert.equal(E.daily("2026-10-05").date, "2026-10-05");
assert.deepEqual(E.daily("2026-10-05"), E.daily("2026-10-05"));
assert.notEqual(E.daily("2026-10-05").seed, E.daily("2026-10-06").seed);
assert.equal(E.date(Date.UTC(2026, 9, 5, 23, 59, 59)), "2026-10-05");
assert.equal(E.date(Date.UTC(2026, 9, 6, 0, 0, 0)), "2026-10-06");
console.log(
  "PASS 5,000 connected seeded floors, boss lock/stairs/secret reachability, variation, UTC daily and monotonic Torment ladder",
);
const hooks = `window.nightTest={begin,applyProfile,saveProfile,selectSlot,renderMenu,renderHeroScreen,saveRun,readRun,restoreRun,makeSaveCode,loadSaveCode,floorEntry,buildFloor,floorSpec,wallAt,segmentBlocked,moveAroundWalls,update,draw,updateDungeon,updateEndgame,enhanceEndgameEnemy,endgameDamage,endgameEnemyKilled,collectEndgameDrop,takeHit,gameOver,showVictory,recordEndgameResult,gameRandom,spawnEnemy,spawnBoss,damageEnemy,setQualityTier,
get hero(){return hero},get profile(){return profile},get run(){return endgameRun},set run(v){endgameRun=v},get dungeon(){return dungeon},get checkpoint(){return floorCheckpoint},get enemies(){return enemies},set enemies(v){enemies=v},get drops(){return drops},set drops(v){drops=v},get joy(){return joy},get mode(){return mode},set mode(v){mode=v},get kills(){return kills},set kills(v){kills=v},get clock(){return clock},set clock(v){clock=v},get runStats(){return runStats},get selectedHero(){return selectedHero},set selectedHero(v){selectedHero=v},set selectedMode(v){selectedMode=v},get selectedMode(){return selectedMode},set pendingDaily(v){pendingDaily=v},get slots(){return slots},get currentRunVersion(){return currentRunVersion},get spawn(){return spawn},set spawn(v){spawn=v},awardEmbers,get event(){return dungeonEvent},set event(v){dungeonEvent=v}};`;
const injected = source
  .replace("function sfx(kind) {", "function sfx(kind) { return;")
  .replace("function music(kind) {", "function music(kind) { return;")
  .replaceAll("requestAnimationFrame(frame);", "")
  .replace("      })();", hooks + "\n      })();");
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split("?")[0]);
  if (name === "/") {
    res.setHeader("Content-Type", "text/html");
    return res.end(injected);
  }
  if (name === "/live") {
    res.setHeader("Content-Type", "text/html");
    return res.end(source);
  }
  const file = path.join(root, name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Type",
    file.endsWith(".js")
      ? "application/javascript"
      : file.endsWith(".webp")
        ? "image/webp"
        : file.endsWith(".png")
          ? "image/png"
          : "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const b = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await b.newPage({ viewport: { width: 390, height: 844 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const url = "http://127.0.0.1:" + server.address().port;
    await page.goto(url);
    await page
      .getByRole("button", { name: "TAP TO START" })
      .click({ force: true });
    await page
      .getByRole("button", { name: "SLOT 1 · + NEW CHARACTER", exact: true })
      .click();
    await page.locator("input").fill("Nightwalker");
    await page
      .getByRole("button", { name: "CREATE & PLAY", exact: true })
      .click();
    await page.waitForFunction(() => window.nightTest?.hero);
    const report = {
      generatedFloors: 5000,
      uniqueLayouts: shapes.size,
      mechanics: [],
      renders: [],
      errors,
    };
    report.mechanics = await page.evaluate(() => {
      const g = nightTest,
        E = EmberEndgame,
        check = (v, m) => {
          if (!v) throw Error(m);
        },
        rows = [];
      g.applyProfile({
        embers: 157,
        total: 888,
        upgrades: { power: 2 },
        bosses: 3,
      });
      check(
        !g.profile.descentCleared &&
          !g.profile.randomLayouts &&
          g.profile.runHistory.length === 0 &&
          g.profile.selectedTorment === 0,
        "Old defaults",
      );
      g.begin();
      check(
        g.run.torment === 0 && !g.run.random && g.run.gold === 0,
        "Fresh run",
      );
      const original = Array.from(g.dungeon.cells).sort().join("|");
      g.saveRun(true);
      check(g.readRun().version === 12, "Run version");
      const v11 = g.readRun();
      v11.version = v11.balanceVersion = 11;
      delete v11.endgameRun;
      delete v11.floorCheckpoint.endgameRun;
      localStorage.removeItem("ember-crypt-slot-1-run-v12");
      localStorage.setItem("ember-crypt-slot-1-run-v11", JSON.stringify(v11));
      g.restoreRun();
      check(
        g.run.torment === 0 &&
          !g.run.random &&
          g.run.gold === 0 &&
          Array.from(g.dungeon.cells).sort().join("|") === original,
        "v11 migration changes floor",
      );
      check(
        !localStorage.getItem("ember-crypt-slot-1-run-v11") &&
          g.profile.embers === 157 &&
          g.profile.upgrades.power === 2,
        "Migration lost progress",
      );
      rows.push("v11-to-v12 preserves Classic checkpoint, embers and shrine");
      const mkcode = (data) => {
        const json = JSON.stringify(data);
        let h = 2166136261;
        for (let i = 0; i < json.length; i++) {
          h ^= json.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return (
          "EC1." +
          (h >>> 0).toString(36) +
          "." +
          btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
        );
      };
      const payload = g.loadSaveCode(g.makeSaveCode());
      payload.run = v11;
      check(
        g.loadSaveCode(mkcode(payload)).run.version === 12,
        "v11 EC1 migration",
      );
      g.hero.victoryPaid = true;
      g.floorEntry(5);
      g.recordEndgameResult(true);
      check(
        g.profile.descentCleared && g.profile.randomLayouts,
        "First clear defaults",
      );
      g.profile.selectedTorment = 10;
      g.selectedMode = "descent";
      g.begin();
      check(g.run.torment === 10 && g.run.random, "Torment selection");
      const baseline = {
        x: 400,
        y: 800,
        type: "ghoul",
        hp: 40,
        max: 40,
        speed: 50,
        r: 15,
      };
      g.enemies = [baseline];
      g.enhanceEndgameEnemy(baseline, false);
      check(baseline.hp === 180, "Torment HP");
      g.hero.inv = 0;
      g.hero.armor = 0;
      const hp = g.hero.hp;
      g.takeHit(10);
      check(Math.abs(hp - g.hero.hp - 17.6) < 1e-6, "Torment damage");
      const pre = g.profile.embers;
      g.awardEmbers(10);
      check(g.profile.embers - pre === 30, "Torment ember reward");
      g.damageEnemy(baseline, 1e9);
      check(
        g.drops.some((o) => o.type === "nightGold"),
        "Gold drop",
      );
      const coin = g.drops.find((o) => o.type === "nightGold");
      g.collectEndgameDrop(coin);
      check(g.run.gold === 2, "Gold collection");
      rows.push("Torment 10 enemy HP/damage; run-gold drop/collection");
      const grid = Array.from(g.dungeon.cells).sort().join("|"),
        seed = g.run.seed;
      g.hero.x = 1000;
      g.run.gold = 91;
      g.saveRun(true);
      const saved = g.readRun();
      check(
        saved.endgameRun.seed === seed && saved.endgameRun.gold === 91,
        "Seed/gold serialized",
      );
      g.restoreRun();
      check(
        g.run.seed === seed &&
          g.run.gold === 0 &&
          Array.from(g.dungeon.cells).sort().join("|") === grid,
        "Resume same floor checkpoint",
      );
      rows.push(
        "Seeded floor resumes exact geometry, floor-start gold rollback",
      );
      g.floorEntry(3);
      g.enemies = [];
      g.run.gold = 120;
      g.hero.moving = 0;
      const shop = g.dungeon.shop;
      check(shop && shop.pads.length === 3, "Merchant missing");
      let pad = shop.pads[0];
      g.hero.hp = g.hero.maxHp * 0.2;
      g.hero.x = pad.x;
      g.hero.y = pad.y;
      g.updateEndgame(1.26);
      check(
        pad.used && g.run.gold === 102 && g.hero.hp > g.hero.maxHp * 0.6,
        "Heal purchase",
      );
      g.updateEndgame(5);
      check(g.run.gold === 102, "Charged twice");
      pad = shop.pads[1];
      g.hero.x = pad.x;
      g.hero.y = pad.y;
      const rerolls = g.hero.rerolls;
      g.updateEndgame(1.26);
      check(
        pad.used && g.run.gold === 78 && g.hero.rerolls === rerolls + 1,
        "Reroll purchase",
      );
      g.event = { kind: "chest", phase: "waiting", x: 1000, y: 800 };
      pad = shop.pads[2];
      g.hero.x = pad.x;
      g.hero.y = pad.y;
      g.updateEndgame(1.26);
      check(
        g.mode === "relic" && g.run.gold === 18 && pad.used,
        "Relic purchase",
      );
      document.querySelector("#choices button").click();
      check(
        g.mode === "play" && g.event?.phase === "waiting",
        "Relic menu did not resume/preserve encounter",
      );
      g.event = null;
      rows.push(
        "All three standing merchant purchases and duplicate protection",
      );
      g.run.gold = 0;
      pad.used = false;
      g.mode = "play";
      g.updateEndgame(3);
      check(!pad.used, "Insufficient gold purchase");
      for (let seed = 0; seed < 100 && !g.dungeon.secret; seed++) {
        g.run.seed = seed;
        g.floorEntry(3);
      }
      const secret = g.dungeon.secret;
      check(secret && !secret.revealed, "Secret setup");
      g.hero.x = secret.mouth.x + 30;
      g.hero.y = secret.mouth.y;
      g.hero.moving = 1;
      g.hero.faceX = -1;
      g.joy.dx=-1;g.joy.dy=0;
      check(g.wallAt(80, 800, 10), "Hidden room passable");
      g.updateEndgame(0.025);
      check(
        secret.revealed && !g.wallAt(80, 800, 10),
        "Walk crack did not reveal",
      );
      g.hero.x = secret.reward.x;
      g.hero.y = secret.reward.y;
      g.updateEndgame(0.025);
      check(secret.used && g.mode === "relic", "Secret reward");
      document.querySelector("#choices button").click();
      rows.push("Cracked wall opens only on approach, relic claim");
      const c = {
        x: 480,
        y: 800,
        hp: 100,
        max: 100,
        type: "ghoul",
        r: 15,
        speed: 50,
        nightChampion: "shielded",
        nightShield: 40,
        nightName: "TEST",
      };
      g.enemies = [c];
      check(
        g.endgameDamage(c, 20) === 10 && c.nightShield === 30,
        "Shield modifier",
      );
      c.nightChampion = "vampiric";
      c.hp = 20;
      g.hero.x = c.x;
      g.hero.y = c.y;
      g.hero.armor = 0;
      g.takeHit(1);
      check(c.hp > 20, "Vampiric modifier");
      const vampireHp=c.hp,playerHp=g.hero.hp;g.hero.dashTime=.25;g.takeHit(10);
      check(c.hp===vampireHp&&g.hero.hp===playerHp,"Vampire leeches during invulnerable Dash");g.hero.dashTime=0;

      c.nightChampion = "splitting";
      g.drops = [];
      g.endgameEnemyKilled(c);
      check(
        g.drops.some((o) => o.type === "nightRelic"),
        "Champion lacks guaranteed relic",
      );
      check(g.enemies.length === 3, "Splitting modifier");
      const oldRandom = Math.random;
      try {
        g.run.daily = null;
        g.run.torment = 0;
        let roll = 0;
        Math.random = () => (roll++ === 0 ? 0 : 0.3);
        const fast = {
          x: 400,
          y: 800,
          hp: 100,
          max: 100,
          speed: 50,
          r: 15,
          type: "ghoul",
        };
        g.enemies = [fast];
        g.enhanceEndgameEnemy(fast, true);
        check(
          fast.nightChampion === "hasted" && fast.speed === 70,
          "Hasted modifier",
        );
        Math.random = () => 0.5;
        g.begin();
        g.run.torment = 0;
        g.spawn = 0;
        g.update(0.025);
        const normalInterval = g.spawn;
        g.begin();
        g.run.torment = 10;
        g.spawn = 0;
        g.update(0.025);
        check(
          Math.abs(normalInterval / g.spawn - 1.65) < 0.0001,
          "Torment density",
        );
      } finally {
        Math.random = oldRandom;
      }
      rows.push(
        "All four champion modifiers, guaranteed relic, Torment density/reward",
      );
      const daily = E.daily("2026-10-05");
      g.pendingDaily = daily;
      g.selectedHero = daily.hero;
      g.begin();
      const dailygrid = Array.from(g.dungeon.cells).sort().join("|"),
        rolls = [g.gameRandom(), g.gameRandom()];
      g.pendingDaily = daily;
      g.begin();
      check(
        JSON.stringify([g.gameRandom(), g.gameRandom()]) ===
          JSON.stringify(rolls) &&
          Array.from(g.dungeon.cells).sort().join("|") === dailygrid,
        "Daily differs on restart",
      );
      function dailyTrace() {
        g.pendingDaily = daily;
        g.selectedHero = daily.hero;
        g.begin();
        for (let i = 0; i < 1600 && g.clock < 30; i++) {
          if (g.mode !== "play") {
            const button = document.querySelector(
              "#choices button.choice:not(:disabled)",
            );
            if (!button) break;
            button.click();
            continue;
          }
          g.joy.dx = Math.cos(i * 0.012) * 0.6;
          g.joy.dy = Math.sin(i * 0.012) * 0.6;
          g.update(0.025);
          if (g.mode === "over") break;
        }
        return {
          hp: g.hero.hp,
          x: g.hero.x,
          y: g.hero.y,
          kills: g.kills,
          clock: g.clock,
          rng: g.run.rng,
          enemies: g.enemies.map((e) => [e.type, e.x, e.y, e.hp]),
        };
      }
      const trace = dailyTrace();
      check(
        JSON.stringify(dailyTrace()) === JSON.stringify(trace),
        "Daily combat trace changes with cosmetic RNG",
      );
      g.joy.dx = g.joy.dy = 0;
      g.mode = "play";
      g.kills = 123;
      g.recordEndgameResult(false, "TEST");
      check(
        g.profile.dailyBest[daily.date] > 0 &&
          g.profile.runHistory[0].daily === daily.date,
        "Daily best",
      );
      rows.push("Fixed daily hero/seed/modifier and reproducible gameplay RNG");
      for (let i = 0; i < 25; i++) {
        g.run.id = "history-" + i;
        g.kills = i;
        g.recordEndgameResult(false, "TEST " + i);
      }
      check(
        g.profile.runHistory.length === 20 &&
          g.profile.runHistory[0].kills === 24 &&
          g.profile.runHistory[19].kills === 5,
        "History cap/order",
      );
      g.recordEndgameResult(false, "Updated");
      check(
        g.profile.runHistory.length === 20 &&
          g.profile.runHistory[0].cause === "Updated",
        "History duplicates",
      );
      g.saveProfile();
      const code = g.makeSaveCode(),
        decoded = g.loadSaveCode(code);
      check(
        decoded.profile.runHistory.length === 20 &&
          decoded.profile.dailyBest[daily.date] &&
          decoded.run.endgameRun.seed === g.run.seed,
        "EC1 fields",
      );
      rows.push("Last 20 history records, idempotency, daily/profile/run EC1");
      return rows;
    });
    await page.evaluate(() => nightTest.renderMenu("slots"));
    await page
      .getByRole("button", { name: "SLOT 2 · + NEW CHARACTER", exact: true })
      .click();
    await page.locator("input").fill("Separate");
    await page
      .getByRole("button", { name: "CREATE & PLAY", exact: true })
      .click();
    assert(
      await page.evaluate(
        () =>
          !nightTest.profile.descentCleared &&
          !nightTest.profile.runHistory.length &&
          nightTest.run.gold === 0,
      ),
    );
    await page.evaluate(() => nightTest.selectSlot(0));
    assert(
      await page.evaluate(
        () =>
          nightTest.profile.runHistory.length === 20 &&
          nightTest.profile.descentCleared,
      ),
    );
    report.mechanics.push("Slot isolation");
    // Every existing hero, all floors and both orientations with random geometry and normal controls.
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      for (const hero of [
        "gravecaller",
        "ranger",
        "ember",
        "bloodknight",
        "sunwarden",
      ])
        for (let floor = 1; floor <= 5; floor++) {
          const row = await page.evaluate(
            ({ hero, floor }) => {
              const g = nightTest;
              g.applyProfile({
                descentCleared: true,
                randomLayouts: true,
                bosses: 3,
                ember: true,
                sunwarden: true,
              });
              g.selectedHero = hero;
              g.selectedMode = "descent";
              g.begin();
              g.floorEntry(floor);
              g.hero.maxHp = g.hero.hp = 100000;
              g.hero.damage = 10000;
              g.joy.dx = 0.5;
              g.joy.dy = 0.1;
              for (let i = 0; i < 20; i++) g.update(0.025);
              g.joy.dx = g.joy.dy = 0;
              g.draw();
              if (g.wallAt(g.hero.x, g.hero.y, g.hero.r))
                throw Error("Hero in wall");
              g.kills = g.dungeon.startKills + 1000;
              g.updateDungeon(0.025);
              if (!g.dungeon.open) throw Error("Boss lock");
              g.hero.x = 26 * 80;
              g.hero.y = 10 * 80;
              g.updateDungeon(0.025);
              const boss = g.enemies.find((e) => e.type === "boss");
              if (!boss) throw Error("Missing boss");
              g.damageEnemy(boss, 1e10);
              if (floor < 5 && !g.dungeon.stairs) throw Error("Missing stairs");
              g.draw();
              return {
                hero,
                floor,
                cells: g.dungeon.cells.size,
                door: g.dungeon.open,
                stairs: !!g.dungeon.stairs,
              };
            },
            { hero, floor },
          );
          report.renders.push({ ...row, ...size });
        }
    }
    await page.evaluate(() => {
      const g = nightTest;
      g.mode = "play";
      g.floorEntry(3);
      g.dungeon.title = 0;
      g.hero.x = 400;
      g.hero.y = 800;
      g.draw();
    });
    await page.screenshot({ path: "/tmp/v72-random-landscape.png" });
    await page.evaluate(() => nightTest.renderMenu("modes"));
    await page.getByRole("button", { name: /^DAILY CHALLENGE/ }).click();
    assert(
      await page.evaluate(
        () =>
          nightTest.run.daily &&
          nightTest.hero.class === nightTest.run.daily.hero,
      ),
    );
    await page.evaluate(() => nightTest.renderMenu("history"));
    assert(
      (await page.locator("#menuPage").textContent()).includes("RUN HISTORY"),
    );
    const live = await b.newPage({ viewport: { width: 390, height: 844 } });
    live.on("pageerror", (e) => errors.push(e.message));
    await live.goto(url + "/live");
    await live
      .getByRole("button", { name: "TAP TO START" })
      .click({ force: true });
    await live
      .getByRole("button", { name: "SLOT 1 · + NEW CHARACTER", exact: true })
      .click();
    await live.locator("input").fill("Live Nights");
    await live
      .getByRole("button", { name: "CREATE & PLAY", exact: true })
      .click();
    await live.locator("#pauseControl").click();
    await live.getByRole("button", { name: /^QUIT RUN/ }).click();
    await live
      .getByRole("button", { name: "QUIT RUN · CONFIRM", exact: true })
      .click();
    await live.getByRole("button", { name: "PLAY", exact: true }).click();
    await live.getByRole("button", { name: /^DAILY CHALLENGE/ }).click();
    await live.waitForFunction(
      () => document.querySelector("#time").textContent !== "0:00",
      null,
      { timeout: 15000 },
    );
    await live.keyboard.down("d");
    await live.locator("#dashButton").click();
    assert(
      !(await live.locator("#dashButton .skill-value").textContent()).includes(
        "READY",
      ),
    );
    await live.keyboard.up("d");
    await live.setViewportSize({ width: 844, height: 390 });
    await live.waitForFunction(
      () => document.querySelector("#time").textContent >= "0:02",
      null,
      { timeout: 15000 },
    );
    await live.locator("#pauseControl").click();
    assert(
      await live
        .getByRole("button", { name: "RESUME", exact: true })
        .isVisible(),
    );
    report.live =
      "Unmodified production page: actual menu/daily start, running frame loop, Dash, keyboard, portrait-to-landscape and pause";
    await live.close();
    assert.equal(errors.length, 0, errors.join("\n"));
    const dir = process.env.ARTIFACT_DIR || path.join(root, "tests");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "endless-nights-results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      "PASS v72 migration, Classic/random checkpoint, Torment, secret room, merchant, champion modifiers, daily, history, EC1, slots, 50 hero/floor/orientation boss/stairs renders",
    );
  } finally {
    await b.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
