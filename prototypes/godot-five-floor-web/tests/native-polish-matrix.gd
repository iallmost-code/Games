extends SceneTree
## Run with the exact native Godot release used to verify the Web Editor package:
## godot --headless --path prototypes/godot-five-floor-web --script res://tests/native-polish-matrix.gd
## Headless checks exercise native presentation contracts; GPU shader appearance
## still requires the real Web Editor/browser render check.

const WorldView = preload("res://scripts/world_view.gd")
const HEROES := ["gravecaller", "ranger", "sunwarden", "ember", "bloodknight", "rogue", "frostwarden"]
const QUALITIES := [
	{"name": "High", "maxAtmosphere": 32, "maxLights": 10, "scenery": 14},
	{"name": "Medium", "maxAtmosphere": 16, "maxLights": 6, "scenery": 12},
	{"name": "Low", "maxAtmosphere": 8, "maxLights": 3, "scenery": 6}
]
const DRAW_FRAMES := [0, 18, 23, 24, 26, 27, 29]

class TrackingWorld extends WorldView:
	var paint_count := 0
	func _draw() -> void:
		paint_count += 1
		super._draw()

var checks := 0
var failures := 0
var combinations := 0
var poses := 0
var draws := 0

func _initialize() -> void:
	call_deferred("run")

func check(value: bool, label: String) -> bool:
	checks += 1
	if not value:
		failures += 1
		push_error("FAIL native polish matrix: " + label)
	return value

func source_floors() -> Array:
	# Read the actual model's authored first five floors, including zones 0/1/2/1/0.
	var source := FileAccess.get_file_as_string("res://source/index.html")
	var parts := source.split("const descentFloors = [", false, 1)
	if not check(parts.size() == 2, "source model contains authored Descent floors"):
		return []
	var block := parts[1].split("];", false, 1)[0]
	var pattern := RegEx.new()
	pattern.compile('(?m)^\\s*\\{name:"([^"]+)",zone:([0-2]),[^\\n]*?rooms:(\\[\\[.*?\\]\\]),links:(\\[\\[.*?\\]\\])\\}')
	var floors: Array = []
	for match_result in pattern.search_all(block):
		var rooms = JSON.parse_string(match_result.get_string(3))
		var links = JSON.parse_string(match_result.get_string(4))
		if not check(rooms is Array and links is Array, "authored room/link arrays parse"):
			return []
		floors.append({"name": match_result.get_string(1), "zone": int(match_result.get_string(2)), "rooms": rooms, "links": links})
	check(floors.size() == 5, "five distinct authored floor fixtures")
	return floors

func floor_cells(spec: Dictionary) -> Array:
	var union := {}
	for rect in spec.rooms + spec.links:
		for x in range(int(rect[0]), int(rect[0] + rect[2])):
			for y in range(int(rect[1]), int(rect[1] + rect[3])):
				union[Vector2i(x, y)] = true
	var result: Array = []
	for cell in union:
		result.append([cell.x, cell.y])
	return result

func fixture(spec: Dictionary, floor_number: int, kind: String, isometric: bool) -> Dictionary:
	# The wide view keeps all fourteen authored scenery candidates visible, so the
	# real quality caps are exercised rather than accidentally passing via culling.
	return {
		"camera": {"w": 1280, "h": 720, "zoom": 0.35, "viewZoom": 1.0, "tilt": 0.58, "isometric": isometric, "focusY": 410},
		"hero": {"class": kind, "x": 1360.0, "y": 840.0, "hp": 100, "maxHp": 100, "moving": false, "stepPhase": 0.0, "inv": 0.0, "cast": 0.0, "lastHit": -99.0, "veilUntil": 0.0, "upgrades": {"fire": 2}, "evolutions": ["fixture"]},
		"heroPose": {"frame": 0, "flip": false, "variant": 0, "height": 90.0 if kind in ["bloodknight", "frostwarden"] else 80.0},
		"enemies": [
			{"x": 1400.0, "y": 880.0, "r": 18, "type": "champion", "hp": 50, "max": 100, "walking": true, "stepPhase": 1.2},
			{"x": 1300.0, "y": 820.0, "r": 16, "type": "caster", "hp": 60, "max": 60, "faceX": -1, "faceY": 0, "cast": 0.1},
			{"x": 1280.0, "y": 890.0, "r": 17, "type": "charger", "hp": 55, "max": 70},
			{"x": 1440.0, "y": 830.0, "r": 32, "type": "boss", "variant": "warden", "hp": 350, "max": 500}
		],
		"companions": [{"x": 1340.0, "y": 880.0, "r": 12, "kind": "wolf", "hp": 20, "max": 30}],
		"drops": [{"x": 1380.0, "y": 850.0, "type": "xp"}],
		"sites": [{"x": 1320.0, "y": 860.0, "kind": "well", "used": false}],
		"dungeon": {"floor": floor_number, "name": spec.name, "cells": floor_cells(spec), "rooms": spec.rooms.duplicate(true), "links": spec.links.duplicate(true), "open": false, "elapsed": 42.0, "startKills": 0, "bossStarted": false, "stairs": {"x": 2280.0, "y": 800.0}, "explored": [0, 1], "entrances": [{"x": 400.0, "y": 600.0, "primary": true}]},
		"adventurePads": [{"x": 1400.0, "y": 820.0, "kind": "rescue", "hold": 0.5}],
		"zone": spec.zone, "clock": 12.5, "quality": {}, "arenaWalls": [], "mode": "play", "runMode": "descent", "kills": 12, "level": 3
	}

func visible_scenery(view) -> int:
	var count := 0
	for key in view.actors:
		if str(key).begins_with("scenery:") and view.actors[key].visible:
			count += 1
	return count

func pool_ids(view) -> Dictionary:
	var result := {"actors": {}, "walls": []}
	for key in view.actors:
		result.actors[key] = view.actors[key].get_instance_id()
	for wall in view.wall_nodes:
		result.walls.append(wall.get_instance_id())
	return result

func shader_count(node: Node) -> int:
	var count := 1 if node is CanvasItem and node.material is ShaderMaterial else 0
	for child in node.get_children():
		count += shader_count(child)
	return count

func check_hero(view, state: Dictionary, label: String) -> void:
	var actor = view.actors["hero"]
	var sprite: Sprite2D = actor.sprite
	var halo: Sprite2D = actor.halo
	if not check(halo != null and sprite.texture != null, label + " authored hero and halo exist"):
		return
	check(halo.texture == sprite.texture and halo.hframes == sprite.hframes and halo.vframes == sprite.vframes and halo.frame == sprite.frame, label + " halo uses the exact authored frame/texture")
	check(sprite.hframes == 6 and sprite.vframes == 5 and sprite.frame == state.heroPose.frame, label + " 30-pose sheet remains selected")
	check(sprite.flip_h == state.heroPose.flip and halo.flip_h == sprite.flip_h and halo.flip_v == sprite.flip_v, label + " halo follows facing flips")
	check(halo.centered == sprite.centered and halo.offset == sprite.offset and halo.transform.is_equal_approx(sprite.transform), label + " halo follows position, scale, rotation and anchor")
	check(halo.get_rect().is_equal_approx(sprite.get_rect()) and halo.global_transform.is_equal_approx(sprite.global_transform), label + " local and screen frame geometry agree")
	check(actor.scale.is_equal_approx(Vector2.ONE * state.camera.zoom) and sprite.scale.is_equal_approx(Vector2.ONE * state.heroPose.height * 1.12 / 192.0), label + " hero uses its class height and camera zoom")
	check(sprite.modulate.r > 1.0 and actor.ring.a > 0.0, label + " hero contrast and ground ring remain readable")
	check(actor.get_child_count() == 2 and actor.get_child(0) == halo and actor.get_child(1) == sprite, label + " exactly one pooled halo sits behind the hero")
	check(halo.material is ShaderMaterial and halo.material.shader.resource_path == "res://scripts/hero_rim.gdshader", label + " only hero rim material is attached")
	check(halo.material.get_shader_parameter("rim_color") == view.HERO_COLORS[state.hero["class"]], label + " rim follows class palette")
	for key in view.actors:
		if str(key).begins_with("enemy:"):
			check(view.actors[key].halo == null and view.actors[key].sprite.material == null and view.actors[key].material == null, label + " enemy " + str(key) + " has no halo/shader")

func check_layout(view, state: Dictionary, label: String) -> void:
	check(view.cells.size() == state.dungeon.cells.size(), label + " complete authored cell union is retained")
	check(view.cells.has(Vector2i(24, 9)) and view.cells.has(Vector2i(24, 10)), label + " boss passage remains in authored floor geometry")
	check(view.wall_cells.has(Vector2i(24, 9)) and view.wall_cells.has(Vector2i(24, 10)), label + " both locked boss passage cells are walls")
	var used := 0
	var hidden_faces := 0
	for cell in view.wall_cells:
		var point: Vector2 = view.screen((Vector2(cell) + Vector2(0.5, 0.5)) * 80.0)
		if not view.on_screen(point, 170):
			continue
		var wall = view.wall_nodes[used]
		used += 1
		check(wall.visible and wall.position.is_equal_approx(point), label + " wall follows projected authored cell")
		check(wall.east_face == not view.wall_occupancy.has(cell + Vector2i.RIGHT) and wall.south_face == not view.wall_occupancy.has(cell + Vector2i.DOWN), label + " shared masonry faces are suppressed")
		check(wall.face_texture != null, label + " shared masonry texture is available")
		if not wall.east_face or not wall.south_face:
			hidden_faces += 1
	check(used > 0 and hidden_faces > 0, label + " exposed masonry remains visible without interior faces")

func check_scenery_pressure(view, spec: Dictionary) -> void:
	# Actual floors have fourteen candidates. Repeat their authored rooms only in
	# this stress DTO to make every quality tier encounter more than its cap.
	var state := fixture(spec, 1, "gravecaller", true)
	state.dungeon.rooms.append_array(spec.rooms.duplicate(true))
	var sequence := [32, 16, 8, 16, 32, 8, 32]
	var expected := [18, 12, 6, 12, 18, 6, 18]
	var high_pool := {}
	for index in range(sequence.size()):
		state.quality = {"maxAtmosphere": sequence[index], "maxLights": 3}
		var before := JSON.stringify(state)
		var paints_before: int = view.paint_count
		view.set_snapshot(state)
		if index == 0:
			high_pool = pool_ids(view)
		check(visible_scenery(view) == expected[index], "density stress reaches exact 18/12/6 quality ceiling")
		check(pool_ids(view) == high_pool, "density stress quality transitions reuse the High pool")
		await process_frame
		draws += 1
		check(view.paint_count > paints_before, "density stress invokes native world painting")
		check(JSON.stringify(state) == before, "density stress draw preserves source DTO")
	var scenery_nodes := 0
	for key in view.actors:
		if str(key).begins_with("scenery:"):
			scenery_nodes += 1
	check(scenery_nodes == 18, "scenery pool stops at the High ceiling after repeated transitions")

func run() -> void:
	var floors := source_floors()
	if floors.size() != 5:
		quit(1)
		return
	var view := TrackingWorld.new()
	root.add_child(view)
	check(view.lights.size() == 8, "bounded eight-light native pool")
	for kind in HEROES:
		for floor_index in range(floors.size()):
			for isometric in [false, true]:
				var state := fixture(floors[floor_index], floor_index + 1, kind, isometric)
				var high_pool: Dictionary = {}
				var halo_id := 0
				var before := ""
				for quality in QUALITIES:
					combinations += 1
					state.quality = {"maxAtmosphere": quality.maxAtmosphere, "maxLights": quality.maxLights}
					var label := "%s / Floor %s / %s / %s" % [kind, floor_index + 1, quality.name, "Isometric" if isometric else "Classic"]
					before = JSON.stringify(state)
					view.set_snapshot(state)
					check(view.zone == floors[floor_index].zone, label + " uses actual source zone")
					check(view.screen(Vector2(state.hero.x, state.hero.y)).is_equal_approx(Vector2(640, 410)), label + " hero stays at camera focus")
					var projected: Vector2 = Vector2(80 * sqrt(0.5), 80 * sqrt(0.5) * 0.58) if isometric else Vector2(80, 0)
					check(view.project(Vector2(80, 0)).is_equal_approx(projected), label + " projection follows selected view")
					check_layout(view, state, label)
					check(visible_scenery(view) == quality.scenery, label + " scenery obeys quality cap across complete authored floor")
					var visible_lights := 0
					for light in view.lights:
						if light.visible:
							visible_lights += 1
					check(visible_lights == mini(quality.maxLights, 8), label + " bounded lights follow source quality tier")
					if quality.name == "High":
						high_pool = pool_ids(view)
						halo_id = view.actors["hero"].halo.get_instance_id()
					else:
						check(pool_ids(view) == high_pool, label + " lowering quality hides and reuses existing pools")
					var paints_before: int = view.paint_count
					await process_frame
					draws += 1
					check(view.paint_count > paints_before, label + " native world paint callback executes")
					check(JSON.stringify(state) == before, label + " actual draw leaves the complete source DTO unchanged")
					for frame in range(30):
						for flip in [false, true]:
							state.heroPose.frame = frame
							state.heroPose.flip = flip
							state.heroPose.variant = frame % 3
							state.hero.moving = frame < 18 and frame % 6 > 0
							state.hero.stepPhase = frame * 0.37
							state.hero.cast = 0.12 if frame in range(18, 24) else 0.0
							state.hero.lastHit = state.clock - 0.05 if frame in range(24, 27) else -99.0
							state.hero.inv = 0.09 if frame in range(24, 27) else 0.0
							state.hero.hp = 0 if frame >= 27 else 100
							before = JSON.stringify(state)
							view.set_snapshot(state)
							poses += 1
							check_hero(view, state, label + " pose %s flip %s" % [frame, flip])
							if frame in DRAW_FRAMES:
								paints_before = view.paint_count
								await process_frame
								draws += 1
								check(view.paint_count > paints_before, label + " attack/hit/death pose invokes native painting")
							check(JSON.stringify(state) == before, label + " pose update/draw preserves simulation fields")
					check(pool_ids(view) == high_pool and view.actors["hero"].halo.get_instance_id() == halo_id, label + " repeated poses keep every actor, wall and halo node")
					check(shader_count(view) == 1, label + " exactly one native shader pass exists")
				# Low -> High must reveal the same scenery nodes without pool growth.
				state.quality = {"maxAtmosphere": 32, "maxLights": 10}
				before = JSON.stringify(state)
				view.set_snapshot(state)
				check(visible_scenery(view) == 14 and pool_ids(view) == high_pool, kind + " restored High reuses all scenery")
				check(JSON.stringify(state) == before, kind + " restoring High preserves source DTO")
				state.dungeon.open = true
				before = JSON.stringify(state)
				view.set_snapshot(state)
				await process_frame
				draws += 1
				check(not view.wall_cells.has(Vector2i(24, 9)) and not view.wall_cells.has(Vector2i(24, 10)), kind + " opening boss gate removes both rendered blockers")
				check(view.cells.has(Vector2i(24, 9)) and view.cells.has(Vector2i(24, 10)), kind + " opening boss gate preserves authored traversable cells")
				check(JSON.stringify(state) == before, kind + " open-gate draw preserves source DTO")
				state.dungeon.open = false
				view.set_snapshot(state)
				check(view.wall_cells.has(Vector2i(24, 9)) and view.wall_cells.has(Vector2i(24, 10)), kind + " returning to locked snapshot restores both blockers")
	await check_scenery_pressure(view, floors[0])
	check(combinations == 210 and poses == 12600, "complete seven hero/five floor/three quality/two view matrix with 30 poses and both flips")
	check(view.paint_count >= draws, "native _draw callbacks cover the draw purity checks")
	var actual_paints: int = view.paint_count
	view.queue_free()
	await process_frame
	if failures > 0:
		print("FAIL native polish matrix: %s failures in %s checks" % [failures, checks])
		quit(1)
		return
	print("PASS native polish matrix: %s cases, %s poses, %s native paints, %s checks; halo geometry, hero-only shader attachment, 18/12/6 scenery caps/pool transitions, authored floors/gate and source DTO purity" % [combinations, poses, actual_paints, checks])
	quit(0)
