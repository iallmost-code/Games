# Ember Crypt

Current playable build: **v60 Stone & Motion**  
Live game: https://ember-crypt.alpine0-0.chatgpt.site

This is the complete mobile browser game source. Open `index.html` in a browser or serve this folder with `python3 -m http.server 8000` and visit http://localhost:8000. The game uses plain HTML, CSS, JavaScript, and the art in `assets/`; there is no build step.

## Work on it in Codex

Select this repository and its default branch, `claude/game-from-gpt-v2t55i`, in a Codex Cloud environment. `AGENTS.md` records the game constraints. The published game lives on the existing Sites link above; commits to this repository do not automatically deploy it.

## Current game

- Three heroes: Crypt Mage (Arcane/Shadow), Stormcaller (Frost/Lightning), Emberweaver (Fire/Poison).
- Three zones, element weaknesses, relics, evolutions, depth modifiers, treasure imps, elite events, and the Crypt Heart at wave 20.
- Three named local save slots, run resume, shrine, bestiary, achievements, and save-code export/import.
- One-thumb play: joystick at bottom center, automatic attacks, pause control. Sound and speed are in Settings.
- Cinematic art loads as WebP with PNG fallback. The frame limiter is 40 FPS.

## Files

- `index.html` — game and menus
- `assets/` — legacy sprites and cinematic art sheets
- `ARTWORK.md` — art asset notes
- `AGENTS.md` — development rules for Codex

This repository snapshot contains the current build and assets. The browser stores progress locally per device; importing this code does not transfer a player's save. Use Settings → Copy save code / Load save code for that.
