# Ember Crypt

A one-thumb dungeon survival game (originally generated with ChatGPT, imported from https://ember-crypt.iallmost.chatgpt.site/).

Drag the joystick to move; attacks are automatic. Collect blue embers to level up, grab relics, and follow the markers to wells, forges, and vaults.

## Run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Everything is in `index.html` except the sprites in `assets/`.

## What's in this version

Based on ChatGPT's second version (embers + upgrade shrine, unlockable Stormcaller hero, 1×/1.25×/1.5× speed toggle, Inferno / Storm Crown / Plague Heart / Ember Barrage evolutions, runner rings and elite hunts), plus:

- **Two more evolutions:** Grave Nova II + Frost Fairy → **Absolute Zero**; Arcane Lance II + Arcane Fairy → **Arcane Tempest**. Evolution cards are highlighted in gold.
- **Treasure imp:** appears on wave 2 and in the wave-surprise rotation. It flees; catch it within 14 seconds for a gear cache, XP and embers. A gold arrow points to it.
- **Elite modifiers:** elite hunts roll Swift, Splitting (breaks into runners) or Armored (half damage).
- **Gentler XP curve** after the first few levels so level-ups don't come every few seconds.
- **Bug fix:** boss slam attacks ("DODGE THE MARK") threw an error and never dealt damage; they now hit if you stay in the marked circle.
