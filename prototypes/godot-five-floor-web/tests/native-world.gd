extends SceneTree
## godot --headless --path prototypes/godot-five-floor-web --script res://tests/native-world.gd
const WorldView = preload("res://scripts/world_view.gd")

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var world := WorldView.new()
	root.add_child(world)
	var state := {
		"camera": {"w": 1280, "h": 720, "zoom": 1.0, "tilt": 0.58, "isometric": true, "focusY": 410},
		"hero": {"class": "gravecaller", "x": 120.0, "y": 120.0, "hp": 100, "maxHp": 100},
		"heroPose": {"frame": 0, "flip": false, "variant": 0, "height": 80.0},
		"enemies": [{"x": 140.0, "y": 160.0, "r": 18, "type": "champion", "hp": 50, "max": 100}],
		"companions": [{"x": 100.0, "y": 90.0, "r": 12, "kind": "wolf", "hp": 20, "max": 30}],
		"drops": [{"x": 150.0, "y": 140.0, "type": "xp"}],
		"things": [{"x": 160.0, "y": 200.0, "kind": "well"}],
		"dungeon": {"floor": 1, "cells": [[1, 1], [1, 2], [2, 1], [2, 2]], "rooms": [[1, 1, 2, 2]], "open": false, "stairs": {"x": 160.0, "y": 160.0}, "entrances": [{"x": 80.0, "y": 120.0, "primary": true}]},
		"adventurePads": [{"x": 120.0, "y": 160.0, "kind": "rescue", "hold": 0.5}],
		"zone": 0, "clock": 1.5, "quality": {"maxLights": 2}
	}
	var before := JSON.stringify(state)
	world.set_snapshot(state)
	assert(world.screen(Vector2(120, 120)).is_equal_approx(Vector2(640, 410)), "Hero must stay at CSS camera focus")
	assert(world.project(Vector2(80, 0)).is_equal_approx(Vector2(80 * sqrt(0.5), 80 * sqrt(0.5) * 0.58)))
	assert(world.wall_cells.has(Vector2i(24, 9)), "Boss passage must render locked")
	assert(world.actors["enemy:0"].bar == 0.5)
	assert(world.actors["enemy:0"].z_index > world.actors["hero"].z_index, "Forward actors must depth-sort above the hero")
	assert(world.lights[0].visible and world.lights[1].visible and not world.lights[2].visible)
	var actor_count: int = world.actors.size()
	var wall_count: int = world.wall_nodes.size()
	for i in range(100):
		world.set_snapshot(state)
	assert(world.actors.size() == actor_count and world.wall_nodes.size() == wall_count, "Steady snapshots must reuse native nodes")
	assert(JSON.stringify(state) == before, "Rendering must never mutate simulation dictionaries")
	for kind in ["gravecaller", "ranger", "sunwarden", "ember", "bloodknight", "rogue", "frostwarden"]:
		state.hero["class"] = kind
		for frame in [0, 5, 12, 23, 29]:
			state.heroPose["frame"] = frame
			world.set_snapshot(state)
			assert(world.actors["hero"].visible)
	for floor_number in range(1, 6):
		state.dungeon["floor"] = floor_number
		state["zone"] = (floor_number - 1) % 3
		world.set_snapshot(state)
		assert(world.zone == (floor_number - 1) % 3)
	state.camera["isometric"] = false
	state.camera["zoom"] = 0.7
	state.dungeon["open"] = true
	world.set_snapshot(state)
	assert(world.project(Vector2(80, 20)) == Vector2(80, 20), "Classic projection must remain Cartesian")
	assert(not world.wall_cells.has(Vector2i(24, 9)))
	state["dungeon"] = null
	world.set_snapshot(state)
	assert(world.cells.is_empty())
	for wall in world.wall_nodes:
		assert(not wall.visible)
	state["arenaWalls"] = [{"x": 35.0, "y": 35.0, "w": 124.0, "h": 98.0}]
	var arena_before := JSON.stringify(state)
	world.set_snapshot(state)
	assert(world.wall_nodes[0].visible, "Endless collision rectangles must be visible")
	assert(world.wall_nodes[0].position.is_equal_approx(world.screen(Vector2(97, 84))))
	assert(JSON.stringify(state) == arena_before)
	await process_frame
	world.queue_free()
	await process_frame
	print("PASS native world: projection, pooling, seven heroes, five floors, wall gate, quality caps, simulation purity")
	quit(0)
