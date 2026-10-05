/* Transient visual feedback, on presentation time only. Never retained in saves. */
(() => {
  "use strict";
  const effects = [],
    tints = new WeakMap(),
    colors = ["#ed9b69", "#a7ddeb", "#b6d585"];
  let intro = null,
    lastStats = { effects: 0, particles: 0 };
  function tint(img, color) {
    let c = tints.get(img);
    if (!c) {
      c = new Map();
      tints.set(img, c);
    }
    if (!c.has(color)) {
      const tile = document.createElement("canvas");
      tile.width = img.naturalWidth || img.width;
      tile.height = img.naturalHeight || img.height;
      const g = tile.getContext("2d");
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = color;
      g.fillRect(0, 0, tile.width, tile.height);
      c.set(color, tile);
    }
    return c.get(color);
  }
  function limit(q) {
    return (q?.maxAtmosphere ?? 32) >= 32
      ? 24
      : (q?.maxAtmosphere ?? 32) >= 16
        ? 16
        : 8;
  }
  function emit(kind, o, q) {
    const now = performance.now();
    if (kind === "bossIntro") {
      intro = { name: o.name, at: now };
      return;
    }
    effects.push({
      ...o,
      kind,
      at: now,
      life: kind === "enemyDeath" ? 0.65 : kind === "level" ? 1.2 : 1,
    });
    while (effects.length > limit(q)) effects.shift();
  }
  function progress(e, now) {
    return Math.max(0, Math.min(1, (now - e.at) / (e.life * 1000)));
  }
  function draw(ctx, s) {
    const now = performance.now(),
      cap = limit(s.quality);
    while (effects.length > cap) effects.shift();
    let particles = 0;
    for (let i = effects.length - 1; i >= 0; i--)
      if (progress(effects[i], now) >= 1) effects.splice(i, 1);
    for (const e of effects) {
      if (!s.visiblePoint(e.x, e.y, 180)) continue;
      const t = progress(e, now),
        c = e.kind === "forge" ? "#ffd18b" : colors[e.zone ?? s.zone ?? 0];
      if (e.kind === "enemyDeath" && e.img) {
        const tone = tint(e.img, c);
        s.sceneItem(e.x, e.y, () =>
          s.billboard(e.x, e.y, () => {
            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.6;
            const h = e.height || 55,
              w = e.width || 36;
            for (let row = 0; row < 6; row++) {
              if (t > (row + 1) / 7) continue;
              ctx.drawImage(
                tone,
                0,
                (tone.height * row) / 6,
                tone.width,
                tone.height / 6,
                -w / 2,
                -h + (h * row) / 6,
                w,
                h / 6,
              );
            }
            ctx.restore();
          }),
        );
      } else if (e.kind === "chest") {
        s.sceneItem(e.x, e.y, () =>
          s.billboard(e.x, e.y, () => {
            ctx.save();
            ctx.globalAlpha = 1 - t;
            ctx.fillStyle = "#32281e";
            ctx.strokeStyle = "#c59b57";
            ctx.lineWidth = 2;
            ctx.fillRect(-23, -23, 46, 23);
            ctx.strokeRect(-23, -23, 46, 23);
            ctx.translate(0, -23);
            ctx.rotate(-Math.sin(t * Math.PI * 0.5) * 0.65);
            ctx.fillRect(-23, -10, 46, 10);
            ctx.strokeRect(-23, -10, 46, 10);
            ctx.restore();
          }),
        );
      } else if (e.kind === "level") {
        s.sceneItem(e.x, e.y, () =>
          s.billboard(e.x, e.y, () => {
            ctx.save();
            ctx.globalAlpha = Math.sin(t * Math.PI) * 0.5;
            ctx.fillStyle = "#ffeab5";
            ctx.fillRect(-9, -160 * (1 - t * 0.3), 18, 160 * (1 - t * 0.3));
            ctx.strokeStyle = "#fff7d7";
            ctx.lineWidth = 2;
            ctx.strokeRect(-14, -170, 28, 170);
            ctx.restore();
          }),
        );
      } else {
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.75;
        ctx.strokeStyle =
          e.kind === "well" ? "#9bdfe7" : e.kind === "door" ? "#ffdc91" : c;
        ctx.lineWidth = e.kind === "well" ? 2 : 3;
        ctx.beginPath();
        ctx.arc(
          e.x,
          e.y,
          12 + t * (e.kind === "bossDeath" ? 135 : 45),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }
      const count =
        s.quality.maxAtmosphere >= 32
          ? 12
          : s.quality.maxAtmosphere >= 16
            ? 6
            : 3;
      if (e.kind !== "chest")
        for (let k = 0; k < count; k++) {
          if (particles >= s.quality.maxAtmosphere * 2) break;
          particles++;
          const a = (k * Math.PI * 2) / count,
            d = (e.kind === "bossDeath" ? 125 : 38) * t;
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.65;
          ctx.fillStyle = c;
          ctx.fillRect(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 2, 2);
          ctx.restore();
        }
    }
    lastStats = { effects: effects.length, particles };
  }
  function hud(ctx, w, h) {
    if (!intro) return;
    const t = (performance.now() - intro.at) / 2200;
    if (t >= 1) {
      intro = null;
      return;
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 7, (1 - t) * 5);
    ctx.fillStyle = "#0a0c12d9";
    ctx.fillRect(w * 0.12, h * 0.25, w * 0.76, 46);
    ctx.strokeStyle = "#bd9a60";
    ctx.strokeRect(w * 0.12, h * 0.25, w * 0.76, 46);
    ctx.fillStyle = "#ffdda6";
    ctx.textAlign = "center";
    ctx.font = "bold 16px system-ui";
    ctx.fillText(intro.name, w / 2, h * 0.25 + 29);
    ctx.restore();
  }
  function cameraPush() {
    return intro
      ? -3 *
          Math.sin(Math.min(1, (performance.now() - intro.at) / 2200) * Math.PI)
      : 0;
  }
  function reset() {
    effects.length = 0;
    intro = null;
  }
  window.EmberMotion = Object.freeze({
    emit,
    draw,
    hud,
    tint,
    cameraPush,
    reset,
    stats: () => ({ ...lastStats, queued: effects.length, intro: !!intro }),
  });
})();
