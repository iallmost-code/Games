/* Living Crypt: decoded, distance-driven poses. All actor state lives in WeakMaps. */
(() => {
  "use strict";
  const kinds = ["ghoul", "runner", "brute", "caster", "skeleton", "sentinel",
    "wraith", "burrower", "frostGolem", "cinderImp", "sporeSpitter", "champion"];
  const sheets = new Map(), pending = new Set(), failed = new Set(), actors = new WeakMap();
  const anchor = Object.freeze({ x: .5, y: 156 / 160 });
  let serial = 0;
  function kindOf(e) { return e.type === "charger" ? "runner" : e.type; }
  function direction(d) {
    const x = d.x || 0, y = d.y || 0, side = Math.abs(x) > Math.abs(y) * .72;
    return { row: side ? 1 : y < -.001 ? 2 : 0, flip: side && x < 0 };
  }
  function observe(e, o = {}) {
    const clock = o.clock || 0;
    let s = actors.get(e);
    if (!s) {
      s = { x: e.x, y: e.y, clock, phase: (++serial * .61803398875) % 1,
        direction: direction(o.projectVector ? o.projectVector(e.faceX || 0, e.faceY ?? 1) : { x: e.faceX, y: e.faceY ?? 1 }),
        attack: e.attack, cast: e.cast, blink: e.blinkCd, burrow: e.burrow,
        attackUntil: -1, pose: "idle", moving: false };
      actors.set(e, s);
      return s;
    }
    if (clock === s.clock && e.x === s.x && e.y === s.y) return s;
    const elapsed = clock - s.clock, dx = e.x - s.x, dy = e.y - s.y,
      distance = Math.hypot(dx, dy), teleport = distance > Math.max(48, (e.speed || 100) * Math.max(0, elapsed) * 3);
    s.moving = elapsed > 0 && elapsed < .3 && distance > .025 && !teleport;
    if (s.moving) {
      // A whole authored stride spans ~three body radii; slowing/chasing walls slows the feet too.
      s.phase += distance / Math.max(40, (e.r || 16) * 3.2);
      s.direction = direction(o.projectVector ? o.projectVector(dx, dy) : { x: dx, y: dy });
    }
    const reset = (now, old) => Number.isFinite(now) && Number.isFinite(old) && now > old + .05;
    // Observe existing attack clocks, not a new attack timer in physics. Solar Flare's
    // cooldown suppression is not an attack. Burrow emergence is the projectile release.
    if (elapsed > 0 && !(e.solarBlindUntil > clock) &&
        (reset(e.attack, s.attack) || (["caster", "sporeSpitter"].includes(e.type) && reset(e.cast, s.cast)) ||
         (e.type === "wraith" && reset(e.blinkCd, s.blink)) ||
         (e.type === "burrower" && s.burrow > 0 && e.burrow <= 0))) {
      s.attackUntil = clock + .36;
      s.direction = direction(o.projectVector ? o.projectVector(e.faceX || 0, e.faceY ?? 1) : { x: e.faceX, y: e.faceY ?? 1 });
    }
    s.pose = e.hitFlash > 0 ? "hit" : clock < s.attackUntil ? "attack" : s.moving ? "walk" : "idle";
    s.x = e.x; s.y = e.y; s.clock = clock;
    s.attack = e.attack; s.cast = e.cast; s.blink = e.blinkCd; s.burrow = e.burrow;
    return s;
  }
  function choose(s, quality) {
    const low = (quality?.maxAtmosphere ?? 32) < 16;
    let row = s.row ?? s.direction?.row ?? 0, col = 0;
    if (s.pose === "attack") {
      row = 3; col = Math.min(5, Math.max(0, Math.floor((1 - (s.attackUntil - s.clock) / .36) * 6)));
    } else if (s.pose === "hit") {
      row = 4; col = s.hit > .09 ? 0 : 1;
    } else if (s.moving) {
      const phase = ((s.phase % 1) + 1) % 1;
      col = Math.floor(phase * (low ? 3 : 6)) * (low ? 2 : 1);
    }
    return { index: row * 6 + col, row, col, flip: s.direction?.flip ?? s.flip ?? false };
  }
  function decode(kind, image) {
    if (image.naturalWidth !== 864 || image.naturalHeight !== 960) throw Error("Invalid enemy atlas dimensions");
    const frames = [];
    for (let i = 0; i < 36; i++) {
      if (i >= 26 && i < 30) { frames.push(null); continue; }
      const c = document.createElement("canvas"); c.width = 144; c.height = 160;
      c.getContext("2d").drawImage(image, i % 6 * 144, Math.floor(i / 6) * 160, 144, 160, 0, 0, 144, 160);
      c.cinematic = true;
      frames.push(c);
    }
    sheets.set(kind, frames); pending.delete(kind);
  }
  function load(kind) {
    if (!kinds.includes(kind) || sheets.has(kind) || pending.has(kind) || failed.has(kind) || typeof Image === "undefined") return;
    pending.add(kind);
    const img = new Image(); let fallback = false;
    const retry = () => {
      if (!fallback) { fallback = true; img.src = "assets/cinematic/living-crypt/enemies/" + kind + ".png"; }
      else { pending.delete(kind); failed.add(kind); }
    };
    img.onload = () => { try { decode(kind, img); } catch { retry(); } };
    img.onerror = retry;
    img.src = "assets/cinematic/living-crypt/enemies/" + kind + ".webp";
  }
  function frame(kind, index) { return sheets.get(kind)?.[index] || null; }
  function sample(e, o) {
    const kind = kindOf(e); load(kind);
    const s = observe(e, o), pose = choose({ ...s, hit: e.hitFlash }, o?.quality), image = frame(kind, pose.index);
    return image ? { image, ...pose, anchor, phase: s.phase, pose: s.pose } : null;
  }
  function captureDeath(e, o) {
    const kind = kindOf(e);
    if (!sheets.has(kind)) return null;
    const s = observe(e, o);
    return Object.freeze({ kind, flip: s.direction.flip });
  }
  function deathFrame(capture, progress, quality) {
    if (!capture) return null;
    const low = (quality?.maxAtmosphere ?? 32) < 16;
    return frame(capture.kind, 30 + Math.min(low ? 4 : 5, Math.floor(Math.max(0, Math.min(.999, progress)) * (low ? 3 : 6)) * (low ? 2 : 1)));
  }
  function diagnostics() {
    return { loaded: [...sheets.keys()], pending: [...pending], failed: [...failed],
      decodedFrames: [...sheets.values()].reduce((n, a) => n + a.filter(Boolean).length, 0) };
  }
  window.EmberEnemyAnimation = { kinds, direction, observe, choose, load, sample, frame, captureDeath, deathFrame, anchor, diagnostics };
})();
