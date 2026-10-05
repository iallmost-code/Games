/* Cosmetic scenery for every zone/mode. Layouts and RNG remain owned by gameplay. */
(() => {
  "use strict";
  const palettes = [
      ["#a94123", "#bc5c2f"],
      ["#285065", "#9adbea"],
      ["#223d25", "#99ba66"],
    ],
    names = ["ash", "frost", "venom"];
  const caches = new Map();
  let lastCells = null,
    lastLinks = null,
    layout = null;
  const diagnostics = { zone: null, props: 0, voids: 0 };
  const hash = (x, y) =>
    ((Math.imul(x + 17, 73856093) ^ Math.imul(y + 13, 19349663)) >>> 0) /
    4294967296;
  function active(s) {
    return !!s?.hero && s.isometric && !(s.isDescent && s.floor === 1);
  }
  function limits(s) {
    const n = s.quality?.maxAtmosphere ?? 32;
    return {
      props: n >= 32 ? 18 : n >= 16 ? 12 : 6,
      ground: n >= 32 ? 112 : n >= 16 ? 72 : 40,
      voids: n >= 32 ? 28 : n >= 16 ? 18 : 10,
    };
  }
  function getLayout(s) {
    if (!s.isDescent) return null;
    if (layout && lastCells === s.dungeon.cells && lastLinks === s.links)
      return layout;
    lastCells = s.dungeon.cells;
    lastLinks = s.links;
    const voids = new Set(),
      props = [];
    for (const [x, y, w, h] of s.links || [])
      for (let cx = x - 1; cx <= x + w; cx++)
        for (let cy = y - 1; cy <= y + h; cy++) {
          if (voids.size >= 28) break;
          const key = cx + "," + cy;
          if (
            cx === 24 ||
            lastCells.has(key) ||
            ![
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ].some(
              ([dx, dy]) =>
                cx + dx >= x &&
                cx + dx < x + w &&
                cy + dy >= y &&
                cy + dy < y + h,
            )
          )
            continue;
          voids.add(key);
        }
    for (const [x, y, w, h] of s.rooms || [])
      for (const [dx, dy, kind] of [
        [0.35, 0.4, "column"],
        [w - 0.35, h - 0.4, "bones"],
        [w - 0.5, 0.4, "statue"],
        [0.4, h - 0.4, "chain"],
        [w - 0.7, h * 0.5, "brazier"],
        [0.7, h * 0.5, "coffin"],
        [w * 0.5, 0.3, "arch"],
      ])
        props.push({
          x: (x + dx) * 80,
          y: (y + dy) * 80,
          kind,
          height: kind === "bones" ? 32 : kind === "chain" ? 108 : 100,
        });
    return (layout = { voids, props });
  }
  function lowerVoid(cx, cy, s) {
    return active(s) && !!getLayout(s)?.voids.has(cx + "," + cy);
  }
  function texture(zone) {
    if (caches.has(zone)) return caches.get(zone);
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d"),
      p = palettes[zone];
    g.fillStyle = zone === 1 ? "#12232b" : zone === 2 ? "#111e16" : "#100a09";
    g.fillRect(0, 0, 128, 128);
    const glow = g.createRadialGradient(64, 76, 3, 64, 76, 85);
    glow.addColorStop(0, p[0] + "cc");
    glow.addColorStop(1, p[0] + "00");
    g.fillStyle = glow;
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 12; i++) {
      const x = hash(i, zone) * 128,
        y = hash(i + 31, zone) * 128;
      g.strokeStyle = p[1] + "77";
      g.lineWidth = i % 3 ? 1 : 2;
      g.beginPath();
      if (zone === 2) g.ellipse(x, y, 9 + (i % 8), 4, 0, 0, 7);
      else {
        g.moveTo(x, y);
        g.lineTo(x + 12, y - 4);
        g.lineTo(x + 22, y + 6);
        g.lineTo(x + 31, y - 2);
      }
      g.stroke();
    }
    caches.set(zone, c);
    return c;
  }
  function props(s) {
    const d = getLayout(s);
    if (d) return d.props;
    const out = [];
    const cx = Math.floor(s.hero.x / 480),
      cy = Math.floor(s.hero.y / 480);
    for (let x = cx - 3; x <= cx + 3; x++)
      for (let y = cy - 3; y <= cy + 3; y++)
        out.push({
          x: x * 480 + 40 + hash(x, y) * 110,
          y: y * 480 + 70,
          kind: ["bones", "column", "chain", "statue", "coffin", "brazier"][
            (x + y + 102) % 6
          ],
          height: 75,
        });
    return out;
  }
  function ground(ctx, s) {
    if (!active(s)) return;
    const zone = s.zone ?? 0,
      l = limits(s),
      d = getLayout(s),
      tile = texture(zone);
    let used = 0;
    ctx.save();
    if (d)
      for (const key of d.voids) {
        const [x, y] = key.split(",").map(Number);
        if (used >= l.voids) break;
        if (!s.visiblePoint(x * 80 + 40, y * 80 + 40, 110)) continue;
        used++;
        ctx.globalAlpha = 0.75;
        ctx.drawImage(tile, x * 80, y * 80, 80, 80);
      }
    let marks = 0;
    for (const p of props(s)) {
      if (marks >= l.props || !s.visiblePoint(p.x, p.y, 120)) continue;
      marks++;
      ctx.globalAlpha = 0.22;
      const seal = s.art["prop-" + names[zone] + "-seal"];
      if (seal) ctx.drawImage(seal, p.x - 48, p.y - 28, 96, 56);
    }
    ctx.restore();
    diagnostics.zone = zone;
    diagnostics.voids = used;
  }
  function foreground(ctx, s) {
    if (!active(s)) return;
    const zone = s.zone ?? 0,
      l = limits(s);
    let used = 0;
    for (const p of props(s)) {
      if (used >= l.props) break;
      if (!s.visiblePoint(p.x, p.y, 150)) continue;
      const key = "prop-" + names[zone] + "-" + p.kind,
        img = s.art[key];
      if (!img) continue;
      used++;
      const width = Math.min(
          140,
          (p.height * img.naturalWidth) / img.naturalHeight,
        ),
        dx = p.x - s.hero.x,
        dy = p.y - s.hero.y,
        sx = (dx - dy) * Math.SQRT1_2,
        sy = (dx + dy) * Math.SQRT1_2 * 0.68,
        alpha =
          Math.abs(sx) < width * 0.5 + 28 && sy > -20 && sy < p.height + 28
            ? 0.18
            : 0.82;
      s.sceneItem(p.x, p.y, () => {
        ctx.save();
        ctx.globalAlpha = alpha;
        s.billboard(p.x, p.y, () => {
          if (p.kind === "chain") {
            ctx.translate(0, -p.height);
            ctx.rotate(Math.sin(s.clock * 0.65 + p.x) * 0.012);
            ctx.translate(0, p.height);
          }
          ctx.drawImage(img, -width / 2, -p.height, width, p.height);
        });
        ctx.restore();
      });
    }
    diagnostics.props = used;
  }
  window.EmberZones = Object.freeze({
    ground,
    foreground,
    lowerVoid,
    layout: (s) => getLayout(s),
    limits,
    diagnostics: () => ({ ...diagnostics }),
  });
})();
