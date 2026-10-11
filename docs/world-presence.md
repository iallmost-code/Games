# v77 · WORLD & PRESENCE

This pass addresses the busy Frost Vault screenshot: the hero blending into large enemies, repeated tomb silhouettes and bright rectangular light bands. It changes presentation while retaining every collider, attack clock, target, damage value, save format and control.

## What changes

All seven authored heroes are about 11% larger on screen, with a cached dark silhouette edge and restrained upper rim. If a nearby enemy covers the hero, one subdued sprite redraw uses the exact same authored frame, facing, mastery palette, foot anchor and combat recoil. It honors invisibility and invulnerability flicker. Missing authored sheets keep the existing legacy renderer.

Endless obstacle rectangles receive four deterministic architectural treatments: tombs, statue plinths, paired columns and broken masonry. Their full original collision footprints remain visible. Upper geometry fades near the hero. Bounded arch/column landmarks and faint engravings use each zone's existing atlases across Descent and Endless. Descent layouts, boss routes and stairs remain intact; no extra collision geometry is created.

Sunwarden's existing ground beam uses one cached, soft-edged texture with fading endpoints instead of broad hard-ended strokes. Its range, width, rotation and wall clipping are unchanged. Ambient pools and ordinary spell light are less intense; boss telegraphs, dangerous attacks, health bars and the hero ring retain their existing rendering. Ordinary damage numbers have a quality-scaled display budget and dark edges. Critical, weakness and status messages take priority; the underlying floater queue is untouched.

## Resource bounds and compatibility

- Extra architectural groups: High 3, Medium 2, Low 1.
- Ordinary damage-number display budget: High 24, Medium 18, Low 12, minus space used by priority messages. Priority messages are never suppressed.
- Hero edge cache: at most 32 frames; one optional occlusion redraw per render.
- One reusable beam texture; no new art downloads, per-enemy filters, particles, native timers or gameplay RNG calls.
- Existing quality tiers, 1.8M High pixel budget, 60 FPS High target and 40 FPS Low cap remain in force.
- Classic view and absent cosmetic modules use the existing fallback paths. Service-worker cache advances to v77 and includes the helper.
- Profiles remain v2, runs v12 and save codes EC1. The original gameplay-invariant baseline and exceptions are unchanged.

## Verification

`tests/world-presence.cjs` renders all seven heroes in both modes at 390×844 and 844×390 with DPR 3. It checks all ten Descent floors, three Endless zones, unchanged world/collision state during rendering, v12 save output, helper/legacy-art fallback, cache and quality bounds, deterministic scenery, critical-label overflow and actual beam alpha. The suite captures comparable busy Frost Vault scenes before/after, plus tightly packed stress scenes, as GitHub Actions artifacts.

The complete existing suite remains required, including real frame-loop movement/Dash/Ultimate checks, boss invulnerability, floor connectivity, save migrations, slot isolation, EC1, authored sprite clipping and normal-stat survival bots. Desktop/headless phone emulation verifies resource and layout constraints; it does not measure physical Android frame rates. Owner playtesting remains the final visual/performance check before merging.
