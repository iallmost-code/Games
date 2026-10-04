# Ember Crypt

Current playable build: **v63 Into the Depths**
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

Bloodknight trades ranged attacks for a 150° greatsword sweep with a 95px starting radius and a 0.55s starting interval. Base stats are 140 HP, 45 armor, 207 movement speed and 58 damage. While moving, the blade aims at the nearest reachable foe within swing reach, falling back to movement direction when none is close. Standing still aims at the nearest visible foe. Quick Hands speeds up swings, Long Reach enlarges their radius, and Twin Flame adds rear sweeps. Blood/Earth fairies strike through pulses, so the hero fires no projectiles.

Bloodletting, Crimson Thirst, Berserk, Blood Pact, Stone Skin, Shockwave, Earth Spikes and Quake Step support the Crimson Tide, Tremor and Juggernaut evolutions. The Bestiary preserves existing matchups and adds Blood/Earth weaknesses and resistances.

Run saves now use v10. Existing v9 runs migrate to ENDLESS with their current state intact; profiles, shrine upgrades, embers, hero unlocks and slots keep their existing keys and progress. THE DESCENT continues at the start of its saved floor, using the hero, level, XP and gear checkpoint taken when entering that floor. Save codes accept both v9 and v10. The existing cumulative boss count supplies the Bloodknight unlock.

Boss doors open after 180 seconds or the floor kill goal. Defeat the guardian and walk onto the stairs. Ash Catacombs, Frost Vault, Venom Hollow, The Sunken Halls and The Heart Chamber culminate in the Crypt Heart victory. Walls block movement, projectiles and blade swings. See [tests/README.md](tests/README.md) for browser checks and the seeded Endless balance simulation.

Floor 1 tuning reduces regular enemy arrivals by 25%, limits living Cinder Imps to three, and activates lava vents every 16 seconds instead of eight. Relative regular-spawn rates across floors are 75%, 85%, 95%, 100% and 105%; later floors keep their full hazard cadence. The minimap is approximately 30% smaller with 75% opacity. These changes leave Endless spawn and hazard pacing unchanged.

## Floor variety and entrances

Ash Catacombs keeps roomy introductory combat chambers with smaller side crypts. Frost Vault uses long halls, Venom Hollow branches from a large central hub, The Sunken Halls has upper/lower loops around its main rooms, and The Heart Chamber has a long approach to an enlarged final chamber. Each layout keeps a single locked boss entrance and connected rooms for its well, forge and vault.

Ordinary Descent enemies arrive from dark room-edge entrances with a one-second warning: a growing glow, an extending shadow and a low audio cue. Up to three offscreen entrances are marked with small edge arrows. The doorway announces an offscreen pack as it starts approaching; creatures keep their normal movement and remain visible and attackable when they reach the viewport. Arrivals still begin outside the viewport. Ash retains its previously tuned map and room-edge spawn distribution so the warning adds advance notice without funneling packs through a handful of points. Floor 1's reduced spawn rate, three-Imp cap and halved lava cadence remain intact. Endless arrivals are unchanged.

Existing v10 saves still resume from the current floor's entry checkpoint; layouts/entrances are rebuilt and arrival cues clear when the floor restarts. No profile or save reset is required.
