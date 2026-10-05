// v73 real browser mechanics, additive saves and seeded endgame integration.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright"),
  root = path.resolve(__dirname, ".."),
  raw = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const m of raw.matchAll(/<script>([\s\S]*?)<\/script>/g))
  new Function(m[1]);
const box = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets/heroes/mastery.js"), "utf8"),
  box,
);
const M = box.window.EmberMastery;
assert.equal(M.level(0), 1);
assert.equal(M.level(1e9), 20);
assert.equal(M.normalize({}).mastery.rogue.xp, 0);
assert.equal(
  M.normalize({ mastery: { rogue: { xp: -2, color: 2 } } }).mastery.rogue.color,
  0,
);
assert.equal(
  M.normalize({ masteryClaims: { constructor: 100, __proto__: 20 } })
    .masteryClaims.constructor,
  100,
);
assert.equal(M.perks(9).rerolls, 0);
assert.equal(M.perks(10).rerolls, 1);
assert.equal(M.perks(19).token, false);
assert.equal(M.perks(20).token, true);
assert(M.earned(2, 2, 80, 10) > M.earned(2, 2, 80));
const p = M.normalize({});
assert.equal(M.grant(p, "rogue", "run-1", 100), 100);
assert.equal(M.grant(p, "rogue", "run-1", 100), 0);
assert.equal(M.grant(p, "rogue", "run-1", 150), 50);
assert.equal(p.mastery.rogue.xp, 150);
assert.equal(p.mastery.frostwarden.xp, 0);
const endBox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets/endgame/endless-nights.js"), "utf8"),
  endBox,
);
const E = endBox.window.EmberEndgame,
  legacyDaily = {
    date: "2026-10-05",
    hero: "gravecaller",
    seed: 42,
    modifier: "relentless",
  };
assert.deepEqual(
  JSON.parse(JSON.stringify(E.run({ daily: legacyDaily }).daily)),
  legacyDaily,
);
const hooks = `window.bloodTest={begin,applyProfile,selectSlot,saveProfile,saveRun,readRun,restoreRun,makeSaveCode,loadSaveCode,renderHeroScreen,renderMenu,levelUp,draw,update,floorEntry,floorSpec,updateDungeon,wallAt,moveAroundWalls,nearbyAlly,newBloodAttack,updateNewBlood,shieldBash,useDash,useUltimate,takeHit,newBloodCards,newBloodEvolutions,newBloodDeath,prototypeCardAllowed,prototypeEvolutionAllowed,evolutionReady,icePlacementAllowed,awardHeroMastery,enhanceEndgameEnemy,damageEnemy,spawnBoss,continueEndless,showVictory,recordEndgameResult,updateEndgame,collectEndgameDrop,setQualityTier,
get hero(){return hero},get profile(){return profile},get run(){return endgameRun},get wave(){return wave},set wave(v){wave=v},get clock(){return clock},set clock(v){clock=v},get dungeon(){return dungeon},get checkpoint(){return floorCheckpoint},get enemies(){return enemies},set enemies(v){enemies=v},get daggers(){return bloodDaggers},get iceWalls(){return iceWalls},set iceWalls(v){iceWalls=v},get shots(){return shots},get drops(){return drops},get joy(){return joy},get mode(){return mode},set mode(v){mode=v},get kills(){return kills},set kills(v){kills=v},get runStats(){return runStats},set selectedHero(v){selectedHero=v},get selectedHero(){return selectedHero},set selectedMode(v){selectedMode=v},set pendingDaily(v){pendingDaily=v},get art(){return art},get slots(){return slots}};`;
const source = raw
  .replace("function sfx(kind) {", "function sfx(kind) { return;")
  .replace("function music(kind) {", "function music(kind) { return;")
  .replaceAll("requestAnimationFrame(frame);", "")
  .replace("      })();", hooks + "\n      })();");
const server = http.createServer((req, res) => {
  const name = new URL(req.url, "http://localhost").pathname;
  if (name === "/" || name === "/live") {
    res.setHeader("Content-Type", "text/html");
    return res.end(name === "/live" ? raw : source);
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
    name.endsWith(".js")
      ? "application/javascript"
      : "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const report = { mechanics: null, saves: null, scenes: [], errors: [] };
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page
      .getByRole("button", { name: "TAP TO START" })
      .click({ force: true });
    await page
      .getByRole("button", { name: "SLOT 1 · + NEW CHARACTER", exact: true })
      .click();
    await page.locator("input").fill("New Blood");
    await page
      .getByRole("button", { name: "CREATE & PLAY", exact: true })
      .click();
    await page.waitForFunction(
      () => EmberHeroAnimation.diagnostics().frames === 210,
    );
    report.mechanics = await page.evaluate(() => {
      const g = bloodTest,
        M = EmberMastery;
      function check(v, m) {
        if (!v) throw Error(m);
      }
      function start(kind) {
        g.applyProfile({ bosses: 5, bestFloor: 4, descentCleared: true });
        g.selectedHero = kind;
        g.selectedMode = "descent";
        g.begin();
        g.enemies = [];
        g.hero.x = 1000;
        g.hero.y = 800;
        g.hero.inv = 0;
        g.hero.critChance = 0;
        g.joy.dx = g.joy.dy = 0;
        return g.hero;
      }
      function enemy(x, y) {
        const e = {
          x,
          y,
          r: 10,
          type: "ghoul",
          hp: 2000,
          max: 2000,
          speed: 0,
          attack: 99,
        };
        g.enemies.push(e);
        return e;
      }
      let h = start("rogue"),
        a = enemy(1080, 800),
        b = enemy(1140, 800);
      g.newBloodAttack();
      check(
        g.daggers.length === 1 && g.shots.length === 0,
        "Daggers replaced by staff",
      );
      g.updateNewBlood(0.2);
      check(a.hp < 2000 && b.hp === 2000, "Dagger must be single target");
      check(a.poisonTime > 0, "Poison absent");
      g.enemies = [];
      a = enemy(1250, 800);
      g.newBloodAttack();
      check(g.daggers.length === 0, "Dagger range too long");
      g.hero.x = 220;
      g.hero.y = 600;
      a = enemy(220, 535);
      g.newBloodAttack();
      check(g.daggers.length === 0, "Dagger targets through wall");
      h.x = 1000;
      h.y = 800;
      g.enemies = [];
      a = enemy(1090, 800);
      check(g.useDash(), "Dash unavailable");
      check(
        h.decoy.until - g.clock === 2 && g.nearbyAlly(a) === h.decoy,
        "Decoy targeting",
      );
      g.clock += 2.01;
      check(g.nearbyAlly(a) !== h.decoy, "Decoy persists");
      h.dashCd = h.dashTime = 0;
      h.inv = 0;
      h.ultimateCharge = 100;
      check(g.useUltimate(), "Night Veil unavailable");
      check(
        g.nearbyAlly(a) === h.veilMemory,
        "Enemies can see moving hero during Veil",
      );
      const hp = h.hp,
        armor = h.armor;
      g.takeHit(100);
      check(h.hp === hp && h.armor === armor, "Veil invulnerability");
      g.newBloodAttack();
      check(
        g.daggers.every((d) => d.crit),
        "Night Veil not guaranteed crit",
      );
      g.clock += 3.01;
      h.inv = 0;
      g.newBloodAttack();
      check(
        g.daggers.some((d) => !d.crit),
        "Veil crit persists",
      );
      const rogueCards = g.newBloodCards();
      check(
        rogueCards.every((c) => ["poison", "shadow"].includes(c.element)),
        "Rogue card elements",
      );
      check(
        !g.prototypeCardAllowed({ name: "Firebrand", element: "fire" }) &&
          !g.prototypeCardAllowed({ name: "Venom Bolts", element: "poison" }),
        "Legacy pool overlaps",
      );
      h.venomTips = h.toxicVial = h.shadowLace = h.mirrorEdge = 2;
      check(
        g.evolutionReady("nightbloom") && g.evolutionReady("phantoms"),
        "Rogue evolution unavailable",
      );
      h.evolutions = ["nightbloom", "phantoms"];
      g.clock += 1;
      const before = a.hp;
      g.newBloodDeath({ x: 1090, y: 800 });
      check(a.hp < before, "Nightbloom does not damage");
      h.mirrorEdge = 2;
      g.useDash();
      const count = g.daggers.length;
      g.updateNewBlood(0.01);
      check(g.daggers.length > count, "Decoy does not attack");
      h = start("frostwarden");
      a = enemy(1070, 800);
      b = enemy(1060, 840);
      const behind = enemy(910, 800);
      g.newBloodAttack();
      check(
        a.hp < 2000 &&
          b.hp < 2000 &&
          behind.hp === 2000 &&
          g.shots.length === 0,
        "Shield arc",
      );
      h.projectiles = 2;
      g.newBloodAttack();
      check(behind.hp < 2000, "Twin Flame rear bash");
      g.enemies = [];
      h.x = 220;
      h.y = 600;
      a = enemy(220, 535);
      h.faceX = 0;
      h.faceY = -1;
      g.shieldBash(-Math.PI / 2);
      check(a.hp === 2000, "Bash through wall");
      h.x = 1000;
      h.y = 800;
      g.iceWalls = [
        { x1: 1050, y1: 730, x2: 1050, y2: 870, until: g.clock + 3 },
      ];
      let foe = { x: 1020, y: 800, r: 14 };
      g.moveAroundWalls(foe, 60, 0, 0.025, true);
      check(foe.x === 1020, "Enemy passes ice");
      g.moveAroundWalls(h, 90, 0, 0.025);
      check(h.x > 1050, "Ice traps hero");
      check(!g.icePlacementAllowed(24.5 * 80, 800, 0), "Wall blocks boss door");
      g.dungeon.stairs = { x: 2280, y: 800 };
      check(!g.icePlacementAllowed(2280, 800, 0), "Wall blocks stairs");
      g.clock += 4;
      g.updateNewBlood(0.01);
      check(g.iceWalls.length === 0, "Walls do not expire");
      h.ultimateCharge = 100;
      h.inv = 0;
      h.armor = 0;
      h.hp = h.maxHp;
      check(g.useUltimate(), "Fortress unavailable");
      const health = h.hp;
      g.takeHit(100);
      check(Math.abs(h.hp - (health - 28)) < 0.001, "Fortress reduction");
      h.inv = 0;
      h.x += 200;
      const hpOutside = h.hp;
      g.takeHit(50);
      check(h.hp === hpOutside - 40, "Fortress protects outside dome");
      check(
        g.newBloodCards().every((c) => ["ice", "earth"].includes(c.element)),
        "Warden card elements",
      );
      check(
        !g.prototypeCardAllowed({ name: "Stone Skin", element: "earth" }),
        "Warden pool overlaps",
      );
      h.rimeBash = h.frozenBulwark = h.seismicCounter = h.graniteMantle = 2;
      check(
        g.evolutionReady("permafrost") && g.evolutionReady("avalanche"),
        "Warden evolution unavailable",
      );
      h.x = 1000;
      h.y = 800;
      g.enemies = [];
      a = enemy(1060, 800);
      h.evolutions = ["permafrost"];
      g.shieldBash(0);
      check(a.stunUntil > g.clock, "Permafrost freeze absent");
      h.evolutions = ["avalanche"];
      h.bashCount = 3;
      g.enemies = [];
      a = enemy(940, 800);
      const earthBefore = a.hp;
      g.newBloodAttack();
      check(a.hp < earthBefore, "Avalanche pulse absent");
      for (const kind of ["rogue", "frostwarden"]) {
        const normal = EmberHeroAnimation.frame(kind, 0),
          colored = EmberHeroAnimation.frame(kind, 0, 1);
        check(
          colored === EmberHeroAnimation.frame(kind, 0, 1),
          "Palette not cached",
        );
        const x = normal.getContext("2d").getImageData(0, 0, 224, 192).data,
          y = colored.getContext("2d").getImageData(0, 0, 224, 192).data;
        let changed = 0;
        for (let i = 0; i < x.length; i += 4) {
          check(x[i + 3] === y[i + 3], "Palette changes alpha");
          if (x[i] !== y[i]) changed++;
        }
        check(changed > 500, "Palette did not change");
      }
      return {
        rogue:
          "single-target range/LOS, poison, decoy expiry/attack, Veil invulnerability/crits, own pools/evolutions",
        warden:
          "arc/LOS/rear swing, enemy-only ice/door/stairs/expiry, Fortress inside/outside, own pools/evolutions",
        palettes: "cached, alpha preserved",
      };
    });
    report.saves = await page.evaluate(() => {
      const g = bloodTest,
        M = EmberMastery;
      function check(v, m) {
        if (!v) throw Error(m);
      }
      g.applyProfile({
        version: 2,
        migrated: true,
        embers: 321,
        total: 500,
        bosses: 5,
        bestFloor: 4,
        upgrades: { power: 2 },
        achievements: { boss3: true },
        bestTorment: { rogue: 3 },
        runHistory: [{ id: "old", hero: "rogue", mode: "descent" }],
      });
      check(
        g.profile.embers === 321 &&
          g.profile.upgrades.power === 2 &&
          g.profile.achievements.boss3 &&
          g.profile.mastery.rogue.xp === 0,
        "Old profile damaged",
      );
      check(
        g.profile.bestTorment.rogue === 3 &&
          g.profile.runHistory[0].hero === "rogue",
        "Endgame profile loses new heroes",
      );
      g.selectedHero = "rogue";
      g.selectedMode = "descent";
      g.begin();
      g.kills = 160;
      g.runStats.bosses = 2;
      g.floorEntry(3);
      g.run.torment = 4;
      g.awardHeroMastery(false);
      const earned = M.earned(2, 2, 160, 4),
        xp = g.profile.mastery.rogue.xp;
      check(xp === earned, "Mastery XP calculation");
      g.awardHeroMastery(false);
      check(g.profile.mastery.rogue.xp === xp, "Duplicate award");
      g.saveRun(true);
      const saved = g.readRun();
      check(
        saved.version === 12 && saved.hero.class === "rogue",
        "Run format changed",
      );
      const id = g.hero.masteryRunId,
        code = g.makeSaveCode(),
        decoded = g.loadSaveCode(code);
      check(
        decoded.profile.mastery.rogue.xp === xp &&
          decoded.run.hero.masteryRunId === id,
        "EC1 loses mastery",
      );
      g.restoreRun();
      g.awardHeroMastery(false);
      check(
        g.hero.masteryRunId === id && g.profile.mastery.rogue.xp === xp,
        "Resume awards twice",
      );
      localStorage.setItem(
        "ember-crypt-slot-2-profile",
        JSON.stringify({
          version: 2,
          migrated: true,
          embers: 71,
          mastery: { rogue: { xp: 12 } },
          bestTorment: { frostwarden: 2 },
        }),
      );
      g.slots[1] = { ...g.slots[0], name: "Isolated", playTime: 0 };
      g.saveProfile();
      g.selectSlot(1);
      check(
        g.profile.mastery.rogue.xp === 12 &&
          g.profile.embers === 71 &&
          g.profile.bestTorment.frostwarden === 2,
        "Slots share mastery",
      );
      g.selectSlot(0);
      check(
        g.profile.mastery.rogue.xp === xp && g.profile.embers === 321,
        "Original slot damaged",
      );
      for (const kind of [
        "gravecaller",
        "ranger",
        "ember",
        "bloodknight",
        "sunwarden",
      ]) {
        g.applyProfile({
          version: 2,
          migrated: true,
          bosses: 5,
          bestFloor: 4,
          embers: 71,
        });
        g.selectedHero = kind;
        g.selectedMode = "endless";
        g.begin();
        const original = {
          hp: g.hero.hp,
          damage: g.hero.damage,
          armor: g.hero.armor,
          speed: g.hero.speed,
        };
        g.saveRun(true);
        const legacy = JSON.parse(
          localStorage.getItem("ember-crypt-slot-1-run-v12"),
        );
        delete legacy.hero.masteryRunId;
        localStorage.setItem(
          "ember-crypt-slot-1-run-v12",
          JSON.stringify(legacy),
        );
        g.restoreRun();
        for (const key of Object.keys(original))
          check(
            g.hero[key] === original[key],
            "Existing hero resume changed " + kind + "/" + key,
          );
        check(
          g.profile.mastery[kind].xp === 0,
          "Old hero starts with mastery XP",
        );
      }
      g.profile.mastery.frostwarden = { xp: M.goal(20), color: 2 };
      g.selectedHero = "frostwarden";
      g.begin();
      check(
        g.hero.rerolls === g.profile.upgrades.reroll + 1 &&
          g.hero.relics.includes("wanderer") &&
          g.hero.pickupBonus >= 8,
        "Listed mastery perks missing",
      );
      g.saveProfile();
      return {
        profileVersion: 2,
        runVersion: 12,
        codes: "EC1",
        credit: earned,
        idempotent: true,
      };
    });
    report.import = await page.evaluate(() => {
      const g = bloodTest;
      g.selectSlot(0);
      g.applyProfile({
        version: 2,
        migrated: true,
        embers: 900,
        bosses: 5,
        bestFloor: 4,
        mastery: { rogue: { xp: EmberMastery.goal(16), color: 2 } },
      });
      g.selectedHero = "rogue";
      g.selectedMode = "descent";
      g.begin();
      g.kills = 80;
      g.awardHeroMastery(false);
      const xp = g.profile.mastery.rogue.xp,
        code = g.makeSaveCode();
      g.selectSlot(1);
      g.renderMenu("settings");
      const input = document.querySelector(
        'textarea[aria-label="Paste save code"]',
      );
      input.value = code;
      const load = [...document.querySelectorAll("button")].find(
        (b) => b.textContent === "LOAD",
      );
      load.click();
      load.click();
      g.restoreRun();
      g.awardHeroMastery(false);
      if (
        g.profile.mastery.rogue.xp !== xp ||
        g.profile.mastery.rogue.color !== 2 ||
        g.hero.class !== "rogue" ||
        g.profile.embers !== 900
      )
        throw Error("Actual EC1 import lost mastery/run");
      g.selectSlot(0);
      g.profile.mastery.rogue.xp++;
      g.saveProfile();
      g.selectSlot(1);
      if (g.profile.mastery.rogue.xp !== xp)
        throw Error("Imported slots share XP");
      g.selectSlot(0);
      return "Actual Settings EC1 import, replacement confirmation, resume credit and post-import slot isolation";
    });
    report.endless = await page.evaluate(() => {
      const g = bloodTest,
        rows = [];
      for (const kind of ["rogue", "frostwarden"]) {
        g.applyProfile({
          bosses: 5,
          bestFloor: 5,
          descentCleared: true,
          selectedTorment: 2,
        });
        g.selectedHero = kind;
        g.selectedMode = "endless";
        g.begin();
        g.wave = 20;
        g.enemies = [];
        g.spawnBoss("heart");
        const heart = g.enemies.find((e) => e.variant === "heart");
        g.damageEnemy(heart, 1e9, "neutral");
        g.showVictory();
        const first = g.profile.mastery[kind].xp;
        if (!g.hero.victoryPaid || g.profile.bestTorment[kind] !== 2)
          throw Error("Endless Heart clear lost");
        g.continueEndless();
        g.kills += 100;
        g.runStats.bosses++;
        g.awardHeroMastery(false);
        const extended = g.profile.mastery[kind].xp;
        g.awardHeroMastery(false);
        if (
          !g.hero.endless ||
          extended <= first ||
          g.profile.mastery[kind].xp !== extended
        )
          throw Error("Endless mastery continuation duplicates/loses XP");
        g.draw();
        rows.push({ kind, first, extended });
      }
      return rows;
    });
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      for (const kind of ["rogue", "frostwarden"])
        for (const layout of [false, true]) {
          const scenes = await page.evaluate(
            ({ kind, layout }) => {
              const g = bloodTest;
              g.applyProfile({
                bosses: 5,
                bestFloor: 5,
                descentCleared: true,
                randomLayouts: layout,
                selectedTorment: 2,
              });
              g.selectedHero = kind;
              g.selectedMode = "descent";
              g.begin();
              const rows = [];
              for (let f = 1; f <= 5; f++) {
                g.floorEntry(f);
                g.enemies = [];
                g.dungeon.open = true;
                g.hero.x = 2280;
                g.hero.y = 800;
                g.updateDungeon(0.025);
                const boss = g.enemies.find((e) => e.type === "boss");
                if (!boss) throw Error("Missing boss " + kind + "/" + f);
                g.damageEnemy(boss, 1e9, "neutral");
                g.draw();
                if (f < 5) {
                  if (!g.dungeon.stairs) throw Error("No stairs");
                  g.hero.x = g.dungeon.stairs.x;
                  g.hero.y = g.dungeon.stairs.y;
                  g.updateDungeon(0.025);
                  if (g.dungeon.floor !== f + 1) throw Error("No next floor");
                } else g.showVictory();
                rows.push({ floor: f, boss: boss.variant });
              }
              if (
                g.profile.bestTorment[kind] !== 2 ||
                !g.profile.runHistory.some((r) => r.hero === kind)
              )
                throw Error("Torment/history missing");
              return rows;
            },
            { kind, layout },
          );
          report.scenes.push({ kind, layout, size, scenes });
          await page.screenshot({
            path: "/tmp/v73-" + kind + "-" + size.width + "-" + layout + ".png",
          });
        }
    }
    report.quality = await page.evaluate(() => {
      const g = bloodTest,
        rows = [];
      for (const tier of ["high", "medium", "low"])
        for (const kind of ["rogue", "frostwarden"]) {
          g.applyProfile({ bosses: 5, bestFloor: 4 });
          g.selectedHero = kind;
          g.selectedMode = "descent";
          g.begin();
          g.setQualityTier(tier);
          g.hero.x = 1000;
          g.hero.y = 800;
          g.enemies = [
            {
              x: 1060,
              y: 800,
              r: 10,
              type: "ghoul",
              hp: 1e8,
              max: 1e8,
              speed: 0,
            },
          ];
          for (let i = 0; i < 100; i++) g.newBloodAttack();
          if (kind === "frostwarden")
            for (let i = 0; i < 20; i++) {
              g.hero.wallCd = 0;
              g.updateNewBlood(0.025);
            }
          g.hero.ultimateCharge = 100;
          g.useUltimate();
          g.draw();
          if (g.daggers.length > 32 || g.iceWalls.length > 2)
            throw Error("Effect/actor cap exceeded");
          rows.push({
            tier,
            kind,
            daggers: g.daggers.length,
            iceWalls: g.iceWalls.length,
          });
        }
      g.setQualityTier("high");
      return rows;
    });
    const daily = await page.evaluate(() => {
      const names = new Set();
      for (let day = 0; day < 500; day++)
        names.add(
          EmberEndgame.daily(
            new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10),
          ).hero,
        );
      if (!names.has("rogue") || !names.has("frostwarden"))
        throw Error("Daily pool missing heroes");
      const g = bloodTest;
      for (const kind of ["rogue", "frostwarden"]) {
        let challenge;
        for (let day = 0; day < 500; day++) {
          const d = EmberEndgame.daily(
            new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10),
          );
          if (d.hero === kind) {
            challenge = d;
            break;
          }
        }
        g.pendingDaily = challenge;
        g.selectedHero = kind;
        g.selectedMode = "descent";
        g.begin();
        if (g.run.daily.hero !== kind) throw Error("Daily launch failed");
        g.enemies = [];
        g.hero.x = 1000;
        g.hero.y = 800;
        const e = {
          x: 1060,
          y: 800,
          r: 10,
          type: "ghoul",
          hp: 100,
          max: 100,
          speed: 0,
        };
        g.enemies.push(e);
        e.nightChampion = "shielded";
        e.nightShield = 10;
        g.newBloodAttack();
        g.updateNewBlood(0.2);
        if (e.hp === 100) throw Error("Champion not hittable");
        g.run.gold = 200;
        g.floorEntry(3);
        g.enemies = [];
        g.hero.moving = 0;
        g.hero.hp = g.hero.maxHp * 0.4;
        const rerolls = g.hero.rerolls;
        for (const pad of g.dungeon.shop.pads) {
          g.hero.x = pad.x;
          g.hero.y = pad.y;
          for (let i = 0; i < 60; i++) g.updateEndgame(0.025);
          if (!pad.used) throw Error("Merchant " + pad.kind + " unavailable");
          if (g.mode === "relic")
            document.querySelector("#choices .choice").click();
        }
        if (
          g.hero.rerolls !== rerolls + 1 ||
          g.hero.relics.length !== 1 ||
          g.run.gold !== 98
        )
          throw Error("Merchant purchases lost");
        for (let seed = 0; seed < 100; seed++)
          if (EmberEndgame.secret(seed, 2)) {
            g.run.seed = seed;
            break;
          }
        g.floorEntry(2);
        const secret = g.dungeon.secret;
        g.hero.x = secret.mouth.x;
        g.hero.y = secret.mouth.y;
        g.hero.moving = 1;
        g.joy.dx = -1;
        g.joy.dy = 0;
        g.updateEndgame(0.025);
        if (!secret.revealed) throw Error("Secret reveal failed");
        g.hero.x = secret.reward.x;
        g.hero.y = secret.reward.y;
        g.updateEndgame(0.025);
        if (!secret.used || g.mode !== "relic")
          throw Error("Secret relic failed");
        document.querySelector("#choices .choice").click();
        g.joy.dx = 0;
      }
      return [...names];
    });
    report.dailyPool = daily;
    const fallback = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const pngRequests = [];
    fallback.on("request", (r) => {
      if (/(?:rogue|frostwarden)-animation\.png/.test(r.url()))
        pngRequests.push(r.url());
    });
    fallback.on("pageerror", (e) => report.errors.push(e.message));
    await fallback.route("**/*-animation.webp", (r) => r.abort());
    await fallback.goto("http://127.0.0.1:" + server.address().port);
    await fallback.waitForFunction(
      () =>
        EmberHeroAnimation.ready("rogue") &&
        EmberHeroAnimation.ready("frostwarden"),
    );
    assert(
      pngRequests.some((s) => s.includes("rogue")) &&
        pngRequests.some((s) => s.includes("frostwarden")),
    );
    await fallback.close();
    report.fallback = "Both new authored sheets loaded through PNG fallback";
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(
      path.join(root, "tests/new-blood-results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      "PASS v73 mechanics, mastery/EC1/old-profile defaults, 40 assisted floor/orientation/layout scenes, daily/champions/merchant/Torment/history",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
