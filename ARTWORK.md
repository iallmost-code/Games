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
