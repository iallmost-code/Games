// Original authored pose sequences. Presentation only; attack clocks and hitboxes stay in the game.
(() => {
  "use strict";
  const sheets = new Map(),
    pending = new Set(),
    lastDraw = new Map(),
    deathStarted = new Map(),
    variants = new Map(),
    legacyColors = new WeakMap();
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
  function ensure() {
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
    const frames = sheets.get(kind);
    if (!frames) return null;
    if (!variant) return frames[index];
    const key = kind + ":" + variant;
    if (!variants.has(key)) {
      const palette = variant === 1 ? [168, 197, 220] : [220, 166, 99];
      const colored = frames.map((original) => {
        const c = document.createElement("canvas");
        c.width = original.width;
        c.height = original.height;
        const g = c.getContext("2d");
        g.drawImage(original, 0, 0);
        const image = g.getImageData(0, 0, c.width, c.height),
          p = image.data;
        for (let i = 0; i < p.length; i += 4) {
          if (!p[i + 3]) continue;
          const grey = p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722;
          for (let n = 0; n < 3; n++)
            p[i + n] = p[i + n] * 0.4 + ((grey * palette[n]) / 190) * 0.6;
        }
        g.putImageData(image, 0, 0);
        return c;
      });
      if (variants.size >= 2) variants.delete(variants.keys().next().value);
      variants.set(key, colored);
    }
    return variants.get(key)[index];
  }
  function draw(ctx, o) {
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
    ctx.save();
    if (selected.flip) ctx.scale(-1, 1);
    const size = o.height / 192;
    ctx.drawImage(
      frame(o.kind, selected.index, o.variant || 0),
      -112 * size,
      -188 * size,
      224 * size,
      192 * size,
    );
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
    tint,
    ready: (kind) => sheets.has(kind),
    diagnostics: () => ({
      loaded: [...sheets.keys()],
      frames: [...sheets.values()].reduce((n, f) => n + f.length, 0),
      lastDraw: Object.fromEntries(lastDraw),
    }),
  };
})();
