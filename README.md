# Ember Crypt

Current playable build: **v62 The Descent**
Play: https://iallmost-code.github.io/Games/ (GitHub Pages, deployed from `main`)
ChatGPT Sites copy: https://ember-crypt.alpine0-0.chatgpt.site

This is the complete mobile browser game source. Open `index.html` in a browser or serve this folder with `python3 -m http.server 8000` and visit http://localhost:8000. The game uses plain HTML, CSS, JavaScript, and the art in `assets/`; there is no build step.

## Work on it in Codex

Select this repository and its default branch, `main`, in a Codex Cloud environment. `AGENTS.md` records the game constraints. Pushing to `main` redeploys the GitHub Pages link within a minute or two; the ChatGPT Sites copy is separate and is not updated by commits.

## Current game

- Four heroes: Crypt Mage (Arcane/Shadow), Stormcaller (Frost/Lightning), Emberweaver (Fire/Poison), and Bloodknight (Blood/Earth, unlocked after three cumulative boss defeats).
- THE DESCENT (default): five authored floors with rooms, corridors, locked guardian chambers, stairs and an explored-room minimap.
- ENDLESS: the original arena, wave 20 Crypt Heart and subsequent endless tiers. Both modes retain zone hazards, relics, evolutions, depth modifiers, treasure imps and elite events.
- Three named local save slots, mode-specific depth/kill records, shrine, bestiary, achievements, and save-code export/import. First-run tips are tracked per character and can be reset in Settings.
- One-thumb play: joystick at bottom center, automatic attacks, pause control. Sound and speed are in Settings.
- Cinematic art loads as WebP with PNG fallback. The frame limiter is 40 FPS.

## Files

- `index.html` — game and menus
- `assets/` — legacy sprites and cinematic art sheets
- `ARTWORK.md` — art asset notes
- `AGENTS.md` — development rules for Codex

This repository snapshot contains the current build and assets. The browser stores progress locally per device; importing this code does not transfer a player's save. Use Settings → Copy save code / Load save code for that.

## Bloodknight

Bloodknight trades ranged attacks for a 150° greatsword sweep with a 95px starting radius and a 0.55s starting interval. Base stats are 140 HP, 45 armor, 207 movement speed and 58 damage. Moving aims the blade; standing still aims at the nearest foe. Quick Hands speeds up swings, Long Reach enlarges their radius, and Twin Flame adds rear sweeps. Blood/Earth fairies strike through pulses, so the hero fires no projectiles.

Bloodletting, Crimson Thirst, Berserk, Blood Pact, Stone Skin, Shockwave, Earth Spikes and Quake Step support the Crimson Tide, Tremor and Juggernaut evolutions. The Bestiary preserves existing matchups and adds Blood/Earth weaknesses and resistances.

Run saves now use v10. Existing v9 runs migrate to ENDLESS with their current state intact; profiles, shrine upgrades, embers, hero unlocks and slots keep their existing keys and progress. THE DESCENT continues at the start of its saved floor, using the hero, level, XP and gear checkpoint taken when entering that floor. Save codes accept both v9 and v10. The existing cumulative boss count supplies the Bloodknight unlock.

Boss doors open after 180 seconds or the floor kill goal. Defeat the guardian and walk onto the stairs. Ash Catacombs, Frost Vault, Venom Hollow, The Sunken Halls and The Heart Chamber culminate in the Crypt Heart victory. Walls block movement, projectiles and blade swings. See [tests/README.md](tests/README.md) for browser checks and the seeded Endless balance simulation.
