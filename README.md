# Ember Crypt

**Prototype: v64 Five Heroes — branch `codex/new-heroes`, awaiting owner playtest.**
The public links below still serve the published main build.
Play: https://iallmost-code.github.io/Games/ (GitHub Pages, deployed from `main`)
ChatGPT Sites copy: https://ember-crypt.alpine0-0.chatgpt.site

This is the complete mobile browser game source. Open `index.html` in a browser or serve this folder with `python3 -m http.server 8000` and visit http://localhost:8000. The game uses plain HTML, CSS, JavaScript, and the art in `assets/`; there is no build step.

## Work on it in Codex

Select this repository and its default branch, `main`, in a Codex Cloud environment. `AGENTS.md` records the game constraints. Pushing to `main` redeploys the GitHub Pages link within a minute or two; the ChatGPT Sites copy is separate and is not updated by commits.

## Current game

- Five heroes: Gravecaller (Shadow/Arcane, starter summoner), Storm Ranger (Frost/Lightning, bow/wolf/traps, unlocked after one boss), Emberweaver (Fire/Poison), Bloodknight (Blood/Earth, unlocked after three cumulative bosses), and Sunwarden (Light/Wind, unlocked at Descent floor 3).
- THE DESCENT (default): five authored floors with rooms, corridors, locked guardian chambers, stairs and an explored-room minimap.
- ENDLESS: the original arena, wave 20 Crypt Heart and subsequent endless tiers. Both modes retain zone hazards, relics, evolutions, depth modifiers, treasure imps and elite events.
- Three named local save slots, mode-specific depth/kill records, shrine, bestiary, achievements, and save-code export/import. First-run tips are tracked per character and can be reset in Settings.
- Joystick + Dash + Ultimate controls: automatic attacks, pause control, sound and speed in Settings. Landscape fills the screen with a floating left joystick and 72px right skill buttons; portrait keeps the bottom-center joystick and smaller right buttons.
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

Profiles now carry version 2 and run saves use v11. Existing profile keys, embers, shrine upgrades, achievements, slots and mode records remain intact. Crypt Mage characters and depth records migrate to Gravecaller; Stormcaller characters, unlocks and records migrate to Storm Ranger. Existing v9/v10 run keys and EC1 save codes are accepted. Removed-hero runs restart safely as their replacement with shared stats retained and obsolete elemental builds cleared. Descent resumes its current floor entry checkpoint; Endless clears its old encounter and restores full HP/armor. Other heroes keep their existing run state. Temporary allies/traps/spirits/zones serialize in Endless and rebuild at a Descent floor restart.

Boss doors open after 180 seconds or the floor kill goal. Defeat the guardian and walk onto the stairs. Ash Catacombs, Frost Vault, Venom Hollow, The Sunken Halls and The Heart Chamber culminate in the Crypt Heart victory. Walls block movement, projectiles and blade swings. See [tests/README.md](tests/README.md) for browser checks and the seeded Endless balance simulation.

Floor 1 tuning reduces regular enemy arrivals by 25%, limits living Cinder Imps to three, and activates lava vents every 16 seconds instead of eight. Relative regular-spawn rates across floors are 75%, 85%, 95%, 100% and 105%; later floors keep their full hazard cadence. The minimap is approximately 30% smaller with 75% opacity. These changes leave Endless spawn and hazard pacing unchanged.

## Floor variety and entrances

Ash Catacombs keeps roomy introductory combat chambers with smaller side crypts. Frost Vault uses long halls, Venom Hollow branches from a large central hub, The Sunken Halls has upper/lower loops around its main rooms, and The Heart Chamber has a long approach to an enlarged final chamber. Each layout keeps a single locked boss entrance and connected rooms for its well, forge and vault.

Ordinary Descent enemies arrive from dark room-edge entrances with a one-second warning: a growing glow, an extending shadow and a low audio cue. Up to three offscreen entrances are marked with small edge arrows. The doorway announces an offscreen pack as it starts approaching; creatures keep their normal movement and remain visible and attackable when they reach the viewport. Arrivals still begin outside the viewport. Ash retains its previously tuned map and room-edge spawn distribution so the warning adds advance notice without funneling packs through a handful of points. Floor 1's reduced spawn rate, three-Imp cap and halved lava cadence remain intact. Endless arrivals are unchanged.

Migrated v10 and new v11 saves still resume from the current floor's entry checkpoint; layouts/entrances are rebuilt and arrival cues clear when the floor restarts. No profile or save reset is required.

## Prototype hero kits

Gravecaller fires a weak Arcane bolt. Player-owned kills have a 35% chance to raise a violet skeleton for 25 seconds, up to four initially. Skeletons hunt enemies, can draw ordinary foes away from the hero, and can die in combat. Bone Armor, Grave Burst, Siphon, Spirit Wisps, Soul Link, Arcane Lance and the two fairies support the army. Raise Legion adds capacity. Legion doubles it; Ossuary merges five skeletons into a 15-second bone giant; Soul Storm releases homing spirits when minions die. Bosses keep targeting the hero.

Storm Ranger fires fast individual arrows at nearby targets; Twin Flame adds independently aimed arrows. The wolf hunts nearby foes, takes contact damage and returns after three seconds if defeated. Moving drops a trap every 2.8 seconds. Frost Arrows, Ice Trap, Glacier Wolf, Chain Shot, Shock Trap, Thunder Volley and fairies support Shatterstorm, Alpha Pack and Blizzard Line. Arrows have no splash. Lightning chains and freezing trap links respect dungeon walls.

Sunwarden rotates a broad light beam that briefly dazzles foes and uses periodic wind gusts to push them away. Its 4 HP/s passive regeneration and low per-hit damage emphasize sustain and control. Radiance, Sanctuary, Judgment, Gale, Cyclone, Tailwind and fairies support Dawnbreaker's three beams, Eye of the Storm's wind ring and Halo's following sanctuary. Shared Quick Hands speeds damage ticks, Twin Flame widens the beam, and Long Reach extends it. Light and Wind add Bestiary matchups and card colors.

All abilities remain automatic. New heroes see only their own elements plus shared cards. This branch includes the authored-floor/arrival-cue work and excludes the separate 2.5D experiment. To try it locally, check out `codex/new-heroes` and serve the repository with `python3 -m http.server 8000`. See [tests/README.md](tests/README.md) for normal-stat survival results and the distinction between assisted progression and balance diagnostics.

For immediate owner playtesting, [tests/new-heroes-playtest.ec1.txt](tests/new-heroes-playtest.ec1.txt) unlocks all five heroes in a fresh prototype slot with no embers or shrine upgrades. Import it via Settings → LOAD SAVE CODE. Normal unlock conditions are unchanged.

## Landscape + skills prototype

`codex/landscape-skills` builds on the five-hero prototype. Keep its PR unmerged for owner playtesting. In landscape, touch below the HUD within the left 40% of the screen to place the floating joystick; use the right thumb for Dash and Ultimate. Portrait keeps the fixed joystick. Desktop: WASD/arrows move, Space dashes, E uses the Ultimate. Attacks remain automatic.

Dash travels for 0.25 seconds with invulnerability and cannot cross walls. Its four-second cooldown is shown on the circular button. The new Fleet Step shrine upgrade reduces cooldown by 0.3 seconds per rank, to 2.8 seconds. Existing Swift Boots ranks retain their movement bonus.

Ultimates charge from actual damage and kills, with a combat-second charge cap to prevent instant refills in dense waves. No combat means no charge. The gold button fills and pulses when ready; using it produces a short flash, sound and an ability announcement:

| Hero | Ultimate |
|---|---|
| Emberweaver | Firestorm: meteors rain over the visible arena for five seconds. |
| Bloodknight | Earthsplitter: a large nearby Earth slam with two seconds of stun. |
| Gravecaller | Army of the Dead: eight additional skeletons, lasting 15 seconds, separate from the ordinary minion cap. |
| Storm Ranger | Arrow Storm: 32 lightning arrows in a full circle, chaining to nearby foes. |
| Sunwarden | Solar Flare: full heal and four seconds of blindness/slow on visible, unobstructed foes. Bosses retain their telegraphed attack cadence. |

Profiles v2, run keys v11 and EC1 codes remain compatible. Skill state is stored as optional hero fields; old runs default to ready Dash and zero Ultimate charge. Endless preserves charge/cooldown and temporary armies. Descent continues to resume from the current floor's entry checkpoint.

Run `tests/landscape-skills.cjs` for both phone orientations, real multi-touch input, all five Ultimates, Dash versus boss slams, old-field defaults, save codes, slot isolation and normal-stat charge timing.
