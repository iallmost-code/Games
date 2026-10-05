# Ember Crypt cinematic art pass

These original game assets were generated with the built-in image-generation tool in generation mode. The character and prop sheets use transparent backgrounds; the floor atlas is opaque. The browser slices and trims the original sheets on load. No gameplay or save format changes are part of this art pass.

The runtime requests each matching `.webp` first (quality 85, full alpha quality), and uses the `.png` only if the image fails to load. The five WebP files total about 2.9 MB versus about 12 MB for the PNG originals.

## Assets and prompt briefs

- `dist/assets/cinematic/heroes.png`: dark fantasy full-body character sheet, three distinct heroes in front, side, back and casting poses. Crypt Mage in charcoal and bone with a violet staff; Stormcaller in blue steel with pale hair and a frost staff; Emberweaver in crimson and gold with red hair and flame magic. Consistent lighting, detailed materials, transparent 4-by-3 grid.
- `dist/assets/cinematic/monsters.png`: detailed dungeon monsters in front/back pairs: ghoul, runner, brute, hexer, skeleton, sentinel, burrower and wraith. Full bodies, clear silhouettes, consistent elevated camera, transparent 4-by-4 grid.
- `dist/assets/cinematic/bosses.png`: front/back pairs for Crypt Warden, Bone Tyrant, Colossus, Oracle, Crypt Heart, Cinder Imp, Frost Golem and Spore Spitter. Dark fantasy armor, stone, bone, fire, ice and fungal materials. Transparent 4-by-4 grid.
- `dist/assets/cinematic/floors.png`: three square dungeon floor materials in a horizontal atlas: cracked basalt and embers, frozen slate and ice, damp moss and poisonous stone. Top-down, detailed worn surfaces, intended for repetition.
- `dist/assets/cinematic/props.png`: eight isolated dungeon objects: ash tomb, frost tomb, mossy tomb, hooded statue, burning brazier, moon well, treasure chest and broken pillar. Consistent elevated camera, detailed materials, transparent 4-by-2 grid.

## Integration

Directional character art and casting poses, cached walk frames and hit masks, separate hero portraits, three zone textures, textured obstacles and landmarks, cached soft ground shadows, cached hero lighting and vignette. The existing camera scale and 40 FPS frame limiter are retained.

The hero renders at 55 × 80 logical pixels instead of 46 × 67, about 20% larger. A cached, softly glowing two-color floor ring identifies each hero's elements in crowds.

The zone floor tiles are processed once at load to lower brightness and color saturation; caster, charger and elite outlines are cached from their sprite masks. Walking adds a small step bob and directional lean, while hits compress the sprite briefly. Hostile projectiles have a bright core and colored rim. HUD, menus, choices and joystick use stone and bronze materials with gold accents while elemental card colors remain distinct.

## Checks

JavaScript syntax; profile separation, save-code round-trip, legacy save migration, pause/resume and menu navigation; actual canvas rendering of the new atlases, portraits and all three heroes in crowded 90-enemy scenes. CPU canvas timings are diagnostic only and do not measure phone browser FPS.

## Bloodknight row (v61)

`assets/cinematic/bloodknight.png` is an original generated transparent 2172 × 724 single-row sheet matching the existing heroes: dark-crimson plate, horned helm and a notched greatsword in front, side, back and attack poses. `bloodknight.webp` uses quality 85 and full alpha quality (about 427 KB versus 1.9 MB PNG). The original three-hero atlas is unchanged.

The new atlas has transparent gutters at 25%, 50% and 72% of its width. The wider final cell contains the complete sweeping sword. The runtime slices these cells and loads WebP first with PNG fallback. A distinct attack sprite replaces the idle pose during the red blade arc; the Blood/Earth floor ring remains visible. No per-enemy blur is added.

## New-hero prototype atlas (v64)

`assets/cinematic/new-heroes.png` is a generated transparent 1448 × 1086 painted atlas. Row one is the hooded blue-grey leather Storm Ranger with longbow in front/side/back/bow-draw poses. Row two is the white/gold armored Sunwarden priestess with sun-disc staff in front/side/back/cast poses. Row three is the frost wolf in front/side-run/back/bite poses. Runtime wolf gutters use 0%, 23%, 52%, 73.5%, 100% cuts to retain the wider running and biting silhouettes. Hero cells use equal quarters. `new-heroes.webp` uses quality 90 with alpha (about 535 KB), with the original PNG (about 2 MB) as fallback. Unique attack/cast poses are used during automatic attacks.

Gravecaller reuses the original Crypt Mage row without modifying the original sheet. Friendly skeletons reuse the enemy skeleton poses with a cached violet tint, violet outline, friendly ground ring and health bar; bone giants scale those poses. New heroes retain the cached two-element hero ring and the 40 FPS limiter.

## Action RPG camera and animation preview (v65)

Existing original WebP-first/PNG-fallback painted sheets are retained. Ground tiles and skill telegraphs use a 45° camera rotation and 0.68 vertical projection. Actors, scenery, and heighted projectiles are sorted by projected ground depth; sprites cancel the camera transform at their feet to remain upright. Foreground stonework fades near the hero. Masonry cap textures, torchlight, shadows and outlines are cached.

Walking now uses eight cached procedural phases derived from the painted poses, with bob, lean and attack follow-through. Summoned skeletons emerge over 0.3 seconds; Dash leaves short fading silhouettes. Firestorm adds upright falling comets, Earthsplitter radial cracks, Army a summoning rune, Arrow Storm lightning trails, and Solar Flare light columns. These are bounded cosmetic effects, not new damage sources or fully rigged 3D animations.

The native 40 FPS limiter is unchanged. Headless canvas render timings are diagnostics, not physical-phone frame-rate measurements.

## Animated Catacombs (v68)

New original image-generated transparent atlases: `gravecaller-animation.png` and `bloodknight-animation.png`, each 1374×1145 with six columns and five rows (30 authored pose images). Rows contain front walk, right-side walk, back walk, cast/swing and hit/death poses. Left side mirrors right; attack poses follow the existing cast clock. This is an authored sprite sequence, not a 3D rig. Cells are sliced once into foot-anchored caches; images load WebP first with PNG fallback and the legacy hero art remains available on failure. Runtime death timing is cosmetic and never serialized.

`ash-props.png` is a 1774×887 transparent four-by-two painted atlas: broken column, ruined arch, chain set, sarcophagus, floor seal, hooded statue, coal brazier and bone pile. Ash's scenery module prefers these painted images and retains cached canvas fallbacks. All new WebPs use quality 88 and full alpha quality. Additional WebP download size is approximately 1.9 MB; PNG fallback approximately 6.5 MB. The generated source images are retained unchanged.

Original layered audio source and regeneration instructions are documented in `assets/audio/README.md`. No borrowed commercial-game artwork or sounds are used.

## SOUND & MOTION (v69)

Original image-generated `ranger-animation`, `sunwarden-animation` and `ember-animation` sheets match the v68 six-by-five layout (1374×1145). Each contains 18 distinct walking poses, six attack/cast poses and three hit/three death poses. The existing decoder supplies 150 cached foot-anchored frames across five heroes. Sunwarden's continuous beam receives a cosmetic staff pulse; its damage ticks, beam direction/range and game cast clock are unchanged.

`frost-props` and `venom-props` are transparent 1774×887 four-by-two atlases. Frost includes fractured ice columns, frozen arches, icicles, tombs, ice seals, statues, cold braziers and ice/bones. Venom includes root pillars/arches, hanging vines, giant fungi, toxic pools, overgrown statues, spore lanterns and bone piles. PNG files are unchanged generation outputs; WebP conversions use quality 76, preserving alpha. Additional WebP bytes: 2,708,874 (2.58 MiB). Generated originals remain in the workspace generation directory.

These are original project assets, without borrowed commercial-game art or sound. See assets/audio/README.md for original sample recipes and procedural music details. Native browser timings are diagnostics, not sustained Android hardware FPS measurements.
