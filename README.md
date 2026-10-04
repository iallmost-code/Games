# Ember Crypt

Current playable build: **v61 Blood & Stone**
Play: https://iallmost-code.github.io/Games/ (GitHub Pages, deployed from `main`)
ChatGPT Sites copy: https://ember-crypt.alpine0-0.chatgpt.site

This is the complete mobile browser game source. Open `index.html` in a browser or serve this folder with `python3 -m http.server 8000` and visit http://localhost:8000. The game uses plain HTML, CSS, JavaScript, and the art in `assets/`; there is no build step.

## Work on it in Codex

Select this repository and its default branch, `main`, in a Codex Cloud environment. `AGENTS.md` records the game constraints. Pushing to `main` redeploys the GitHub Pages link within a minute or two; the ChatGPT Sites copy is separate and is not updated by commits.

## Current game

- Four heroes: Crypt Mage (Arcane/Shadow), Stormcaller (Frost/Lightning), Emberweaver (Fire/Poison), and Bloodknight (Blood/Earth, unlocked after three cumulative boss defeats).
- Three zones, element weaknesses, relics, evolutions, depth modifiers, treasure imps, elite events, and the Crypt Heart at wave 20.
- Three named local save slots, run resume, shrine, bestiary, achievements, and save-code export/import.
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

Existing profile and run formats remain compatible: the v9 run container still serializes the hero object, optional Bloodknight properties have safe defaults, and old profiles retain their heroes, shrine upgrades, embers and depths. The existing cumulative boss count supplies the new unlock. See [tests/README.md](tests/README.md) for browser checks and the seeded balance simulation.
