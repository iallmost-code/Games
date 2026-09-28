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

ChatGPT's fourth version, built on the merged file from this repo. Includes:

- **Heroes:** Crypt Mage, Stormcaller (defeat a boss) and Emberweaver (reach wave 10 or earn 300 lifetime embers).
- **Embers and upgrade shrine** with 6 permanent upgrades; the death screen shows embers earned and the next unlock.
- **Evolutions:** Inferno, Storm Crown, Plague Heart, Ember Barrage, Absolute Zero, Arcane Tempest.
- **Wave surprises:** runner rings, elite hunts (swift / splitting / armored) and a fleeing treasure imp.
- **Achievements:** Deep Delver, Boss Slayer, Spell Weaver, Imp Catcher (one-time ember rewards).
- **New level-up cards:** Phase Bolts, Soul Harvest, Voltaic Crits.
- **Boss telegraphs** fill up over the wind-up and play a warning sound; slams deal damage (the original never did, due to a bug).
- Lighter glow rendering for phones, 1×/1.25×/1.5× speed toggle, versioned saves.
