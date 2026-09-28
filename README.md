# Ember Crypt

A one-thumb dungeon survival game (originally generated with ChatGPT, imported from https://ember-crypt.iallmost.chatgpt.site/).

Drag the joystick to move; attacks are automatic. Collect blue embers to level up, grab relics, and follow the markers to wells, forges, and vaults.

## Run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Everything is in `index.html` except the sprites in `assets/`.

## Changes from the original

- **Faster pacing:** 20-second waves, enemies spawn just off-screen and move faster, quicker early level-ups, faster hero movement and fire rate.
- **Evolutions:** owning both halves of a pair offers a gold evolution at the next level-up. Level-up cards show what each upgrade pairs with.
  - Firebrand + Flame Fairy → **Inferno**
  - Chain Spark III + Lightning Fairy → **Storm Crown**
  - Venom Bolts + Venom Fairy → **Plague**
  - 4 bolts + max Quick Hands → **Ember Barrage**
  - Grave Nova II + Frost Fairy → **Absolute Zero**
  - Arcane Lance II + Arcane Fairy → **Arcane Tempest**
- **Wave events:** a treasure imp on wave 2, then surround swarms, elites (swift / splitting / armored) and treasure imps on odd non-boss waves.
- **Bug fix:** boss slam attacks ("DODGE THE MARK") threw an error and never dealt damage; they now hit if you stay in the marked circle.
