# Bloodknight browser checks

The game itself needs no dependencies or build. These development checks require Node.js, Playwright and Chromium. Install Playwright outside the repository if needed; set `NODE_PATH` to its node_modules directory. Set `BROWSER_PATH` only when selecting a particular Chromium executable.

```sh
node tests/bloodknight.cjs
```

The script serves the actual root HTML/assets, exposes game functions only in an in-memory test copy, disables animation scheduling and sound for deterministic stepping, and tests the mobile canvas in Chromium. It checks arc geometry and autoaim, rear swings, card effects, bleed, healing caps, Pact timing, Earth spells, evolutions, elemental isolation, retained matchups, cumulative unlocks, old profile/run compatibility, save codes, slot separation and PNG fallback. Screenshots go to `/tmp`, or to `ARTIFACT_DIR`.

For a balance comparison:

```sh
BALANCE=1 ARTIFACT_DIR=/tmp node tests/bloodknight.cjs
```

Five seeds (17, 37, 71, 113, 151) compare all four heroes at depth 0, without shrine purchases, on a 390 × 844 viewport. A circling bot continuously turns at 0.24 radians/s and steers around walls; an aggressive bot approaches foes, faces them at swing time and retreats from close contact between attacks. Both use only movement and offered choices, prefer their own elemental build, and choose Sanctuary at crossroads. Runs stop at death, victory or six minutes of stepping. The results and screenshots are diagnostics, not measured phone FPS or proof of human difficulty. Real phone playtesting should confirm the feel before further tuning.

The JSON results are written as `bloodknight-balance.json` in the artifact directory.

## Recorded baseline

The checked-in `bloodknight-balance-baseline.json` records the five-seed comparison for this implementation. Median survival (six-minute cap):

| Hero | Circling | Aggressive |
| --- | --- | --- |
| Crypt Mage | 5:34 | 1:59 |
| Stormcaller | 4:32 | 1:19 |
| Emberweaver | 2:58 | 1:27 |
| Bloodknight | 2:44 | 3:11 |

Bloodknight meets the requested 2.5–3-minute circling target in this policy's median and rewards aggressive play more than the other heroes. Other heroes retain their existing balance; their ranged attacks naturally favor this circling policy. Individual seeds vary substantially, and two aggressive Bloodknight runs reached the test limit. These are bot comparisons, not claims about human survival times.

## The Descent checks

```sh
node tests/descent.cjs
```

This Chromium integration suite checks authored map connectivity and movement, locked doors, offscreen spawns, swept collisions for both projectile teams, Bloodknight swings through walls, timer/kill door triggers, floor-entry checkpoints, v9→v10 run migration, v9/v10 EC1 codes, Settings import, slot isolation and Reset Tips.

It then plays all five floors with each of the four heroes (20 floor/hero combinations), using real joystick movement, automatic attacks, spawns, upgrades, bosses, stairs and victory. Health and base damage are increased for this progression check; this is an accelerated assisted browser playthrough, not a human difficulty or balance measurement. Screenshots and `descent-results.json` go to `/tmp`. The checked-in `descent-playthrough.json` records the passing progression run. The suite also verifies Endless wave-20 victory/tier continuation, independent mode records, and an unmodified live mobile animation loop with the minimap below the HUD. The Bloodknight suite explicitly selects ENDLESS so its original arena combat regression checks remain comparable.
