# Original native presentation assets

Regenerate from the repository root with:

```sh
node prototypes/godot-five-floor-web/tests/bake-assets.cjs
```

The baker serves the original root HTML and art modules, adding only an in-memory
fixture that exposes the original `art` dictionary and `zoneFloorTiles`. Production
files are never rewritten. Every sprite key has its own WebP containing
the original cached sprite, including the authored gutter cuts and alpha crop
performed by `registerSprite`. Legacy sprites that are not replaced by cinematic
crops retain their original dimensions. The three floors retain the original
384×384 browser processing.

`manifest.json` contains `sprites` (art key → filename), `heroes` (hero ID → three
palette atlas filenames in order 0, 1, 2), and `floors` (zone filenames 0, 1, 2).
All filenames are relative to this directory.

Hero atlases are 1344×960, with six columns and five rows of 224×192 cells.
Frame index `i` has region `(i % 6 * 224, floor(i / 6) * 192, 224, 192)`.
The unchanged normalized anchor is `(112, 188)` within each cell. At draw height
`h`, use scale `h / 192` and offset `(-112 * scale, -188 * scale)`. Directional
flips follow the original `EmberHeroAnimation.choose` API. The baker calls the
original `EmberHeroAnimation.frame(hero, index, palette)` for every cell; it does
not reconstruct or replace normalization, tinting, transparent gutters, or poses.

`verification.json` records source hashes, image dimensions, sizes and hashes,
alpha bounds for all 630 palette frames, totals, and exceptions. The initial exact
bake verifies every atlas cell against its cached browser frame and checks exact
alpha and visible RGB after lossless decoding. The final size optimization uses
WebP quality 92, or 90 when needed, with lossless alpha. Final geometry and alpha
remain exact; final RGB is lossy. Metadata reports both unweighted visible RGB
RMSE/max and alpha-weighted RMSE/max against the initial exact bake, per file and
overall. The alpha-weighted RMSE is bounded below 8/255 per file. Only final WebPs
are shipped. Exact originals are backed up only under the system temporary
directory, and intermediary PNG data stays in memory.
