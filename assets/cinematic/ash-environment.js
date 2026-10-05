/* Ash Catacombs art pass. Render-only: world coordinates, collisions, saves and
 * combat RNG are deliberately never touched. All expensive paint is cached.
 * Integration: prepare(surface); ground(ctx, scene) after the dungeon floor;
 * foreground(ctx, scene) before the depth-sorted scene is flushed. */
(() => {
  "use strict";
  const TILE = 80, LIMIT = { ground: 112, lava: 28, trim: 36, props: 18 };
  // Authored Floor 1 bridge flanks only. These remain solid dungeon cells;
  // the renderer may show them as a lower magma shaft instead of raised walls.
  // Keep the locked boss doorway at (24,9)/(24,10) and room arrivals untouched.
  const bridgeVoid = [];
  for (const x of [8, 9, 16, 17, 23]) for (const y of [8, 11]) bridgeVoid.push([x, y]);
  for (const [xs, ys] of [[[11, 14], [5, 6]], [[19, 22], [13, 14]], [[3, 6], [13, 14]]])
    for (const x of xs) for (const y of ys) bridgeVoid.push([x, y]);
  const bridgeVoidKeys = new Set(bridgeVoid.map(([x, y]) => x + "," + y));
  const lowerVoid = (cx, cy) => bridgeVoidKeys.has(cx + "," + cy);
  let atlas = null, factory = null, lastCells = null, lastRooms = null, layout = null;
  const hash = (x, y = 0) => ((Math.imul(x + 7, 73856093) ^ Math.imul(y + 13, 19349663)) >>> 0) / 4294967296;
  const flag = value => typeof value === "function" ? value() : value;
  function active(scene) {
    return !!scene && flag(scene.isDescent) === true &&
      (scene.isometric === true || scene.rpgPreview === true) &&
      (scene.floor || scene.dungeon?.floor) === 1 && !!scene.hero;
  }
  function path(g, points, fill, stroke) {
    g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.stroke(); }
  }
  function canvas(width, height, paint) {
    const c = factory(width, height); paint(c.getContext("2d")); return c;
  }
  function stone(g, x, y, width, height, seed, face = false) {
    const inset = 2 + hash(seed, 5) * 2;
    path(g, [[x + inset, y + 2], [x + width - 3, y + 1],
      [x + width - 1, y + height - 3], [x + 2, y + height - 1]],
    face ? "#252320" : ["#393834", "#333431", "#403b34"][seed % 3], "#101413");
    g.strokeStyle = face ? "#8a76532a" : "#b5a58540"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + 4, y + height - 3); g.lineTo(x + 4, y + 4);
    g.lineTo(x + width - 4, y + 3); g.stroke();
    g.fillStyle = "#05090960"; g.fillRect(x + 3, y + height - 4, width - 6, 2);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#91877216" : "#080d0e30";
      g.fillRect(x + 5 + hash(seed, i + 10) * (width - 10), y + 5 + hash(seed, i + 20) * (height - 10), 1.5, 1);
    }
  }
  function prepare(surface) {
    if (atlas) return;
    factory = surface || ((width, height) => {
      const c = document.createElement("canvas"); c.width = width; c.height = height; return c;
    });
    atlas = { slabs: [], lava: [], props: {} };
    for (let variant = 0; variant < 4; variant++) {
      atlas.slabs.push(canvas(160, 160, g => {
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
          const x = col * 64 - (row % 2 ? 30 : 0);
          stone(g, x, row * 40, 64, 40, variant * 17 + row * 3 + col);
        }
        g.lineWidth = 1.6; g.strokeStyle = "#090c0ee0";
        for (let i = 0; i < 3; i++) {
          const x = hash(variant + 13, i) * 120, y = hash(variant, i + 9) * 125;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + 17);
          g.lineTo(x + 9, y + 23); g.lineTo(x + 27, y + 39); g.stroke();
          g.strokeStyle = "#b5a18124"; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 16, y + 17); g.stroke();
          g.strokeStyle = "#090c0ee0";
        }
        g.fillStyle = "#bcb2a019";
        for (let i = 0; i < 32; i++) g.fillRect(hash(i, variant) * 160, hash(i + 72, variant) * 160, 1, 1);
      }));
    }
    for (let variant = 0; variant < 2; variant++) atlas.lava.push(canvas(128, 128, g => {
      g.fillStyle = "#100a09"; g.fillRect(0, 0, 128, 128);
      const glow = g.createRadialGradient(64, 76, 8, 64, 76, 86);
      glow.addColorStop(0, "#a94123b0"); glow.addColorStop(.48, "#5c21179a"); glow.addColorStop(1, "#1c111000");
      g.fillStyle = glow; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 12; i++) {
        const x = hash(i, variant) * 128, y = 25 + hash(i + 50, variant) * 105;
        g.strokeStyle = i % 3 ? "#bc5c2f90" : "#e8934566"; g.lineWidth = i % 3 ? 1 : 2;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y - 3); g.lineTo(x + 22, y + 3); g.lineTo(x + 36, y - 1); g.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const x = hash(i + 89, variant) * 125, y = hash(i + 99, variant) * 125;
        path(g, [[x, y], [x + 18, y - 5], [x + 27, y + 4], [x + 12, y + 14]], "#130f0def", "#7838224a");
      }
    }));
    atlas.medallion = canvas(256, 256, g => {
      g.translate(128, 128); g.lineWidth = 2;
      const points = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 103, Math.sin(i * Math.PI / 4) * 103]);
      path(g, points, "#0a0e1044", "#82705088");
      g.strokeStyle = "#665a4590"; g.beginPath(); g.arc(0, 0, 87, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1; g.strokeStyle = "#bc9d5c80";
      for (let i = 0; i < 16; i++) {
        g.save(); g.rotate(i * Math.PI / 8); g.beginPath(); g.moveTo(-3, -96); g.lineTo(-3, -91);
        g.lineTo(3, -89); g.lineTo(3, -96); g.stroke(); g.restore();
      }
      path(g, [[0, -53], [29, -13], [16, 39], [0, 54], [-16, 39], [-29, -13]], "#63513c19", "#ab85546a");
      g.beginPath(); g.moveTo(0, -42); g.lineTo(0, 31); g.moveTo(-16, 2); g.lineTo(0, -12); g.lineTo(16, 2); g.stroke();
    });
    atlas.shadow = canvas(128, 64, g => {
      const fade = g.createRadialGradient(64, 32, 1, 64, 32, 58);
      fade.addColorStop(0, "#00060abb"); fade.addColorStop(.5, "#00060a55"); fade.addColorStop(1, "#00060a00");
      g.fillStyle = fade; g.fillRect(0, 0, 128, 64);
    });
    atlas.props.column = canvas(108, 172, g => {
      path(g, [[23, 157], [53, 166], [88, 153], [88, 141], [53, 133], [23, 144]], "#292925", "#070c0e");
      path(g, [[26, 143], [56, 151], [88, 140], [55, 133]], "#575144", "#a08b5c44");
      path(g, [[36, 43], [53, 47], [73, 40], [74, 137], [54, 145], [35, 137]], "#33352f", "#111819");
      path(g, [[54, 48], [74, 42], [74, 136], [54, 144]], "#1e2727");
      path(g, [[36, 44], [53, 48], [53, 141], [35, 136]], "#444239");
      for (let y = 58; y < 135; y += 22) {
        g.strokeStyle = "#080f11bb"; g.beginPath(); g.moveTo(36, y); g.lineTo(54, y + 5); g.lineTo(74, y - 1); g.stroke();
        g.strokeStyle = "#aa997336"; g.beginPath(); g.moveTo(36, y + 2); g.lineTo(53, y + 7); g.stroke();
      }
      path(g, [[28, 33], [48, 19], [70, 24], [79, 17], [86, 30], [84, 43], [55, 53], [28, 45]], "#4c493d", "#101517");
      path(g, [[28, 33], [48, 19], [70, 24], [79, 17], [86, 30], [56, 42]], "#79705a", "#baa67d55");
      path(g, [[57, 53], [64, 86], [58, 106], [65, 134]], null, "#0b1013");
      g.strokeStyle = "#806c414e"; g.lineWidth = 2; g.beginPath(); g.moveTo(39, 55); g.lineTo(40, 132); g.stroke();
      path(g, [[79, 151], [87, 142], [103, 153], [98, 163]], "#555040", "#141b1c");
    });
    atlas.props.broken = canvas(116, 104, g => {
      path(g, [[15, 91], [58, 99], [100, 83], [84, 65], [30, 70]], "#282c27", "#0c1113");
      path(g, [[27, 34], [43, 18], [57, 27], [70, 13], [90, 31], [87, 75], [58, 89], [26, 73]], "#4e4d41", "#101819");
      path(g, [[27, 34], [43, 18], [57, 27], [70, 13], [90, 31], [57, 42]], "#7a715c", "#b09a6c44");
      path(g, [[58, 43], [90, 31], [87, 75], [58, 89]], "#292f2b");
      for (let y = 49; y < 76; y += 17) { g.strokeStyle = "#171d1c"; g.beginPath(); g.moveTo(29, y); g.lineTo(58, y + 8); g.lineTo(87, y - 3); g.stroke(); }
      path(g, [[9, 84], [21, 73], [32, 84], [26, 94]], "#575340", "#161c1d");
      path(g, [[91, 91], [102, 81], [112, 89], [106, 99]], "#4d4c3e", "#141d1c");
    });
    atlas.props.chain = canvas(52, 182, g => {
      g.lineWidth = 2.3;
      for (let i = 0; i < 13; i++) {
        const x = 22 + Math.sin(i * .5) * 3, y = 6 + i * 10;
        g.strokeStyle = "#090c0fcc"; g.beginPath(); g.ellipse(x + 1.5, y + 1.5, i % 2 ? 2.5 : 4, 7, .12, 0, 7); g.stroke();
        g.strokeStyle = i % 2 ? "#615039" : "#9a7950"; g.beginPath(); g.ellipse(x, y, i % 2 ? 2.5 : 4, 7, .12, 0, 7); g.stroke();
      }
      path(g, [[10, 143], [22, 132], [35, 143], [31, 164], [22, 171], [14, 163]], "#342a23", "#997a4f");
      path(g, [[22, 141], [26, 154], [22, 163], [18, 154]], "#af743742", "#bd985a66");
    });
    atlas.props.arch = canvas(206, 190, g => {
      path(g, [[12, 166], [49, 178], [64, 164], [58, 71], [23, 60]], "#3d3e34", "#0c1518");
      path(g, [[49, 178], [64, 164], [58, 71], [43, 72]], "#242f2b");
      path(g, [[154, 158], [185, 171], [199, 161], [192, 107], [161, 110]], "#454235", "#0b1518");
      path(g, [[182, 169], [199, 161], [192, 107], [179, 109]], "#28312d");
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + i * .28, b = a + .25;
        const pt = (angle, radius) => [106 + Math.cos(angle) * radius, 112 + Math.sin(angle) * radius];
        path(g, [pt(a, 94), pt(b, 94), pt(b, 63), pt(a, 63)], i % 2 ? "#565345" : "#655d4c", "#101a1b");
        g.strokeStyle = "#bdab7655"; g.beginPath(); g.moveTo(...pt(a + .02, 91)); g.lineTo(...pt(b - .02, 91)); g.stroke();
      }
      for (let y = 90; y < 165; y += 25) { g.strokeStyle = "#101819"; g.beginPath(); g.moveTo(24, y); g.lineTo(48, y + 7); g.lineTo(60, y - 2); g.stroke(); }
    });
  }
  function getLayout(scene) {
    const rooms = scene.rooms || [], cells = scene.dungeon?.cells;
    if (layout && lastCells === cells && lastRooms === rooms) return layout;
    lastCells = cells; lastRooms = rooms;
    const entries = [], props = [], runes = [];
    if (cells?.[Symbol.iterator]) for (const key of cells) {
      const [x, y] = String(key).split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) entries.push({ x: x * TILE, y: y * TILE, cx: x, cy: y, seed: hash(x, y) });
      if (entries.length >= 1024) break;
    }
    const exists = (x, y) => cells?.has ? cells.has(x + "," + y) : rooms.some(r => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]);
    for (const tile of entries) { tile.bottom = !exists(tile.cx, tile.cy + 1); tile.right = !exists(tile.cx + 1, tile.cy); }
    rooms.slice(0, 10).forEach(([x, y, width, height], i) => {
      runes.push({ x: (x + width / 2) * TILE, y: (y + height / 2) * TILE, size: i === 3 ? 232 : 122 });
      // Perimeter anchors avoid room centers, shrines and authored arrival doors.
      props.push({ x: (x + .35) * TILE, y: (y + .38) * TILE, kind: i % 3 ? "column" : "broken", width: 63, height: i % 3 ? 101 : 57 });
      props.push({ x: (x + width - .28) * TILE, y: (y + height - .3) * TILE, kind: "broken", width: 59, height: 53 });
      if (i === 1 || i === 3) props.push({ x: (x + .4) * TILE, y: (y + height - .36) * TILE, kind: "chain", width: 29, height: 116 });
      if (i === 0 || i === 3) props.push({ x: (x + width - .7) * TILE, y: (y + .4) * TILE, kind: "arch", width: i === 3 ? 114 : 100, height: i === 3 ? 108 : 95 });
      if (i === 1) props.push({ x: (x + width - .55) * TILE, y: (y + .65) * TILE, kind: "coffin", width: 73, height: 57 });
      if (i === 3) props.push({ x: (x + .45) * TILE, y: (y + .45) * TILE, kind: "statue", width: 70, height: 129 });
      if (i === 0 || i === 2 || i === 6) props.push({ x: (x + .8) * TILE, y: (y + height - .4) * TILE, kind: "bones", width: 54, height: 28 });
    });
    return (layout = { entries, props: props.slice(0, 32), runes });
  }
  function limit(scene){const n=scene.quality?.maxAtmosphere??32,r=n>=32?1:n>=16?.65:.35;return Object.fromEntries(Object.entries(LIMIT).map(([k,v])=>[k,Math.max(1,Math.floor(v*r))]));}
  function visible(scene, x, y, padding) { return !scene.visiblePoint || scene.visiblePoint(x, y, padding); }
  function ground(ctx, scene) {
    if (!active(scene)) return;
    prepare(); const data = getLayout(scene),limits=limit(scene); let tiles = 0, lava = 0;
    ctx.save();
    for (const tile of data.entries) {
      if (!visible(scene, tile.x + 40, tile.y + 40, 100)) continue;
      if (tiles++ < limits.ground) {
        ctx.globalAlpha = .25; ctx.drawImage(atlas.slabs[Math.floor(tile.seed * 4)], tile.x, tile.y, TILE, TILE);
      }
    }
    // Magma is confined to known solid void cells beside the narrow bridges.
    // It stays below the combat palette and never imitates a hazard telegraph.
    for (const [cx, cy] of bridgeVoid) {
      if (lava >= limits.lava || !visible(scene, cx * TILE + 40, cy * TILE + 40, 110)) continue;
      const seed = hash(cx, cy); lava++;
      ctx.globalAlpha = .82 + Math.sin((scene.clock || 0) * 1.7 + seed * 19) * .035;
      ctx.drawImage(atlas.lava[cx & 1], cx * TILE, cy * TILE, TILE, TILE);
    }
    for (const rune of data.runes) {
      if (!visible(scene, rune.x, rune.y, rune.size)) continue;
      const seal = sprite(scene, "seal") || atlas.medallion;
      ctx.globalAlpha = .37; ctx.drawImage(seal, rune.x - rune.size / 2, rune.y - rune.size / 2, rune.size, rune.size);
    }
    ctx.restore();
  }
  function occlusion(scene, x, y, width, height) {
    const dx = x - scene.hero.x, dy = y - scene.hero.y;
    const sx = (dx - dy) * Math.SQRT1_2, sy = (dx + dy) * Math.SQRT1_2 * .68;
    // Fade the full prop whenever it could cover any part of the hero.
    if (Math.abs(sx) < width * .5 + 28 && sy > -20 && sy < height + 28) return .18;
    return .86;
  }
  function sprite(scene, kind) {
    const img = scene.art?.["prop-ash-" + (kind === "broken" ? "column" : kind)];
    return img && (img.naturalWidth || img.width) > 0 && (img.complete !== false) ? img : null;
  }
  function foreground(ctx, scene) {
    if (!active(scene) || !scene.sceneItem || !scene.billboard || !scene.inputVector) return;
    prepare(); const data = getLayout(scene),limits=limit(scene); let edges = 0, props = 0;
    const down = scene.inputVector(0, 19);
    for (const tile of data.entries) {
      if (edges >= limits.trim) break;
      if ((!tile.bottom && !tile.right) || !visible(scene, tile.x + 40, tile.y + 40, 105)) continue;
      const { x, y } = tile;
      edges++;
      scene.sceneItem(x + TILE, y + TILE, () => {
        ctx.save(); ctx.lineWidth = 1;
        if (tile.bottom) {
          path(ctx, [[x, y + TILE], [x + TILE, y + TILE], [x + TILE + down.x, y + TILE + down.y], [x + down.x, y + TILE + down.y]], "#171b1b", "#060c10");
          ctx.strokeStyle = "#87704d72"; ctx.beginPath(); ctx.moveTo(x + 1, y + TILE + 1); ctx.lineTo(x + TILE - 1, y + TILE + 1); ctx.stroke();
          ctx.strokeStyle = "#a55c2c33"; ctx.beginPath(); ctx.moveTo(x + down.x, y + TILE + down.y); ctx.lineTo(x + TILE + down.x, y + TILE + down.y); ctx.stroke();
        }
        if (tile.right) path(ctx, [[x + TILE, y], [x + TILE, y + TILE], [x + TILE + down.x, y + TILE + down.y], [x + TILE + down.x, y + down.y]], "#10181a", "#050b0d");
        ctx.restore();
      });
    }
    for (const prop of data.props) {
      if (props >= limits.props) break;
      if (!visible(scene, prop.x, prop.y, prop.height + 30)) continue;
      const painted = sprite(scene, prop.kind);
      const img = painted || atlas.props[prop.kind];
      if (!img) continue;
      props++;
      const width = painted ? Math.min(150, prop.height * (img.naturalWidth || img.width) / (img.naturalHeight || img.height)) : prop.width;
      const alpha = occlusion(scene, prop.x, prop.y, width, prop.height);
      // Shadows live on the ground plane; upright art uses the existing billboard.
      if (prop.kind !== "chain") { ctx.save(); ctx.globalAlpha = alpha * .42; ctx.drawImage(atlas.shadow, prop.x - 37, prop.y - 20, 74, 40); ctx.restore(); }
      scene.sceneItem(prop.x, prop.y, () => {
        ctx.save(); ctx.globalAlpha = alpha;
        if (painted && scene.drawProp && prop.kind !== "chain") {
          scene.drawProp("prop-ash-" + (prop.kind === "broken" ? "column" : prop.kind), prop.x, prop.y, width, prop.height);
        } else scene.billboard(prop.x, prop.y, () => {
          const sway = prop.kind === "chain" ? Math.sin(scene.clock * .65 + prop.x) * .012 : 0;
          if (sway) { ctx.translate(0, -prop.height); ctx.rotate(sway); ctx.translate(0, prop.height); }
          ctx.drawImage(img, -width / 2, -prop.height, width, prop.height);
        });
        ctx.restore();
      });
    }
  }
  window.EmberAsh = Object.freeze({ prepare, ground, foreground, lowerVoid });
})();
