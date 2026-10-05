/* v72 rules: deterministic room assembly and additive slot-owned metadata. */
(() => {
  "use strict";
  const heroes = ["gravecaller", "ranger", "ember", "bloodknight", "sunwarden", "rogue", "frostwarden"];
  const integer = (n, max = 2147483647) =>
    Math.min(max, Math.max(0, Math.floor(Number(n) || 0)));
  function hash(text) {
    let n = 2166136261;
    for (const c of String(text)) {
      n ^= c.charCodeAt(0);
      n = Math.imul(n, 16777619);
    }
    return n >>> 0;
  }
  function random(seed) {
    let n = seed >>> 0;
    return () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }
  function date(now = Date.now()) {
    return new Date(now).toISOString().slice(0, 10);
  }
  function daily(day = date()) {
    const seed = hash("Ember Crypt daily v72 " + day),
      roll = random(seed);
    return {
      date: day,
      seed,
      hero: heroes[Math.floor(roll() * heroes.length)],
      modifier: ["relentless", "haunted", "blood-moon"][Math.floor(roll() * 3)],
    };
  }
  function profile(prior = {}) {
    prior = {
      ...prior,
      descentCleared:
        !!prior.descentCleared ||
        // Every pre-v72 victory raised unlockedDepth to at least 1, even at depth 0.
        Number(prior.unlockedDepth) > 0 ||
        Object.values(prior.records?.descent?.bestDepth || {}).some(
          (value) => Number(value) > 0,
        ),
    };
    const best = {};
    for (const hero of heroes)
      best[hero] = integer(prior.bestTorment?.[hero], 10);
    const history = Array.isArray(prior.runHistory)
      ? prior.runHistory
          .slice(0, 20)
          .filter((r) => r && heroes.includes(r.hero))
          .map((r) => ({
            id: String(r.id || "").slice(0, 80),
            hero: r.hero,
            mode: r.mode === "endless" ? "endless" : "descent",
            torment: integer(r.torment, 10),
            floor: integer(r.floor, 100),
            time: integer(r.time),
            kills: integer(r.kills),
            cause: String(r.cause || "Unknown").slice(0, 100),
            date: String(r.date || "").slice(0, 30),
            daily: String(r.daily || "").slice(0, 10),
            score: integer(r.score),
          }))
      : [];
    const scores = {};
    for (const [day, score] of Object.entries(prior.dailyBest || {}).slice(
      -366,
    ))
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) scores[day] = integer(score);
    return {
      descentCleared: !!prior.descentCleared,
      randomLayouts:
        prior.randomLayouts == null
          ? !!prior.descentCleared
          : !!prior.randomLayouts,
      selectedTorment: prior.descentCleared
        ? integer(prior.selectedTorment, 10)
        : 0,
      bestTorment: best,
      dailyBest: scores,
      runHistory: history,
    };
  }
  function run(prior = {}) {
    const seed = integer(prior.seed, 4294967295);
    let challenge =
      prior.daily && /^\d{4}-\d{2}-\d{2}$/.test(prior.daily.date || "")
        ? daily(prior.daily.date)
        : null;
    // Existing daily runs retain their v72 hero/seed/modifier when the pool expands.
    if (challenge && heroes.includes(prior.daily.hero) && ["relentless", "haunted", "blood-moon"].includes(prior.daily.modifier) && Number.isInteger(prior.daily.seed) && prior.daily.seed >= 0 && prior.daily.seed <= 4294967295)
      challenge = {date: prior.daily.date, seed: prior.daily.seed, hero: prior.daily.hero, modifier: prior.daily.modifier};
    return {
      id: String(prior.id || "").slice(0, 80),
      seed: challenge?.seed ?? seed,
      rng: integer(prior.rng ?? challenge?.seed ?? seed, 4294967295),
      random: !!prior.random || !!challenge,
      torment: integer(prior.torment, 10),
      gold: integer(prior.gold, 999999),
      daily: challenge,
      cause: String(prior.cause || "Crypt hazards").slice(0, 100),
      recorded: !!prior.recorded,
    };
  }
  function factors(run) {
    const t = integer(run?.torment, 10),
      m = run?.daily?.modifier;
    return {
      hp: (1 + 0.35 * t) * (m === "relentless" ? 1.2 : 1),
      damage: (1 + 0.12 * t) * (m === "blood-moon" ? 1.2 : 1),
      density: 1 + 0.065 * t,
      reward: 1 + 0.2 * t,
      elite: (0.006 + 0.002 * t) * (m === "haunted" ? 3 : 1),
      relic: 0.045 * t,
    };
  }
  // Authored pieces share a two-cell spine. Side rooms join that spine with a two-cell neck.
  const pieces = {
    hall: [
      [4, 6],
      [5, 8],
      [6, 6],
      [7, 7],
    ],
    side: [
      [4, 4],
      [5, 4],
      [6, 3],
      [6, 4],
    ],
  };
  // New zone-specific authored dimensions retain the old seeded pieces for Floors 1–5.
  const deepPieces={cathedral:{hall:[[6,8],[7,10],[5,9],[7,7]],side:[[6,4],[5,5],[7,4]]},forge:{hall:[[5,6],[7,8],[6,7],[7,6]],side:[[5,4],[6,3],[7,4]]}};
  function layout(base, seed, floor) {
    const roll = random(hash(seed + ":floor:" + floor)),
      pick = (key) => {const choices=(floor>5&&deepPieces[base.deepZone]||pieces)[key];return choices[Math.floor(roll()*choices.length)];};
    const a = pick("hall"),
      b = pick("hall"),
      c = pick("side"),
      d = pick("side"),
      e = pick("side");
    const rooms = [
      [2, 7, 6, 6],
      [10, 9 - Math.floor(a[1] / 2), a[0], a[1]],
      [19, 9 - Math.floor(b[1] / 2), Math.min(5, b[0]), b[1]],
      base.rooms[3].slice(),
      [10, 1, c[0], c[1]],
      [19, 16, Math.min(5, d[0]), d[1]],
      [2, 16, e[0], e[1]],
    ];
    const links = [
      [8, 9, 2, 2],
      [10 + a[0], 9, 19 - 10 - a[0], 2],
      [19 + rooms[2][2], 9, 25 - 19 - rooms[2][2], 2],
      [11, 1 + c[1], 2, rooms[1][1] - 1 - c[1]],
      [20, rooms[2][1] + b[1], 2, 16 - rooms[2][1] - b[1]],
      [4, 13, 2, 3],
    ].filter((r) => r[2] > 0 && r[3] > 0);
    return { ...base, rooms, links };
  }
  function secret(seed, floor) {
    if (floor === 1) return null;
    const roll = random(hash(seed + ":secret:" + floor));
    return roll() < 0.55
      ? {
          room: [-2, 8, 3, 4],
          neck: [1, 9, 1, 2],
          mouth: { x: 160, y: 800 },
          reward: { x: -40, y: 800 },
          revealed: false,
          used: false,
        }
      : null;
  }
  function score(row) {
    return (
      integer(row.kills) +
      integer(row.floor) * 500 +
      integer(row.bosses) * 1000 +
      (row.clear ? 5000 : 0)
    );
  }
  function record(p, r, row) {
    const item = {
      id: r.id,
      hero: row.hero,
      mode: row.mode,
      torment: r.torment,
      floor: row.floor,
      time: Math.floor(row.time),
      kills: row.kills,
      cause: row.cause,
      date: new Date().toISOString(),
      daily: r.daily?.date || "",
      score: score(row),
    };
    const at = p.runHistory.findIndex((h) => h.id === r.id);
    if (at >= 0) p.runHistory.splice(at, 1);
    p.runHistory.unshift(item);
    p.runHistory = p.runHistory.slice(0, 20);
    if (r.daily)
      p.dailyBest[r.daily.date] = Math.max(
        p.dailyBest[r.daily.date] || 0,
        item.score,
      );
    if (row.clear)
      p.bestTorment[row.hero] = Math.max(
        p.bestTorment[row.hero] || 0,
        r.torment,
      );
    if (row.clear && row.mode === "descent") {
      if (!p.descentCleared) p.randomLayouts = true;
      p.descentCleared = true;
      p.bestTorment[row.hero] = Math.max(
        p.bestTorment[row.hero] || 0,
        r.torment,
      );
    }
    return item;
  }
  window.EmberEndgame = Object.freeze({
    hash,
    random,
    date,
    daily,
    profile,
    run,
    factors,
    layout,
    secret,
    score,
    record,
    pieces,
  });
})();
