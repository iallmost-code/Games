# Ember Crypt development notes

- This is the v64 five-hero prototype. Keep the game working from root `index.html` with relative `assets/` paths and no required build or external service.
- Preserve gameplay, all five heroes and their element-restricted upgrades, three zones, depth modifiers, achievements, shrine, relics, save slots, save-code export/import, and wave 20 victory unless the task changes them.
- Controls: joystick + Dash + Ultimate; no other in-game buttons. Automatic attacks stay automatic. Preserve the pause control and Settings sound/speed controls. Landscape uses a floating left joystick and right skill buttons; portrait keeps the bottom-center joystick. Desktop uses WASD/arrows, Space = Dash, E = Ultimate.
- Preserve localStorage save compatibility. Profiles are v2 and runs are v11. Migrate Mage→Gravecaller and Stormcaller→Storm Ranger without losing progress; v9 runs migrate to ENDLESS; change format/version and write a migration only when changing serialized run structure.
- Keep WebP-first cinematic assets with PNG fallback. Maintain readable hero ring, danger cues, and the 40 FPS limiter.
- `main` is published by GitHub Pages at https://iallmost-code.github.io/Games/; anything pushed to `main` goes live. Work on a branch and merge to `main` only after testing. The ChatGPT Sites copy (https://ember-crypt.alpine0-0.chatgpt.site) is separate and not updated by commits.
- Verify JavaScript syntax and a real canvas render after changes. Test profile isolation and save migration for changes affecting persistence. Avoid performance-heavy per-enemy blur or filter operations.

- THE DESCENT is the default five-floor mode. Keep ENDLESS on its original arena progression. Dungeon resumes restart the current floor from its entry checkpoint. Mode records and character tips must remain isolated.

- Descent room-edge arrivals have a one-second shadow warning with glow, shadow, audio and offscreen cues. Announce offscreen arrivals without changing enemy movement, targeting or damage timing.

- This hero lineup is PROTOTYPE ONLY on `codex/new-heroes`. Open a PR for owner playtesting; DO NOT merge or push to main. Keep the authored floor layouts and arrival cues.

- The landscape/skills prototype lives on `codex/landscape-skills`. Open a PR for playtesting; DO NOT merge or push main. v11 skill fields are additive and must default safely for old runs.
