# v76 · COMBAT FEEL

This update makes the existing attacks read more clearly through animation, impact feedback and sound. It keeps the same heroes, balance, controls and progression.

## Hero presentation

- Bloodknight: an early visual coil followed by a heavy forward swing, crimson blade accent and lower metal impact.
- Frost Warden: a planted shield-bash recoil with brief compression, an icy shield edge and crystal/stone impact.
- Storm Ranger: short backward bow recoil, a readable string accent and separated bow/thunder layers.
- Shadow Rogue: quick forward release, paired dagger accents and light metal impact, including direct poison hits.
- Emberweaver: cast recoil, rising flame strokes and a fire-crackle impact.
- Gravecaller: a restrained casting lift, violet rune accent and soul/bone impact.
- Sunwarden: a gentle ritual lift, golden halo accent and holy chime.

All visual phases fit inside existing cast clocks. Damage still occurs at the original time; anticipation never delays an attack. Existing six-frame authored sprites, mirrored directions, mastery palettes and fallback sprites remain in use.

## Enemy feedback and readability

Direct hits give sprites a short directional recoil, without moving enemies or their hitboxes. Compact impact marks and critical-hit rings sit just above the struck sprite in the depth queue. Ground shadows, hero ring, dangerous outlines, boss cues and health bars keep their original behavior.

Periodic damage-over-time ticks do not produce repeated recoil or extra impact sounds. Direct poison daggers and blood swings still produce feedback. Impact direction is relative to the hero rather than a reconstructed projectile trajectory.

## Performance and compatibility

The new module uses no RNG, native timers, new textures, per-frame filters or hitstop. Its reaction state is transient in a WeakMap. Hit accents reuse a bounded pool and cap at 24/16/8 events and 64/32/16 particles for High/Medium/Low. Effects use the game clock so pause freezes them. Attack and impact audio reuse existing samples and the same 12-voice limiter/master compressor.

Isometric depth sorting and Classic immediate drawing both work. Missing cosmetic helpers preserve the existing rendering path. The service-worker shell includes the new module and advances its cache to v76. Profiles remain v2, run saves v12 and codes EC1.

## Verification

The focused suite exercises all seven heroes at 390×844 and 844×390 with DPR 3, without raising the canvas pixel budget. It checks distinct mirrored attack profiles, directional reaction bounds, unchanged world state while drawing, save purity, a real RAF loop with keyboard movement/Dash/Ultimate, paused clock stability, Classic painting, optional-module failure and real Web Audio decoding/voice admission.

GitHub Actions also runs the existing complete regression matrix. The authored animation suite uses a real canvas for transforms while retaining every original frame-clipping and foot-anchor assertion. Gameplay invariants retain the pinned original baseline and normalize only the exact combat-hit hook and marked cosmetic periodic tags on existing bleed/pool ticks.

Browser emulation and Linux headless rendering verify layout, rendering and resource caps; they do not establish physical Android frame rates or subjective audio quality. Owner mobile playtesting remains necessary before merging.
