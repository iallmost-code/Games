# Ember Crypt development notes

- Ember Crypt is a mobile action RPG with a root HTML game and presentation modules: five heroes, THE DESCENT and ENDLESS modes, landscape/portrait controls and the isometric camera are all merged and live. Keep the game working from root `index.html` with relative `assets/` paths and no required build or external service.

- Preserve gameplay, all five heroes and their element-restricted upgrades, three zones, depth modifiers, achievements, shrine, relics, save slots, save-code export/import, and wave 20 victory unless the task changes them.
- Controls: joystick + Dash + Ultimate; no other in-game buttons. Automatic attacks stay automatic. Preserve the pause control and Settings sound/speed controls. Landscape uses a floating left joystick and right skill buttons; portrait keeps the bottom-center joystick. Desktop uses WASD/arrows, Space = Dash, E = Ultimate.
- Preserve localStorage save compatibility. Profiles are v2 and runs are v11. Migrate Mage→Gravecaller and Stormcaller→Storm Ranger without losing progress; v9 runs migrate to ENDLESS; change format/version and write a migration only when changing serialized run structure.
- Keep WebP-first cinematic assets with PNG fallback. Maintain readable hero ring, danger cues, and the 60 FPS target and bounded canvas pixel budget.
- `main` is published by GitHub Pages at https://iallmost-code.github.io/Games/; anything pushed to `main` goes live. Work on a branch and merge to `main` only after testing. The ChatGPT Sites copy (https://ember-crypt.alpine0-0.chatgpt.site) is separate and not updated by commits.
- Verify JavaScript syntax and a real canvas render after changes. Test profile isolation and save migration for changes affecting persistence. Avoid performance-heavy per-enemy blur or filter operations.

- THE DESCENT is the default five-floor mode. Keep ENDLESS on its original arena progression. Dungeon resumes restart the current floor from its entry checkpoint. Mode records and character tips must remain isolated.

- Descent room-edge arrivals have a one-second shadow warning with glow, shadow, audio and offscreen cues. Announce offscreen arrivals without changing enemy movement, targeting or damage timing.

- Heroes are Gravecaller, Storm Ranger, Sunwarden, Emberweaver and Bloodknight. Keep the authored floor layouts and arrival cues. v11 skill fields (Dash/Ultimate) are additive and must default safely for old runs.

- The isometric camera is the default view; Classic remains available in Settings. Isometric screen input must go through `inputVector`; physics, ranges, dungeon cells and saved coordinates stay in world space. Spawn visibility, camera culling and navigation cues must use the projected viewport (`worldW`/`worldH`, not screen `w`/`h`).
- Depth-sort upright actors, props, raised masonry and heighted projectiles; keep foreground walls translucent near the hero. Cosmetic queues/effects are transient and must never enter run/profile saves. Historical world-axis bot suites select Classic through `tests/classic-camera-fixture.cjs`; `tests/action-rpg.cjs` validates the new camera/input/render path.

- Short landscape screens (height under 390px, e.g. phones with a browser bar) zoom the camera out via `computeViewZoom` and use the compact HUD media query (height under 450px). Portrait and full-height layouts keep their original framing; Settings → VIEW (Near/Normal/Far) adjusts zoom. Screen-to-world input must divide by `viewZoom`.

- Animated Catacombs uses external presentation-only modules in assets/cinematic and assets/audio. Preserve safe asset failure fallback, cached frames, grounded anchors, deterministic decoration, bounded voices and immediate mute. New authored animation/tomb/lava decoration must never alter combat timing, dungeon cells, collision, progression or serialized data. Keep the branch unmerged for owner playtesting.
- Always work on a branch and open a PR; the owner playtests and approves merges to `main`. GitHub Actions runs the browser suites in `tests/` on every PR (`.github/workflows/tests.yml`); keep them passing and update their assertions when a deliberate change makes one obsolete.
- Pause → REPORT A BUG copies recent errors plus game state for the owner to paste into an issue. Automatic quality (Settings → QUALITY: Auto/High/Low) lowers the frame rate cap and effect counts when a phone cannot hold 60 FPS; it must never change gameplay timing, ranges or saves.


- v69 SOUND & MOTION extends authored animation to all five heroes and zone scenery to all Descent/Endless zones. All added work remains presentation only, quality-scaled and bounded. Preserve `function sfx(kind) {` and separately stubbable `function music(kind) {`. Do not rebaseline `tests/visual-invariants.cjs`: its only exception is the exact marked enemy-death fx call. Music/SOUND/shake preferences are localStorage-only; no save-version bump. Music must fade on pause/hidden and wait for a gesture after returning from hidden. Keep all PR suites green and this branch unmerged for owner playtesting.
