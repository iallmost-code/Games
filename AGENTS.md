# Ember Crypt development notes

- This is the current v60 mobile browser game. Keep the game working from root `index.html` with relative `assets/` paths and no required build or external service.
- Preserve gameplay, all three heroes and their element-restricted upgrades, three zones, depth modifiers, achievements, shrine, relics, save slots, save-code export/import, and wave 20 victory unless the task changes them.
- Preserve the one-thumb controls. The bottom-center joystick, pause button, automatic attacks, and Settings sound/speed controls are intentional. Do not add an in-game action button unless asked.
- Preserve localStorage save compatibility. Run format is v9; change format/version and write a migration only when changing serialized run structure.
- Keep WebP-first cinematic assets with PNG fallback. Maintain readable hero ring, danger cues, and the 40 FPS limiter.
- The existing public game is hosted separately at https://ember-crypt.alpine0-0.chatgpt.site. A GitHub commit alone does not update that link.
- Verify JavaScript syntax and a real canvas render after changes. Test profile isolation and save migration for changes affecting persistence. Avoid performance-heavy per-enemy blur or filter operations.
