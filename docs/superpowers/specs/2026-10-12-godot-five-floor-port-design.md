# Ember Crypt: Godot 4.7.2 seven-hero, five-floor port

Status: proposed design for owner review; implementation has not started.

## Purpose and boundaries

The owner wants to play the first five real Ember Crypt floors in the Godot Web Editor with every current character and the full game's systems, to assess the engine before replacing the browser game. Expand the existing native Godot prototype rather than embedding the HTML game or only swapping its Bloodknight sprite.

Target Godot 4.7.2 Standard/GDScript and the Compatibility renderer. Deliver source plus a ready-to-preload ZIP with explicit directory entries, matching the installer repair already verified in PR #25. No desktop installation, C#, addons or export templates required for playtesting. Keep the live JavaScript game unchanged. Work on codex/godot-five-floors; eventual implementation PR stays unmerged.

Production source baseline is main ffa4c79f846a0e88218c549bea29e77afc8c35d8 (v78 ENDLESS OVERTIME). Prototype baseline is 7d6d7c2 from codex/godot-web-preview. Record any later incorporated baseline explicitly. The existing demo is roughly 830 lines across five scripts, compared with more than 8,000 lines in the main browser file plus external modules; extending it is a substantive port, not a sprite/map patch.

## Player-visible result

Start with character slots, hero selection, mode/settings screens and a PREVIEW ALL HEROES menu option. Preview access lets the owner try the seven characters immediately without falsely awarding persistent unlocks, achievements or mastery. Normal progression still uses the original unlock conditions. Do not silently carry the demo's always-ready Ultimate or shortened boss-door goal into normal runs.

A normal Descent run starts on Ash Catacombs and carries its character, XP, chosen powers, gear, relics, resources and applicable timers through the five floors. Boss doors open after 180 seconds on the floor or its kill goal, whichever comes first. Boss death creates stairs; walking onto them transitions to the next floor. Floor 5 pays the original victory/rewards/clear unlock once. Floors 6–10 are outside this delivery; the victory menu must honestly label deeper floors as unavailable in this build and retain their imported records without resetting them.

| Floor | Name | Boss | Kill goal | Hazards |
|---|---|---|---:|---|
| 1 | Ash Catacombs | Crypt Warden | 100 | Ash/lava vents and their warnings |
| 2 | Frost Vault | Bone Tyrant | 130 | Ice/sliding patches |
| 3 | Venom Hollow | Colossus | 160 | Spore bursts/poison |
| 4 | The Sunken Halls | Oracle | 190 | Original mixed hazards |
| 5 | The Heart Chamber | Crypt Heart | 220 | Original Heart chamber attacks |

Copy the existing room/corridor/door/side-room definitions and navigation rules exactly. The demo's Frost Walk rooms and Crypt Warden-in-Frost encounter are replaced by the real floor definitions. Walls and void remain solid; enemies and projectiles obey collision/LOS, and melee cannot strike through walls. Preserve the tuned Floor 1 arrival rates, Cinder Imp cap and hazard count, elite/champion behavior and original arrival warnings.

## Heroes: mechanics, not cosmetic variants

| Hero | Elements | Required distinctive mechanics |
|---|---|---|
| Gravecaller | Arcane + Shadow | Weak bolt; raised skeletons, wisps, life drain, giants/spirits; Army of the Dead |
| Storm Ranger | Frost + Lightning | Arrows, wolf, automatic traps, volley/chaining/chill; Arrow Storm |
| Emberweaver | Fire + Poison | Existing bolts, burn/poison and spell interactions; Firestorm |
| Bloodknight | Blood + Earth | Reach-aware automatic blade arc, bleed/heal, pact, shockwave/earth effects; Earthsplitter |
| Sunwarden | Light + Wind | Rotating beam, gusts, healing/control zones and pillars; Solar Flare |
| Shadow Rogue | Poison + Shadow | Short-range daggers, taunting Dash decoy, invisibility/guaranteed crits; Night Veil |
| Frost Warden | Ice + Earth | Shield arc, safe enemy-only ice walls, tank effects; Glacier Fortress |

Use current source stats, timings, ranges, costs, charge formulas, status behavior and unlocks, including later source changes; earlier chat suggestions are not authoritative when the code differs. Each hero gets its authored front/side/back walk, attack, hit and death frames, facing, foot anchor, select/slot portrait, sounds and mastery palette variants. Hero-specific upgrade pools remain isolated even when two heroes share an element. Summons and wolves need distinct friendly visuals and independent combat/expiry behavior.

## Feature parity inventory

The completion checklist includes all of the following; omitted items cannot be described as ported:

- Automatic attacks, Dash and all seven Ultimates; keyboard, mouse and touch; pause and correct invulnerability/charge clocks.
- XP drops, attraction, XP thresholds, level-up choices, rerolls, rank caps, shared cards, hero/element-specific spells, fairies and every permitted evolution/condition.
- Element weakness/resistance tables, crits, DOT, chill/stuns/slows, knockback, armor regeneration, regen/heal, lifesteal and interaction ordering.
- Current ordinary/zone foes, elites, named champions and modifiers, treasure imps, waves/surprises, all five bosses, telegraphs, arrival cues, drops and kill credit.
- Weapons/armor, gear chests, relics, optional hero-specific legendary gear, elemental damage ledger and collection behavior.
- Wells, forges, vaults, rescue/cache encounters, shops/run gold, secret rooms and camp choices/provisions in the floors where they currently occur.
- Classic and seeded random Descent layouts, difficulty settings, Crypt Depths, Torment, daily challenge with its existing UTC hero/modifier/seed policy, per-mode records, and current Endless including its wave-20 victory/continuation/overtime. Descent content beyond Floor 5 is the only dungeon-length exclusion.
- Embers, shrine purchases, unlocks, achievements, bestiary, per-slot first-run tips/reset, hero mastery XP/perks/palettes, run history and rewards credited once per run.
- Settings for sound, music, shake, view/quality/speed where applicable; bronze/stone HUD, minimap, hero ring, boss/elite visibility, damage numbers and readable dangerous effects. No paid currency, multiplayer or invented systems.

The baseline does not include the unmerged World & Presence PR #23. Existing Godot depth/lighting can be retained and improved for readability, but preserve source gameplay. Do not silently merge unrelated browser changes into main.

## Architecture

Retain Cartesian world positions and map collision as the authoritative model. Projection is a visual transform; input uses its inverse. Godot Node2D/AnimatedSprite2D/CanvasLayer/Camera2D provide presentation. Rendering never grants damage/rewards, changes positions, or determines combat timing.

Replace the demo's single catch-all preview.gd through staged extraction into:

1. Content registry: exported stable IDs/data for heroes, floors, foes, cards/evolutions, relics, shrine, achievements, elements and gear. Map browser callback semantics to explicit GDScript effect handlers; descriptions alone are not implementations.
2. Run model/coordinator: mode, floor, clocks, progression, checkpoint, transitions and deterministic gameplay RNG. Daily/procedural RNG must not be consumed by art/particles.
3. World/navigation: grids, room graphs, authored/random assembly, wall/void collision, LOS, safe arrival points, boss gates, stairs and interactable placement. Enemy-only ice blockers never become hero/allied blockers or obstruct gates/stairs/shop pads.
4. Combat/status service: damage pipeline, armor/invulnerability, status durations/ticks, elements, kill/reward credit and Ultimate charge, with source-equivalent ordering and rates.
5. Hero behaviors: seven explicit modules and reusable projectiles, beam/arc, summon/companion, traps and area effects. Shared APIs prevent copies of damage/credit/save rules diverging.
6. Progression/loot: card eligibility/application, evolution checks, relic/gear hooks, interaction standing pads and rewards, mastery and achievement dispatch.
7. Persistence: serializable portable models, schema validation/migrations, slots, atomic writes and explicit EC1 import/export; no Node/Resource references in payloads.
8. Presentation/UI/audio: reusable actor/prop scenes, depth sorting, cached resources, quality-scaled effects, HUD/minimap, menus, tips and audio/music buses. Cosmetic state stays transient.

Use readable Godot scenes/resources where they help inspection in the Web Editor, instead of making every system a larger single runtime script. Maintain a launchable game after each integration stage.

## Saves and transfer

Godot Web Editor's IndexedDB-backed user filesystem and the browser game's localStorage belong to different origins. The port cannot automatically read the existing browser saves. Transfer uses an explicit EC1 code exported from Ember Crypt, imported into a selected Godot slot with validation and confirmation before replacement. Preserve the source slot count and isolation; playtesting must never write to the browser game.

Preserve profile-v2/run-v12/EC1 portable semantics where supported. Godot-specific presentation preferences may be separate local fields, not inserted into portable combat records. EC1 is UTF-8 JSON inside URL-safe Base64 with an unsigned 32-bit FNV-1a-style checksum rendered in base 36. The source hashes UTF-16 code units, not UTF-8 bytes; reproduce surrogate handling and raw JSON checksum before parsing. Check source validation bounds, old v9→Endless migration, hero replacements and v10/v11 defaults. Do not assume EC1 is gzip-compressed.

Continue restarts a Descent floor at its entry checkpoint, including seeded layout, run gold/shop/encounter rollback and retained legitimate profile discoveries. Endless restores its current supported state. Unknown profile fields and deeper-floor records are retained losslessly. Imported Floor 6–10 runs must remain intact and labeled unsupported, without being converted to Floor 5, awarding a clear, or resetting the profile. Reject invalid/truncated codes without mutating the selected slot. Godot-produced EC1 codes are only labeled browser-compatible after round-trip tests in the original game.

## Web Editor packaging and performance

Include every parent directory before file entries, root project.godot, safe relative ASCII paths, no symlinks/nested archives/.godot cache/import/UID metadata, and CRC/source-hash validation. Test fresh preload/install/play in the official 4.7.2 Web Editor. Native headless import is necessary but not sufficient.

Reuse WebP art with fallback assets where practical. Avoid carrying unused duplicate textures into the preload package; cap active/cached palette variants, lights, particles and voices. Keep the original auto-quality behavior as an equivalent Godot policy without changing dt/combat simulation. Target 60 FPS on capable hardware with graceful quality reduction. Document actual archive size and measured lab timings; do not assert physical Android/PC FPS from headless Chromium. Browser testing must wait for editor readiness and use focused canvas keyboard shortcuts instead of assuming fixed toolbar coordinates.

## Implementation sequence and acceptance gates

A. Content/parity extraction and modular native foundation: record all current behavior/data IDs and compare them against the source; retain the current runnable slice while extracting model/world/UI boundaries.

B. All seven heroes on one real Ash map: distinct attacks, Dash, Ultimates, animations, allies, traps and walls; no fallback of multiple heroes to identical bolt behavior. Preview selection makes every hero accessible.

C. All first-five-floor content: original layouts, safe arrivals, hazards, zone foes, bosses, side rooms, minimap and stair transitions. Eliminate demo-specific 45-second/12-kill shortcuts in normal runs.

D. Run-level systems: full upgrade/evolution/element pools, loot/relic/legendary hooks, surprises, interactions, random layouts, Depths/difficulty/Torment, daily and Endless.

E. Persistent progression: slots, embers/shrine, unlocks, achievements/bestiary/tips, mastery/history, save/checkpoint/EC1 migration and round-trip tests.

F. Presentation, resource caps and Web Editor packaging: match zone/hero quality; actual 35 hero×floor assisted playthroughs plus unboosted balance comparison, menus/input orientations, fresh ZIP/browser installation and all CI checks. Provide the final package and a clear parity report; do not claim full parity while any inventory item is a placeholder.

Tests must cover source-equivalent per-hero damage/attack cadence/status eligibility, all card/evolution handlers, wall/LOS behavior, minion/wolf credit/expiry, decoy targeting, enemy-only ice walls, Dash versus slams, charge rates, original boss phases, connected Classic/random maps, shop/secrets, reward/mastery idempotence and five-floor transitions/victory. Compare seeded normal-stat survival against the source under the same bot policy; don't balance around HP/damage boosts.

Persistence coverage includes old/new saves, non-ASCII EC1 names/checksums, malformed-code rejection, three-slot isolation, checkpoint rollback, deeper-run preservation and original-browser round trips. Real Web Editor checks include movement, mouse/touch skills, held joystick plus a second-finger skill, pause/resume and successful clean installation. Native assertions must fail on engine/script errors, not merely print a success marker after a partial _ready failure.

## Review decisions

This design interprets “all the stuff from the full game” to include the feature inventory above, including existing non-Descent modes and permanent progression. Only Floors 6–10 and their unique bosses/foes/props are deferred. Preview-unlock access is separate from earned progression. Review this interpretation before an implementation plan is written: a narrower character/floor-only preview would be a different deliverable and must not be called a full port.
