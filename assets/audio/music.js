/* Original procedural score. Fixed loops, bounded sources, independent of game time/RNG. */
(() => {
  "use strict";
  const states = new WeakMap(),
    TAU = Math.PI * 2;
  let scene = "menu",
    zone = 0,
    near = 0,
    boss = false,
    enabled = true,
    unlocked = false;
  function buffer(ctx, kind) {
    const seconds = kind.startsWith("sting") ? 1.4 : 8,
      rate = 16000,
      b = ctx.createBuffer(1, seconds * rate, rate),
      a = b.getChannelData(0);
    let seed = 937,
      low = 0;
    const z = kind === "frost" ? 1 : kind === "venom" ? 2 : kind === "cathedral" ? 3 : kind === "forge" ? 4 : 0;
    for (let i = 0; i < a.length; i++) {
      const t = i / rate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      low += 0.025 * (noise - low);
      const edge = Math.min(1, t / 0.035, (seconds - t) / 0.05);
      let v = 0;
      if (kind === "combat" || kind === "boss") {
        const beat = t % (kind === "boss" ? 0.4 : 0.8),
          env = Math.exp(-beat * 22);
        v =
          Math.sin(TAU * (kind === "boss" ? 58 : 83) * beat) * env * 0.26 +
          noise * Math.exp(-((t + 0.2) % 0.8) * 45) * 0.045;
      } else if (kind.startsWith("sting")) {
        const f =
          {
            stingLevel: 330,
            stingClear: 220,
            stingVictory: 440,
            stingDeath: 110,
          }[kind] || 220;
        v =
          (Math.sin(TAU * f * t) +
            Math.sin(TAU * f * 1.5 * t) * 0.45 +
            Math.sin(TAU * f * 2 * t) * 0.3) *
          Math.exp(-t * 3) *
          0.12;
      } else {
        const root = kind === "menu" ? 110 : [55, 82, 65, 73.5, 49][z];
        v =
          (Math.sin(TAU * root * t) +
            0.4 * Math.sin(TAU * root * 1.5 * t) +
            0.23 * Math.sin(TAU * root * 2 * t)) *
          0.1 *
          (0.85 + 0.15 * Math.sin((TAU * t) / 8));
        v += low * (z === 1 ? 0.5 : 0.3);
        if (z === 1)
          v += Math.sin(TAU * 659 * t) * Math.exp(-(t % 2) * 3) * 0.028;
        if (z === 2)
          v +=
            Math.sin(TAU * (420 * t + 12 * Math.sin(t * TAU))) *
            Math.exp(-(t % 0.75) * 18) *
            0.04;
        if (z === 0 && kind !== "menu")
          v += noise * Math.exp(-(t % 0.37) * 80) * 0.018;
        if(z===3)v+=Math.sin(TAU*root*3*t)*.035*Math.sin(TAU*t/8)+Math.sin(TAU*587*t)*Math.exp(-(t%1.6)*12)*.017;
        if(z===4)v+=noise*Math.exp(-(t%.5)*30)*.032+Math.sin(TAU*98*t)*Math.exp(-(t%.8)*14)*.05;
        if (kind === "menu")
          v +=
            Math.sin(
              TAU *
                [220, 261.6, 329.6, 293.6, 220, 196, 164.8, 196][
                  Math.floor(t)
                ] *
                t,
            ) *
            Math.exp(-(t % 1) * 4) *
            0.05;
      }
      a[i] = v * edge;
    }
    return b;
  }
  function ensure(ctx) {
    if (!ctx || ctx.state === "closed") return null;
    if (states.has(ctx)) return states.get(ctx);
    const master = ctx.createGain(),
      compressor = ctx.createDynamicsCompressor();
    master.gain.value = 0;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;
    const s = {
      master,
      compressor,
      buffers: new Map(),
      sources: [],
      gains: {},
      last: "",
      stings: new Set(),
      events: 0,
    };
    states.set(ctx, s);
    return s;
  }
  function ramp(g, value, ctx, duration = 0.7) {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(value, t + duration);
  }
  function unlock(ctx) {
    unlocked = true;
    ensure(ctx);
    update(ctx, {});
  }
  function stopLoops(s, ctx) {
    for (const [n, g] of s.retired || [])
      try {
        n.stop();
        n.disconnect();
        g.disconnect();
      } catch {}
    const retired = new Map();
    s.retired = retired;
    const gains = Object.values(s.gains);
    s.sources.forEach((n, i) => {
      const g = gains[i];
      retired.set(n, g);
      ramp(g, 0, ctx, 0.2);
      n.onended = () => {
        retired.delete(n);
        n.disconnect();
        g.disconnect();
      };
      try {
        n.stop(ctx.currentTime + 0.25);
      } catch {}
    });
    s.sources = [];
    s.gains = {};
  }
  function update(ctx, o) {
    if (o.scene !== undefined) scene = o.scene;
    if (o.zone !== undefined) zone = o.zone;
    if (o.near !== undefined) near = o.near;
    if (o.boss !== undefined) boss = o.boss;
    if (o.enabled !== undefined) enabled = o.enabled;
    if (o.lock) unlocked = false;
    const s = ctx && states.get(ctx);
    if (!s) return;
    const audible =
      enabled &&
      unlocked &&
      ctx.state === "running" &&
      scene !== "pause" &&
      !document.hidden;
    const key =
      scene === "menu" ? "menu" : ["ash", "frost", "venom", "cathedral", "forge"][zone] || "ash";
    if (audible && s.last !== key) {
      stopLoops(s, ctx);
      s.last = key;
      for (const kind of scene === "menu" ? [key] : [key, "combat", "boss"]) {
        if (!s.buffers.has(kind)) s.buffers.set(kind, buffer(ctx, kind));
        const n = ctx.createBufferSource(),
          g = ctx.createGain();
        n.buffer = s.buffers.get(kind);
        n.loop = true;
        g.gain.value = 0;
        n.connect(g);
        g.connect(s.master);
        n.start();
        s.sources.push(n);
        s.gains[kind] = g;
      }
    }
    // Avoid rescheduling ramps every frame; only react to meaningful intensity changes.
    const intensity = Math.min(1, Math.floor(near / 3) / 4),
      target = (audible ? 1 : 0) + ":" + key + ":" + intensity + ":" + boss;
    if (s.target !== target) {
      s.target = target;
      ramp(s.master, audible ? 0.38 : 0, ctx, 0.25);
      if (s.gains[key]) ramp(s.gains[key], 1, ctx);
      if (s.gains.combat)
        ramp(
          s.gains.combat,
          scene === "play" && !boss ? intensity * 0.55 : 0,
          ctx,
        );
      if (s.gains.boss)
        ramp(s.gains.boss, scene === "play" && boss ? 0.7 : 0, ctx);
    }
  }
  function sting(ctx, kind) {
    const s = ctx && states.get(ctx);
    if (
      !s ||
      !["Level", "Clear", "Victory", "Death"].includes(kind) ||
      !enabled ||
      !unlocked ||
      scene === "pause" ||
      document.hidden ||
      ctx.state !== "running" ||
      s.stings.size >= 3
    )
      return false;
    const key = "sting" + kind;
    if (!s.buffers.has(key)) s.buffers.set(key, buffer(ctx, key));
    const n = ctx.createBufferSource();
    n.buffer = s.buffers.get(key);
    n.connect(s.master);
    s.stings.add(n);
    n.onended = () => {
      s.stings.delete(n);
      n.disconnect();
    };
    n.start();
    s.events++;
    return true;
  }
  function stats(ctx) {
    const s = ctx && states.get(ctx);
    return {
      loops: (s?.sources.length || 0) + (s?.retired?.size || 0),
      stings: s?.stings.size || 0,
      events: s?.events || 0,
      scene,
      zone,
      near,
      boss,
      enabled,
      unlocked,
      buffers: s?.buffers.size || 0,
      musicLevel: s?.master.gain.value || 0,
      combatLevel: s?.gains.combat?.gain.value || 0,
      bossLevel: s?.gains.boss?.gain.value || 0,
    };
  }
  window.EmberMusic = Object.freeze({ ensure, unlock, update, sting, stats });
})();
