/* Additive, slot-owned hero mastery. No global storage or combat RNG. */
(() => {
  "use strict";
  const heroes = [
    "gravecaller",
    "ranger",
    "ember",
    "bloodknight",
    "sunwarden",
    "rogue",
    "frostwarden",
  ];
  const int = (value, max = 1000000) =>
    Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  function goal(level) {
    return level <= 1
      ? 0
      : Math.round(120 * Math.pow(Math.min(20, level) - 1, 1.45));
  }
  function level(xp) {
    let rank = 1;
    while (rank < 20 && xp >= goal(rank + 1)) rank++;
    return rank;
  }
  function normalize(prior) {
    const mastery = {};
    for (const hero of heroes) {
      const item = prior?.mastery?.[hero] || {},
        xp = int(item.xp, goal(20));
      mastery[hero] = {
        xp,
        color: int(item.color, level(xp) >= 16 ? 2 : level(xp) >= 8 ? 1 : 0),
      };
    }
    const masteryClaims = Object.fromEntries(
      Object.entries(prior?.masteryClaims || {})
        .filter(([id]) => /^[a-z0-9-]{1,100}$/i.test(id))
        .slice(-64)
        .map(([id, credit]) => [id, int(credit)]),
    );
    return { mastery, masteryClaims };
  }
  function perks(rank) {
    return { rerolls: rank >= 10 ? 1 : 0, token: rank >= 20 };
  }
  function earned(floors, bosses, kills, torment = 0) {
    return Math.floor(
      (int(floors) * 80 + int(bosses) * 50 + Math.floor(int(kills) / 8)) *
        (1 + 0.1 * int(torment, 10)),
    );
  }
  function grant(profile, hero, id, total) {
    if (!heroes.includes(hero) || !/^[a-z0-9-]{1,100}$/i.test(id)) return 0;
    const previous = Object.hasOwn(profile.masteryClaims, id)
      ? int(profile.masteryClaims[id])
      : 0;
    const delta = Math.max(0, int(total) - previous);
    profile.masteryClaims = Object.fromEntries(
      [
        ...Object.entries(profile.masteryClaims).filter(([key]) => key !== id),
        [id, Math.max(previous, int(total))],
      ].slice(-64),
    );
    profile.mastery[hero].xp = Math.min(
      goal(20),
      profile.mastery[hero].xp + delta,
    );
    return delta;
  }
  window.EmberMastery = Object.freeze({
    heroes,
    goal,
    level,
    normalize,
    perks,
    earned,
    grant,
  });
})();
