# Bloodknight browser checks

The game itself needs no dependencies or build. These development checks require Node.js, Playwright and Chromium. Install Playwright outside the repository if needed; set `NODE_PATH` to its node_modules directory. Set `BROWSER_PATH` only when selecting a particular Chromium executable.

GitHub Actions (`.github/workflows/tests.yml`) runs every suite on each pull request and on pushes to `main`: a quick syntax and `visual-invariants.cjs` job, then one browser job per suite. Failed jobs upload their screenshots and results as artifacts.

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

It then plays all five floors with each of the five heroes (25 floor/hero combinations), using real joystick movement, automatic attacks, spawns, upgrades, bosses, stairs and victory. Health and base damage are increased for this progression check; this is an accelerated assisted browser playthrough, not a human difficulty or balance measurement. Screenshots and `descent-results.json` go to `/tmp`. The checked-in `descent-playthrough.json` records the passing progression run. The suite also verifies Endless wave-20 victory/tier continuation, independent mode records, and an unmodified live mobile animation loop with the minimap below the HUD. The Bloodknight suite explicitly selects ENDLESS so its original arena combat regression checks remain comparable.

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

The variety suite checks all five authored layouts, room connectivity before/after opening the boss door, Sunken bypass loops, valid room-edge entrances, one-second announcements ahead of normal enemy approaches, timer pausing, approach, v10 checkpoint restart and unchanged Endless spawns. It captures all five maps and a mid-warning viewport in Chromium. The existing Descent suite covers all 25 floor/hero progression combinations.

The normal-stat survival comparison uses the previously merged Descent/tuning build as its baseline and writes a separate historical report; it uses the same five seeds, movement policy and normal stats as the earlier diagnostic. `BASELINE_COMMIT` and `RESULT_PATH` optionally choose a baseline/report without overwriting the original tuning results.

The final v63 comparison reproduces all 20 tuned Floor 1 outcomes exactly: three-minute survival stays Mage 3/5, Stormcaller 3/5, Emberweaver 2/5 and Bloodknight 5/5. Median survival stays 180s, 180s, 144.63s and 180s respectively (180s is the test cap). Arrival announcements do not delay, hide or make enemies invulnerable; combat timing and Floor 1's layout/spawn distribution are preserved. This is an automated normal-stat regression check, not a human playtest.

## Five-hero prototype (v64)

Run all checks in Chromium with Playwright available:

```sh
node tests/bloodknight.cjs
node tests/descent.cjs
node tests/descent-variety.cjs
node tests/new-heroes.cjs
BASELINE_COMMIT=9906620 RESULT_PATH=tests/new-heroes-survival.json node tests/descent-tuning.cjs
```

`new-heroes.cjs` checks the new starter and unlock condition, corpse-raise odds, caps and lifetimes, mortal allies and ordinary-enemy attention, minion melee/link/siphon/explosions/giants/spirits, independent arrows and aim, wolves, traps, volleys, beams, shared crit stats, gusts, Sanctuary/Halo/Dawnbreaker/Cyclone/Judgment, all nine evolution prerequisites, elemental card isolation, Light/Wind matchups, gear effects, pause and actor serialization. It generates real old Mage, Stormcaller and Bloodknight saves with the preceding v63 source and tests profile-v2/v9/v10→v11 migration, current-floor restart, safe replacement of removed heroes, embers/shrine/achievements/tips/records/unlock preservation, slot isolation and old/new EC1 codes. It also renders the three new kits, runs the unmodified mobile frame loop with each of all five heroes at normal stats, and forces the new atlas through PNG fallback.

The Descent progression suite now covers 25 floor/hero combinations with assisted health/damage solely to exercise progression. `new-heroes-progression.json` records that result; `new-heroes-checks.json` records the additional mechanical/migration checks. Survival below uses normal starting HP, armor and damage, depth 0 and no shrine upgrades or combat overrides. Bots use the same five seeds and constant-turn joystick policy with wall avoidance, normal offered cards/gear and Sanctuary choices. Historical before results use `9906620` (the authored-floor/arrival build).

| Hero | Median time | Range | Alive at 180s cap | Cleared Floor 1 earlier |
| --- | --- | --- | --- | --- |
| Gravecaller | 180.00s | 92.58–180.00s | 4/5 | 0/5 |
| Storm Ranger | 158.55s | 158.15–180.00s | 2/5 | 3/5 |
| Emberweaver | 144.63s | 39.15–180.00s | 2/5 | 0/5 |
| Bloodknight | 180.00s | 146.20–180.00s | 3/5 | 0/5 |
| Sunwarden | 154.63s | 127.30–180.00s | 2/5 | 0/5 |

A 180-second result is censored at the cap. Early floor clears are successful completions, not deaths; Storm Ranger's median ends on an early clear. Individual outcomes, initial stats and floor/exit reasons are in `new-heroes-survival.json` (20 legacy baseline runs plus 25 prototype runs). No run exceeded three living Cinder Imps or two concurrent lava vents. These are automated normal-stat diagnostics, not a human playtest or physical-phone FPS measurement.

For focused tuning only, `CURRENT_ONLY=1 HERO_FILTER=gravecaller,ranger,sunwarden RESULT_PATH=/tmp/hero-tuning.json` runs the chosen current heroes without the legacy comparison.

Optional owner playtest: [new-heroes-playtest.ec1.txt](new-heroes-playtest.ec1.txt) is a no-run profile with all five heroes unlocked, zero embers and no shrine upgrades. Import it into an empty prototype slot through Settings → LOAD SAVE CODE to try the new kits immediately. The normal unlock conditions remain in the game.

## Landscape + skills (`codex/landscape-skills`)

Run:

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/landscape-skills.cjs
```

The new suite checks 390×844 portrait and 844×390 landscape for all five heroes: full-width canvas, safe HUD/minimap/button geometry, portrait joystick spacing, floating joystick placement, menus, native browser frame loop, and real simultaneous touch input. Keyboard movement/Space/E, rotation/release, and menu typing are covered. Combat checks exercise actual Colossus slams during and after Dash, swept wall collision, four-second cooldown and Fleet Step, all five Ultimates, readiness effects, paused timers, no idle charge, and the minimum 60-second recharge ceiling under sustained damage. Saves cover optional-field defaults in v11, existing progress/upgrades, cooldown/charge/Army in Endless, Descent floor checkpoints, EC1 codes, and slot isolation.

`landscape-skills-results.json` stores the geometry, combat/save results and normal-stat charge measurements. These first-charge runs use the established seeded constant-turn movement bot with wall avoidance and normal offered upgrades; no HP, damage or shrine boosts, and no manual skills. Seed 37 is tested in both orientations. The browser checks exercise native timing separately from accelerated diagnostic updates.

| Hero | Portrait first charge | Landscape first charge |
|---|---:|---:|
| Gravecaller | 79.40s | 78.33s |
| Storm Ranger | 78.75s | 84.93s |
| Emberweaver | 78.38s | 87.75s |
| Bloodknight | 84.85s | 85.83s |
| Sunwarden | 83.83s | 82.08s |

These are automated Chromium results, not physical-phone or human playtest claims. The existing Bloodknight, Descent (25 assisted floor/hero combinations), authored-floor/arrival and new-hero/migration suites also remain applicable.

## Isometric action RPG preview (v65)

```sh
node tests/action-rpg.cjs
```

The new suite exercises the default isometric renderer in Chromium: all five heroes on all five floors at 390×844 and 844×390 (50 scenes), screen-aligned movement and Dash, swept walls, projected offscreen spawns, depth ordering, Ultimate visuals, HUD geometry, actual boss-slam invulnerability, paused effects, transient effect reset, unchanged profile-v2/run-v11/EC1 saves, Endless state and the Settings Classic comparison. Native animation, keyboard and skill-button input are checked for all ten hero/orientation combinations. `action-rpg-results.json` records the results. Cached draw timings are headless CPU diagnostics, not measured phone FPS.

Historical combat/navigation bots feed world-axis joystick vectors. `classic-camera-fixture.cjs` explicitly selects the real Classic graphics preference for those existing suites; the new suite independently tests projected screen-space input. Bloodknight, Descent, floor variety, new heroes/migration and landscape/skills regressions passed. Descent progression remains an assisted test, not normal-difficulty human playtesting. The ten normal-stat Ultimate charge runs still measured roughly 78–88 seconds.

## v66 visual-only invariants

`node tests/visual-invariants.cjs` compares 18 core combat, AI, movement, skills, dungeon and persistence function bodies against the prior prototype, and checks the 60 FPS target and bounded light/pixel configuration. Existing Chromium suites cover projection, all hero/floor scenes, native controls, migration, slots, codes and progression. Browser timing diagnostics do not establish physical Android performance.

## Animated Catacombs (v68)

`node tests/animated-catacombs.cjs` exercises both authored heroes, frame selection/distinctness, grounding/render purity, PNG and total-asset-failure fallback, first-floor scenery gates, controls, saves and native mobile rendering. `node tests/audio-presentation.cjs` validates sample byte/voice budgets, decode/playback, cache/failure behavior and mute cleanup in mocked and real Chromium AudioContexts. `node tests/ash-environment.cjs` proves all 22 render-only magma shafts remain in solid void beside existing bridges. The invariant suite compares 18 gameplay/persistence function bodies to current-main baseline `c588c3f`.

Existing camera checks passed 50 hero/floor/orientation scenes and all ten native hero/orientation cases at DPR 3; new-hero/migration/slots/codes and 25 assisted Descent progression cases passed. These are automated browser diagnostics, not a human balance test or measured Android performance.

All seven existing browser suites passed after merging the latest stability update. The 25 normal-stat Floor 1 circling diagnostics in `animated-catacombs-survival.json` exactly reproduce the earlier five-hero survival outcomes, including HP, kills, levels and floor exits. The existing seeded-bot policy uses no manual skill buttons; this is a reproducibility check, not human difficulty or phone FPS evidence. The new animation, audio and Ash checks are included in GitHub Actions.

## SOUND & MOTION (v69)

Run every GitHub Actions matrix suite locally before opening the PR. `animated-catacombs.cjs` now checks all five heroes/150 decoded frames, their distinct walk frames, hit/attack/death selectors and uncropped foot anchors, including PNG/total-media fallback. `audio-presentation.cjs` checks all 27 WAVs within 610 KB and the shared 12-voice admission/lifecycle budget.

`node tests/sound-motion.cjs` validates 50 hero/floor/orientation scenes, Endless Ash/Frost/Venom changes, solid corridor-adjacent voids, boss doorway safety, reduced Medium/Low prop/effect budgets, cached sprite tint, immediate enemy death, boss cards, scenery interactions, independent music/shake settings and unchanged v2/v11/EC1 data. A mocked music context forbids gameplay RNG and verifies lazy caches, bounded crossfades and constant source allocation across enemy-count changes. A separate actual Web Audio harness checks menu/zone/combat/boss layers, four stings, cleanup, pause/hidden/gesture lifecycle and output fades. Results: sound-motion-results.json and sound-motion screenshots.

The gameplay invariant baseline is unchanged (`c588c3f`). It strips only the exact marked `fx("enemyDeath", e)` line before comparing function bodies. Music has its own stubbable `function music(kind) {`, separately stubbed in every simulation fixture. Frame-time reports are headless diagnostics, not phone FPS, audio latency or a subjective listening assessment.
