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

## Descent tuning: normal Floor 1 survival

```sh
node tests/descent-tuning.cjs
```

Chromium runs five identical seeds for each hero before/after the tuning, stopping at death or 180 seconds. The movement bot turns continuously, avoids walls and picks offered upgrades. It uses depth 0, no shrine purchases, and the normal starting health, armor and damage; only hero unlocks are supplied. No health/damage/clock/spawn overrides are used in survival runs. This is a normal-stat automated diagnostic, not a human difficulty measurement. The baseline source is pinned to the original Descent commit `d11e59a6c2cd72dfc3fefbb3052fdce61fb29cf1`; keep repository history available for reproduction.

The script writes `tests/descent-tuning-results.json`, and separately checks rear-target moving aim, reach fallback, walls, the floor-specific Cinder Imp cap and minimap dimensions/opacity. Screenshots go to `/tmp`.

Recorded five-seed Floor 1 results (180-second cap):

| Hero | Before median | Tuned median | Survived 180s before → after |
| --- | --- | --- | --- |
| Crypt Mage | 180s | 180s | 3/5 → 3/5 |
| Stormcaller | 59.72s | 180s | 1/5 → 3/5 |
| Emberweaver | 50.57s | 144.63s | 0/5 → 2/5 |
| Bloodknight | 39.90s | 180s | 1/5 → 5/5 |

A 180s value is censored at the test limit. Tuned runs never exceeded three living Cinder Imps; peak simultaneous lava vents fell from three to two under the doubled activation interval. Seeds and individual runs are in `descent-tuning-results.json`.

## Floor variety and doorway warnings

```sh
node tests/descent-variety.cjs
BASELINE_COMMIT=f0b3ff9 RESULT_PATH=tests/descent-variety-survival.json node tests/descent-tuning.cjs
```

The variety suite checks all five authored layouts, room connectivity before/after opening the boss door, Sunken bypass loops, valid room-edge entrances, one-second announcements ahead of normal enemy approaches, timer pausing, approach, v10 checkpoint restart and unchanged Endless spawns. It captures all five maps and a mid-warning viewport in Chromium. The existing Descent suite covers all 20 floor/hero progression combinations.

The normal-stat survival comparison uses the previously merged Descent/tuning build as its baseline and writes a separate historical report; it uses the same five seeds, movement policy and normal stats as the earlier diagnostic. `BASELINE_COMMIT` and `RESULT_PATH` optionally choose a baseline/report without overwriting the original tuning results.

The final v63 comparison reproduces all 20 tuned Floor 1 outcomes exactly: three-minute survival stays Mage 3/5, Stormcaller 3/5, Emberweaver 2/5 and Bloodknight 5/5. Median survival stays 180s, 180s, 144.63s and 180s respectively (180s is the test cap). Arrival announcements do not delay, hide or make enemies invulnerable; combat timing and Floor 1's layout/spawn distribution are preserved. This is an automated normal-stat regression check, not a human playtest.
