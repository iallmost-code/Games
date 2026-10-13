// Original authored pose sequences. Presentation only; attack clocks and hitboxes stay in the game.
(() => {
  "use strict";
  const sheets = new Map(),
    extensions = new Map(),
    extensionPending = new Set(),
    extensionFailed = new Set(),
    turns = new WeakMap(),
    pending = new Set(),
    lastDraw = new Map(),
    deathStarted = new Map(),
    variants = new Map(),
    legacyColors = new WeakMap();
  // Hero-select portraits keep using the legacy sheets. Retain extensions for
  // only the two most recently used heroes, rather than all seven atlas sets.
  const extensionLimit = 2;
  // Six columns / five rows; authored transparent gutters are not perfectly uniform.
  const authoredCuts = {
    rogue: {
      size: [1374, 1145],
      rows: [0, 244, 478, 722, 934, 1145],
      cols: [
        [0, 255, 478, 690, 910, 1130, 1374],
        [0, 260, 478, 708, 936, 1156, 1374],
        [0, 254, 471, 696, 926, 1134, 1374],
        [0, 256, 454, 694, 872, 1150, 1374],
        [0, 234, 464, 656, 877, 1100, 1374],
      ],
    },
    frostwarden: {
      size: [1374, 1145],
      rows: [0, 254, 477, 709, 934, 1145],
      cols: [
        [0, 239, 456, 686, 914, 1140, 1374],
        [0, 234, 464, 685, 910, 1140, 1374],
        [0, 244, 474, 699, 922, 1146, 1374],
        [0, 247, 462, 731, 956, 1170, 1374],
        [0, 234, 437, 681, 918, 1139, 1374],
      ],
    },
  };
  function cell(kind, index, width, height) {
    if (index >= 30) return extensionCell(index - 30);
    const cuts = authoredCuts[kind],
      row = Math.floor(index / 6),
      col = index % 6;
    if (!cuts)
      return {
        sx: (col * width) / 6,
        sy: (row * height) / 5,
        sw: width / 6,
        sh: height / 5,
      };
    const x = width / cuts.size[0],
      y = height / cuts.size[1];
    return {
      sx: cuts.cols[row][col] * x,
      sy: cuts.rows[row] * y,
      sw: (cuts.cols[row][col + 1] - cuts.cols[row][col]) * x,
      sh: (cuts.rows[row + 1] - cuts.rows[row]) * y,
    };
  }
  function decodeNewHero(kind, image) {
    const probe = document.createElement("canvas");
    probe.width = image.naturalWidth;
    probe.height = image.naturalHeight;
    const g = probe.getContext("2d", { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const px = g.getImageData(0, 0, probe.width, probe.height).data,
      cells = [];
    for (let i = 0; i < 30; i++) {
      const r = cell(kind, i, probe.width, probe.height);
      let foot = 0,
        top = r.sh,
        left = r.sw,
        right = 0;
      for (let y = 0; y < r.sh; y++)
        for (let x = 0; x < r.sw; x++) {
          if (px[((r.sy + y) * probe.width + r.sx + x) * 4 + 3] > 90) {
            foot = y;
            top = Math.min(top, y);
            left = Math.min(left, x);
            right = Math.max(right, x);
          }
        }
      cells.push({
        ...r,
        foot,
        height: foot - top + 1,
        width: right - left + 1,
      });
    }
    const standing = cells
      .slice(0, 18)
      .map((r) => r.foot)
      .sort((a, b) => a - b)[9];
    const scale = Math.min(
      170 / Math.max(1, standing),
      186 / Math.max(...cells.map((r) => r.height)),
      220 / Math.max(...cells.map((r) => r.width)),
    );
    const frames = cells.map((r) => {
      const tile = document.createElement("canvas");
      tile.width = 224;
      tile.height = 192;
      tile
        .getContext("2d")
        .drawImage(
          image,
          r.sx,
          r.sy,
          r.sw,
          r.sh,
          112 - (r.sw * scale) / 2,
          188 - r.foot * scale,
          r.sw * scale,
          r.sh * scale,
        );
      return tile;
    });
    probe.width = probe.height = 1;
    sheets.set(kind, frames);
    pending.delete(kind);
  }
  function decode(kind, image) {
    if (authoredCuts[kind]) return decodeNewHero(kind, image);
    const cw = image.naturalWidth / 6,
      ch = image.naturalHeight / 5,
      probe = document.createElement("canvas");
    probe.width = image.naturalWidth;
    probe.height = image.naturalHeight;
    const g = probe.getContext("2d", { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const px = g.getImageData(0, 0, probe.width, probe.height).data,
      baseline = [];
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 6; col++) {
        let foot = 0;
        for (let y = 0; y < Math.floor(ch); y++)
          for (
            let x = row === 4 && col >= 3 ? 0 : Math.floor(cw * 0.23);
            x < (row === 4 && col >= 3 ? cw : cw * 0.77);
            x++
          ) {
            const index =
              (Math.floor(row * ch + y) * probe.width +
                Math.floor(col * cw + x)) *
              4;
            if (px[index + 3] > 90) foot = y;
          }
        baseline.push(foot);
      }
    const standing = baseline.slice(0, 18).sort((a, b) => a - b)[9],
      scale = 170 / Math.max(1, standing),
      frames = [];
    for (let i = 0; i < 30; i++) {
      const tile = document.createElement("canvas");
      tile.width = 224;
      tile.height = 192;
      const c = tile.getContext("2d"),
        row = Math.floor(i / 6),
        col = i % 6;
      const foot = baseline[i];
      c.drawImage(
        image,
        col * cw,
        row * ch,
        cw,
        ch,
        112 - (cw * scale) / 2,
        188 - foot * scale,
        cw * scale,
        ch * scale,
      );
      frames.push(tile);
    }
    probe.width = probe.height = 1;
    sheets.set(kind, frames);
    pending.delete(kind);
  }
  function load(kind) {
    if (sheets.has(kind) || pending.has(kind)) return;
    pending.add(kind);
    let fallback = false;
    const image = new Image();
    image.onload = () => {
      try {
        decode(kind, image);
      } catch {
        pending.delete(kind);
      }
    };
    image.onerror = () => {
      if (!fallback) {
        fallback = true;
        image.src = "assets/cinematic/" + kind + "-animation.png";
      } else pending.delete(kind);
    };
    image.src = "assets/cinematic/" + kind + "-animation.webp";
  }
  function extensionCell(index) {
    return { sx: (index % 6) * 224, sy: Math.floor(index / 6) * 192, sw: 224, sh: 192 };
  }
  function touchExtension(kind) {
    const frames = extensions.get(kind);
    if (frames) {
      extensions.delete(kind);
      extensions.set(kind, frames);
    }
    return frames;
  }
  function evictExtension() {
    const oldest = extensions.keys().next().value;
    extensions.delete(oldest);
    for (const key of variants.keys()) {
      if (key.startsWith(oldest + ":")) variants.delete(key);
    }
    // Eviction is an ordinary cache miss; it must remain reloadable. Neither
    // failures nor gameplay objects are written here.
  }
  function decodeExtension(kind, image) {
    // Authored extensions already share the legacy frame's foot anchor. No
    // per-frame trimming, re-scaling or physics coordinates are involved.
    if (image.naturalWidth !== 1344 || image.naturalHeight !== 1344)
      throw Error("Invalid hero extension dimensions");
    const frames = Array(42).fill(null);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < (row < 2 ? 6 : 4); col++) {
        const index = row * 6 + col, r = extensionCell(index),
          tile = document.createElement("canvas");
        tile.width = 224;
        tile.height = 192;
        tile.getContext("2d").drawImage(image, r.sx, r.sy, r.sw, r.sh, 0, 0, 224, 192);
        frames[index] = tile;
      }
    }
    while (extensions.size >= extensionLimit) evictExtension();
    extensions.set(kind, frames);
  }
  function loadExtension(kind) {
    if (!kind || touchExtension(kind) || extensionPending.has(kind) || extensionFailed.has(kind)) return;
    extensionPending.add(kind);
    const image = new Image();
    let fallback = false;
    const fail = () => {
      if (!fallback) {
        fallback = true;
        image.src = "assets/cinematic/living-crypt/heroes/" + kind + ".png";
      } else {
        extensionPending.delete(kind);
        extensionFailed.add(kind);
      }
    };
    image.onload = () => {
      try {
        decodeExtension(kind, image);
        extensionPending.delete(kind);
      } catch { fail(); }
    };
    image.onerror = fail;
    image.src = "assets/cinematic/living-crypt/heroes/" + kind + ".webp";
  }
  // No argument preserves eager legacy readiness for portraits/tests. A hero
  // argument additionally requests only that hero's optional, evictable atlas.
  function ensure(kind) {
    if (kind) {
      load(kind);
      loadExtension(kind);
      return;
    }
    for (const kind of [
      "gravecaller",
      "bloodknight",
      "ranger",
      "sunwarden",
      "ember",
      "rogue",
      "frostwarden",
    ])
      load(kind);
  }

  function directions(dir = { x: 0, y: 1 }, isometric = true) {
    const x = Number.isFinite(dir.x) ? dir.x : 0,
      y = Number.isFinite(dir.y) ? dir.y : 1;
    if (!isometric) {
      const side = Math.abs(x) > Math.abs(y) * 0.72;
      return { name: side ? "side" : y < -0.15 ? "up" : "down",
        row: side ? 1 : y < -0.15 ? 2 : 0, flip: side && x < 0 };
    }
    const octant = Math.hypot(x, y) < 0.0001 ? 2 :
      (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8;
    if (octant === 1 || octant === 3)
      return { name: "down-diagonal", row: 5, flip: octant === 3 };
    if (octant === 5 || octant === 7)
      return { name: "up-diagonal", row: 6, flip: octant === 5 };
    return { name: octant === 2 ? "down" : octant === 6 ? "up" : "side",
      row: octant === 2 ? 0 : octant === 6 ? 2 : 1, flip: octant === 4 };
  }
  function reducedFrames(quality) {
    return quality === "low" || quality === "Low" ||
      (quality && (quality.maxAtmosphere ?? 32) < 16);
  }

  function choose(o) {
    const dir = o.direction || { x: 0, y: 1 },
      side = Math.abs(dir.x) > Math.abs(dir.y) * 0.72;
    let row = side ? 1 : dir.y < -0.15 ? 2 : 0,
      col = 0,
      flip = side && dir.x < 0;
    if (o.dead) {
      row = 4;
      col = 3 + Math.min(2, Math.floor(Math.max(0, o.deathProgress || 0) * 3));
      flip = false;
    } else if (o.hit > 0) {
      row = 4;
      col = Math.min(2, Math.floor((1 - o.hit) * 3));
      flip = false;
    } else if (o.cast > 0.025) {
      row = 3;
      const duration =
        o.kind === "bloodknight"
          ? 0.24
          : o.kind === "frostwarden"
            ? 0.28
            : 0.18;
      col = Math.min(
        5,
        Math.max(0, Math.floor((1 - Math.min(1, o.cast / duration)) * 6)),
      );
      flip = dir.x < 0;
    } else if (o.moving)
      col = Math.floor(
        ((((o.phase || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) /
          ((Math.PI * 2) / 6),
      );
    // Unmodified callers retain the original 30-pose selection contract.
    // A failed/missing optional sheet also follows that exact fallback path.
    if (o.isometric !== undefined && extensions.has(o.kind) &&
        !o.dead && !(o.hit > 0) && !(o.cast > 0.025)) {
      const facing = directions(dir, !!o.isometric);
      flip = facing.flip;
      if (!o.moving) {
        const idleRow = facing.name === "down-diagonal" ? 5 :
          facing.name === "up-diagonal" ? 6 : facing.row + 2;
        const now = Number.isFinite(o.clock) ? o.clock : 0;
        row = idleRow + 5;
        col = Math.floor((((now % 1.8) + 1.8) % 1.8) / (1.8 / 4));
      } else if (facing.name.endsWith("diagonal")) {
        row = facing.name === "down-diagonal" ? 5 : 6;
      } else row = facing.row;
      if (o.moving && reducedFrames(o.quality)) col -= col % 2;
    }
    return { index: row * 6 + col, row, col, flip };
  }
  function tint(image, variant) {
    if (!image || !variant) return image;
    let cache = legacyColors.get(image);
    if (!cache) {
      cache = new Map();
      legacyColors.set(image, cache);
    }
    if (cache.has(variant)) return cache.get(variant);
    try {
      const c = document.createElement("canvas");
      c.width = image.naturalWidth || image.width;
      c.height = image.naturalHeight || image.height;
      const g = c.getContext("2d");
      g.drawImage(image, 0, 0);
      const data = g.getImageData(0, 0, c.width, c.height),
        p = data.data,
        palette = variant === 1 ? [168, 197, 220] : [220, 166, 99];
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const grey = p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722;
        for (let n = 0; n < 3; n++)
          p[i + n] = p[i + n] * 0.4 + ((grey * palette[n]) / 190) * 0.6;
      }
      g.putImageData(data, 0, 0);
      c.naturalWidth = c.width;
      c.naturalHeight = c.height;
      c.cinematic = image.cinematic;
      cache.set(variant, c);
      return c;
    } catch {
      return image;
    }
  }
  function frame(kind, index = 0, variant = 0) {
    const original = index < 30 ? sheets.get(kind)?.[index] : touchExtension(kind)?.[index - 30];
    if (!original) return null;
    if (!variant) return original;
    const key = kind + ":" + variant;
    if (!variants.has(key)) {
      if (variants.size >= 2) variants.delete(variants.keys().next().value);
      variants.set(key, new Map());
    }
    const colored = variants.get(key);
    if (!colored.has(index)) {
      const palette = variant === 1 ? [168, 197, 220] : [220, 166, 99],
        c = document.createElement("canvas");
      c.width = original.width;
      c.height = original.height;
      const g = c.getContext("2d");
      g.drawImage(original, 0, 0);
      const image = g.getImageData(0, 0, c.width, c.height), p = image.data;
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const grey = p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722;
        for (let n = 0; n < 3; n++)
          p[i + n] = p[i + n] * 0.4 + ((grey * palette[n]) / 190) * 0.6;
      }
      g.putImageData(image, 0, 0);
      colored.set(index, c);
    }
    return colored.get(index);
  }
  function turnPose(o, selected) {
    const actor = o.actor;
    if (!actor || (typeof actor !== "object" && typeof actor !== "function") ||
        o.isometric === undefined || !extensions.has(o.kind)) return null;
    const now = Number.isFinite(o.clock) ? o.clock : performance.now() / 1000,
      facing = directions(o.direction, !!o.isometric),
      key = o.kind + ":" + facing.name + ":" + facing.flip;
    let state = turns.get(actor);
    if (!state || now < state.lastClock) {
      state = { key, selected, since: now, lastClock: now, from: null };
      turns.set(actor, state);
    } else if (key !== state.key) {
      state.from = state.selected;
      state.since = now;
      state.key = key;
    }
    state.selected = selected;
    state.lastClock = now;
    if (o.dead || o.hit > 0 || o.cast > 0.025) state.from = null;
    const progress = Math.min(1, Math.max(0, (now - state.since) / 0.1));
    if (!state.from || progress >= 1) {
      state.from = null;
      return null;
    }
    return { from: state.from, alpha: progress * progress * (3 - 2 * progress) };
  }
  function drawPose(ctx, o, selected, alpha, size) {
    const image = frame(o.kind, selected.index, o.variant || 0);
    if (!image) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (selected.flip) ctx.scale(-1, 1);
    window.EmberPresence?.heroEdge(ctx, image, -112 * size, -188 * size, 224 * size, 192 * size);
    ctx.drawImage(image, -112 * size, -188 * size, 224 * size, 192 * size);
    ctx.restore();
  }
  function draw(ctx, o) {
    if (o.isometric !== undefined) loadExtension(o.kind);
    const frames = sheets.get(o.kind);
    if (!frames) return false;
    if (o.dead) {
      if (!deathStarted.has(o.kind))
        deathStarted.set(o.kind, performance.now());
      o = {
        ...o,
        deathProgress: Math.min(
          1,
          (performance.now() - deathStarted.get(o.kind)) / 650,
        ),
      };
    } else deathStarted.delete(o.kind);
    const selected = choose(o);
    const blend = turnPose(o, selected);
    ctx.save();
    const recoil = window.EmberCombatFeel?.pose(o);
    if(recoil){ctx.translate(recoil.x,recoil.y);ctx.rotate(recoil.rotation);ctx.scale(recoil.scaleX,recoil.scaleY);}
    const size = o.height / 192;
    if (blend) drawPose(ctx, o, blend.from, 1 - blend.alpha, size);
    drawPose(ctx, o, selected, blend ? blend.alpha : 1, size);
    ctx.restore();
    lastDraw.set(o.kind, selected);
    return true;
  }
  window.EmberHeroAnimation = {
    ensure,
    draw,
    choose,
    frame,
    cell,
    extensionCell,
    directions,
    tint,
    ready: (kind) => sheets.has(kind),
    extensionReady: (kind) => extensions.has(kind),
    diagnostics: () => ({
      loaded: [...sheets.keys()],
      frames: [...sheets.values()].reduce((n, f) => n + f.length, 0),
      extensions: [...extensions.keys()],
      extensionLimit,
      extensionFrames: [...extensions.values()].reduce((n, f) => n + f.filter(Boolean).length, 0),
      extensionPending: [...extensionPending],
      extensionFailed: [...extensionFailed],
      variantSets: variants.size,
      variantFrames: [...variants.values()].reduce((n, f) => n + f.size, 0),
      lastDraw: Object.fromEntries(lastDraw),
    }),
  };
})();
