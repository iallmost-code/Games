// The presentation-only magma shafts must remain solid void beside the authored
// bridges. Catch future map edits that would put lava art on walkable cells or
// accidentally erase the visible boss doorway.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const path = require('node:path'), root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/cinematic/ash-environment.js'), 'utf8');
const window = {};
vm.runInNewContext(script, {window});
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const definition = /const descentFloors = ([\s\S]*?);\s*const dungeonTile/.exec(source);
assert(definition, 'Authored dungeon specification missing');
const floor = new Function('return (' + definition[1] + ')[0]')();
const cells = new Set(), corridors = new Set();
for (const [x, y, width, height] of [...floor.rooms, ...floor.links])
  for (let cx = x; cx < x + width; cx++) for (let cy = y; cy < y + height; cy++) cells.add(cx + ',' + cy);
for (const [x, y, width, height] of floor.links)
  for (let cx = x; cx < x + width; cx++) for (let cy = y; cy < y + height; cy++) corridors.add(cx + ',' + cy);
let shafts = 0;
for (let x = -2; x < 36; x++) for (let y = -2; y < 24; y++) {
  if (!window.EmberAsh.lowerVoid(x, y)) continue;
  shafts++;
  assert(!cells.has(x + ',' + y), 'Magma shaft would cover a navigable floor: ' + x + ',' + y);
  assert([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => corridors.has((x + dx) + ',' + (y + dy))),
    'Magma shaft is not beside a bridge: ' + x + ',' + y);
}
assert.equal(shafts, 22, 'Unexpected expansion of the bounded magma decoration');
for (const [x, y] of [[8, 8], [9, 11], [16, 8], [17, 11], [23, 8], [11, 5], [14, 6], [19, 13], [22, 14], [3, 13], [6, 14]])
  assert(window.EmberAsh.lowerVoid(x, y), 'Expected bridge flank missing');
for (const [x, y] of [[24, 9], [24, 10], [24, 8], [24, 11], [5, 10], [28, 10], [0, 0]])
  assert(!window.EmberAsh.lowerVoid(x, y), 'Doorway, room or ordinary wall would be masked');
console.log('PASS: 22 fixed magma shafts stay in solid bridge-adjacent void; boss doorway and rooms remain intact');
