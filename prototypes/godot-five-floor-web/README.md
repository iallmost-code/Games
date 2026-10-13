# 2.5D visual polish — seven heroes / five floors — Godot 4.7.2 Web Editor preview

Download `downloads/EmberCrypt-25D-Polish.zip`. Keep it zipped. In the Web Editor's Loader, select **Preload project ZIP**, click **Start Godot Editor**, and install under `/home/web_user/ember-seven` with **Create Folder** and **Edit Now** checked. Press **F5 / Play**. The editor scene can look empty before Play because the dungeon is assembled at runtime.

Play contains the original seven heroes, first five Descent floors, enemies/bosses, cards/evolutions, relics, skills, loot, shrine, achievements, bestiary, Crypt Depths, Torment, random/Classic layouts, daily challenges, merchant, mastery and run history. Endless retains its existing rules. A menu-only **PLAYTEST ALL HEROES** toggle lets you try all seven without writing earned unlock flags. Earned progression still works. Floor 5 retains its victory/rewards and ends this preview; floors 6–10 are not playable here. Imported deeper saved runs remain preserved but cannot be continued in this preview.

Movement: WASD/arrows or floating joystick. Space = Dash, E = Ultimate. Existing portrait/landscape menus and controls remain. No other gameplay buttons are added.

## This graphics pass

The same game now uses continuous floor textures spanning four cells, shared rough-stone wall textures with hidden internal faces, exposed platform ledges, a brighter/larger grounded hero and a single hero-only silhouette rim. Zone columns/statues/bones decorate room boundaries and fade when obscuring the hero. High/Medium/Low decorative caps are18/12/6. Scenery does not introduce collision or new navigation. No combat, progression, movement or saves changed.

## What this actually tests

**Web-only hybrid prototype, not a complete native GDScript port.** The original v78 JavaScript simulation and DOM menus/HUD/audio run in a transparent browser frame. Its original world canvas is hidden and its world draw removed. Native Godot nodes draw projected floors, raised walls, actors, authored animation atlases, ground shadows, bounded lights, pickups, hazards and spell effects from read-only snapshots. Thus the test lets you compare actual Godot rendering while preserving the full game's combat and progression. Desktop Godot displays a Web-required notice; export outside Web needs a native gameplay/UI port.

Original production `index.html` and `assets/` are untouched. Preview profile v2, run v12 and EC1 codes use the original save functions in a separate `godot-ec-five-v1:` browser-storage namespace. Importing a code is optional; it never automatically reads or writes the live game's slots. Profiles saved on another site must be copied with EC1. Editor project persistence and game profile persistence are separate browser stores; clearing browser/site data removes either. Export save codes before doing so.

Source-model art is bundled as raw `.bin` WebP/WAV files, native textures as raw `.webp.bin` in the ZIP to avoid double imports and the large Web Editor import cost. No build/service/network is required by the game after the Editor and project have loaded. `build-source.py` bundles original modules; `package.py` produces a stored ZIP with explicit parent directories required by Godot's installer. Native art RGB is compressed quality90, with exact original alpha/atlas geometry. Existing originals and provenance are retained in the repository.

This is a renderer test: some cosmetic accents differ from the Canvas version. Software-browser checks do not establish physical Android FPS. A full native port would require translating the model, persistence and UI after playtest approval.
