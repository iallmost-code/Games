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

- **Menus:** start screen, three named save slots (each with its own progress), main menu hub with separate Play / Shrine / Bestiary / Achievements / Settings screens, hero select with depth picker, pause menu, and a copyable save code to move a character between devices.

ChatGPT's eighth version, built on the merged file from this repo. Includes:

- **Heroes with their own elements:** Crypt Mage (Arcane + Shadow), Stormcaller (Frost + Lightning, unlock: defeat a boss) and Emberweaver (Fire + Poison, unlock: wave 10 or 600 lifetime embers). Each hero only sees its own element cards plus shared stat cards, and loot weapons roll that hero's effects.
- **Crypt Depths:** beating the Crypt Heart unlocks deeper difficulty tiers with stacking modifiers and +25% embers per depth; best depth is tracked per hero.
- **Zone identity:** lava vents and Cinder Imps in the Ash Catacombs, sliding ice and Frost Golems in the Frost Vault, spore pods and Spore Spitters in Venom Hollow, with a tinted floor per zone.
- **Element matchups:** every enemy and boss has a weakness (1.5× damage) and most have a resistance (0.5×). Weak hits show a bigger number with "!", boss toasts show the matchup, and a Bestiary on the title screen lists discovered foes.
- **Single-target staff bolt:** the basic attack no longer splashes; area damage comes from each hero's own skills.
- **Hero evolutions:** Emberweaver: Inferno, Plague Heart, Wildfire Blight. Stormcaller: Storm Crown, Absolute Zero, Shatterstorm. Crypt Mage: Arcane Tempest, Soul Rift, Reaper's Veil. Everyone: Ember Barrage.
- **Embers and upgrade shrine** with 6 permanent upgrades; the death screen shows embers earned and the next unlock.
- **Wave surprises:** runner rings, elite hunts (swift / splitting / armored) and a fleeing treasure imp.
- **Achievements:** Deep Delver, Boss Slayer, Spell Weaver, Imp Catcher (one-time ember rewards).
- **New level-up cards:** Phase Bolts, Soul Harvest, Voltaic Crits.
- **Boss telegraphs** fill up over the wind-up and play a warning sound; slams deal damage (the original never did, due to a bug).
- **Danger and a finish line:** charger enemies, earlier casters, cut-off packs, rising contact damage, 30-second waves, and a Crypt Heart final boss at wave 20 with a victory screen and endless mode.
- **No XP snowball:** XP per orb no longer grows with player level; at most one level-up per second.
- Lighter glow rendering for phones, 1×/1.25×/1.5× speed toggle, versioned saves.
