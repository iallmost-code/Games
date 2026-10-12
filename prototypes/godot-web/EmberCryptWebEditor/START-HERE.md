# Ember Crypt — Godot 4.7.2 Web Editor preview

A standalone Frost Vault visual/gameplay prototype. This does not replace Ember Crypt or access its browser saves. GDScript, native Godot 2D nodes, Compatibility renderer, no addons/.NET/export templates required.

## Start in the Web Editor

1. Download `EmberCrypt-Import-Test.zip` first. Keep it as a ZIP; don't extract it in Windows.
2. On the Web Editor's Loader page, choose **Preload project ZIP** and select the ZIP.
3. Click **Start Godot Editor**. In **Install Project**, set Project Path to `/home/web_user/ember-frost` (or another folder under `/home/web_user/`), leave **Create Folder** and **Edit Now** checked, and click **Install**.
4. Click the editor's Play triangle. The tiny test shows Bloodknight and **IMPORT WORKED**. Move with WASD/arrows.
5. Close the editor using its top **×**, return to Loader, select `EmberCrypt-Frost-Vault.zip`, and repeat. The full dungeon is assembled when you press Play; its editor canvas can look empty before running. Use a different folder for each ZIP, such as `/home/web_user/ember-test` and `/home/web_user/ember-frost`.

No Windows extraction, copying scripts, plugins or desktop Godot installation is necessary. The editor's Game tab replaces its Editor view while running. Switch tabs at the top; save your work and use Project → Tools → Download Project Source before closing the browser.

## Frost Vault controls

- WASD/arrows: screen-aligned movement; attacks are automatic.
- Space or the Dash button: dash with brief invulnerability and a four-second cooldown.
- E or Earthsplitter: charged ground slam; starts ready for testing.
- Drag in the left part of the game: floating joystick (mouse or touch).
- Escape: pause/resume; R: restart; M: mute; F11: fullscreen where supported.

Explore connected rooms. The boss door opens at 12 kills or 45 seconds. Follow its gold minimap mark, defeat the demo Crypt Warden, and walk onto the stairs. These shortened demo goals are not a change to the production game's balance.

## Included and intentionally separate

Authored Bloodknight walk/attack/hit/death poses, existing Frost floor/prop art, soft lighting and shadows, raised walls, projected Cartesian movement/collision, enemy pursuit and arrival cues, automatic 150-degree melee swings with wall checks, skills, sample audio, minimap, boss telegraph and demo victory.

This is one hero and one small dungeon slice. The complete seven-hero game, ten-floor progression, save migration, mastery, relic/cards/Torment/daily systems and production balance are not ported. Prototype runs are temporary; current Ember Crypt profiles remain untouched.

Archives use standard unencrypted ZIP entries, ASCII relative paths, and `project.godot` at the archive root. No `.godot` cache, `.import` metadata, symlinks or nested ZIPs. `ImportTest/` and `EmberCryptWebEditor/` are the source folders; `package.py` reproduces the downloadable ZIPs.
