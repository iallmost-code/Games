extends Node2D
## Presentation-only native world. JavaScript owns every gameplay value and clock.
## Coordinates, collision and saves stay Cartesian; only this view projects them.

const CELL := 80.0
const ISO := 0.7071067811865476
const FLOOR_COLORS := [Color("342823"), Color("243741"), Color("2a3423")]
const STONE_COLORS := [Color("706455"), Color("77949b"), Color("717b55")]
const HERO_COLORS := {"gravecaller": Color("bb94ff"), "ranger": Color("ffe47a"), "sunwarden": Color("ffe6a0"), "ember": Color("ff995e"), "bloodknight": Color("ef718a"), "rogue": Color("b48ee8"), "frostwarden": Color("92deff")}

var snapshot: Dictionary = {}
var camera: Dictionary = {}
var hero: Dictionary = {}
var manifest: Dictionary = {}
var texture_cache: Dictionary = {}
var actors: Dictionary = {}
var wall_nodes: Array = []
var cells: Dictionary = {}
var wall_cells: Array[Vector2i] = []
var layout_key := ""
var lights: Array[PointLight2D] = []
var light_texture: Texture2D
var zone := 0
var zoom := 1.0
var tilt := 0.58
var iso := true
var clock := 0.0
var viewport_size := Vector2(1280, 720)

class Actor extends Node2D:
	var sprite := Sprite2D.new()
	var radius := 18.0
	var height := 80.0
	var ring := Color.TRANSPARENT
	var bar := -1.0
	var bar_color := Color("e6b97a")
	var outline := Color.TRANSPARENT
	var fallback := Color("998fa1")
	var label := ""
	var ellipse_tilt := 0.58
	var draw_shadow := true
	func _init() -> void:
		add_child(sprite)
		sprite.centered = false
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	func _draw() -> void:
		if draw_shadow:
			draw_set_transform(Vector2.ZERO, 0, Vector2(1, 0.30))
			draw_circle(Vector2.ZERO, radius + 4, Color(0.005, 0.008, 0.015, 0.65))
			draw_set_transform(Vector2.ZERO)
		if ring.a > 0:
			draw_set_transform(Vector2.ZERO, 0, Vector2(1, ellipse_tilt))
			draw_arc(Vector2.ZERO, radius + 6, 0, TAU, 40, ring, 1.8, true)
			draw_set_transform(Vector2.ZERO)
		if outline.a > 0:
			# Bounded geometry accents avoid a filter or shader pass per enemy.
			draw_arc(Vector2(0, -height * 0.48), maxf(radius, height * 0.32), PI * 0.94, TAU * 1.03, 24, outline, 2.0, true)
		if sprite.texture == null:
			draw_polygon(PackedVector2Array([Vector2(-radius, 0), Vector2(-radius * 0.7, -height * 0.7), Vector2(0, -height), Vector2(radius * 0.7, -height * 0.7), Vector2(radius, 0)]), PackedColorArray([fallback]))
		if bar >= 0:
			draw_rect(Rect2(-radius, -height - 9, radius * 2, 4), Color("10171a"))
			draw_rect(Rect2(-radius, -height - 9, radius * 2 * clampf(bar, 0, 1), 4), bar_color)
		if not label.is_empty():
			var font := ThemeDB.fallback_font
			var width := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
			draw_string(font, Vector2(-width / 2, -height - 14), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, ring if ring.a > 0 else Color("e9d5ab"))

class Wall extends Node2D:
	var corners := PackedVector2Array()
	var stone := Color("706455")
	var texture: Texture2D
	var lift := 42.0
	func _draw() -> void:
		if corners.size() != 4:
			return
		var up := Vector2(0, -lift)
		var top := PackedVector2Array([corners[0] + up, corners[1] + up, corners[2] + up, corners[3] + up])
		draw_colored_polygon(PackedVector2Array([corners[1], corners[2], top[2], top[1]]), stone.darkened(0.58))
		draw_colored_polygon(PackedVector2Array([corners[2], corners[3], top[3], top[2]]), stone.darkened(0.38))
		if texture:
			draw_polygon(top, PackedColorArray([stone.lightened(0.18)]), PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)]), texture)
		else:
			draw_colored_polygon(top, stone)
		draw_polyline(PackedVector2Array([top[0], top[1], top[2], top[3], top[0]]), Color(0.025, 0.035, 0.045, 0.8), 1.5, true)
		draw_line(top[0], top[1], stone.lightened(0.35), 1.2, true)
		draw_line(top[1], top[2], stone.lightened(0.2), 1.2, true)
		for row in [0.33, 0.66]:
			draw_line(corners[1] + up * row, corners[2] + up * row, stone.darkened(0.7), 1, true)
			draw_line(corners[2] + up * row, corners[3] + up * row, stone.darkened(0.7), 1, true)

func _ready() -> void:
	load_art()
	var gradient := Gradient.new()
	gradient.colors = PackedColorArray([Color(1, 1, 1, 0.45), Color(1, 1, 1, 0.13), Color(1, 1, 1, 0)])
	gradient.offsets = PackedFloat32Array([0, 0.35, 1])
	var radial := GradientTexture2D.new()
	radial.gradient = gradient
	radial.width = 128
	radial.height = 128
	radial.fill = GradientTexture2D.FILL_RADIAL
	radial.fill_from = Vector2(0.5, 0.5)
	radial.fill_to = Vector2(1, 0.5)
	light_texture = radial
	for i in range(8):
		var light := PointLight2D.new()
		light.texture = light_texture
		light.blend_mode = Light2D.BLEND_MODE_ADD
		light.energy = 0.36
		light.visible = false
		add_child(light)
		lights.append(light)

func load_art() -> void:
	if FileAccess.file_exists("res://native-art/manifest.json"):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://native-art/manifest.json"))
		if parsed is Dictionary:
			manifest = parsed

func texture_for(key: String) -> Texture2D:
	var filename := str(manifest.get("sprites", {}).get(key, ""))
	return file_texture(filename)

func file_texture(filename: String) -> Texture2D:
	if filename.is_empty():
		return null
	if texture_cache.has(filename):
		return texture_cache[filename]
	var path := filename if filename.begins_with("res://") else "res://native-art/" + filename
	var texture: Texture2D = null
	if not FileAccess.file_exists(path) and FileAccess.file_exists(path + ".bin"):
		path += ".bin"
	if FileAccess.file_exists(path):
		var image := Image.new()
		if image.load_webp_from_buffer(FileAccess.get_file_as_bytes(path)) == OK:
			texture = ImageTexture.create_from_image(image)
	texture_cache[filename] = texture
	return texture

func project(delta: Vector2) -> Vector2:
	return Vector2((delta.x - delta.y) * ISO, (delta.x + delta.y) * ISO * tilt) if iso else delta

func screen(world: Vector2) -> Vector2:
	return Vector2(viewport_size.x / 2, float(camera.get("focusY", viewport_size.y / 2))) + project(world - Vector2(float(hero.get("x", 0)), float(hero.get("y", 0)))) * zoom

func depth(point: Vector2) -> int:
	return clampi(100 + int(point.y * 2), 1, 3800)

func on_screen(point: Vector2, margin := 150.0) -> bool:
	return Rect2(Vector2(-margin, -margin), viewport_size + Vector2.ONE * margin * 2).has_point(point)

func set_snapshot(state: Dictionary) -> void:
	snapshot = state
	camera = state.get("camera", {})
	hero = state.get("hero", {})
	viewport_size = Vector2(float(camera.get("w", 1280)), float(camera.get("h", 720)))
	zoom = maxf(0.1, float(camera.get("zoom", 1)))
	tilt = maxf(0.1, float(camera.get("tilt", 0.58)))
	iso = bool(camera.get("isometric", true))
	zone = clampi(int(state.get("zone", 0)), 0, 2)
	clock = float(state.get("clock", 0))
	var dungeon = state.get("dungeon")
	if dungeon is Dictionary:
		update_layout(dungeon)
	else:
		cells.clear()
		layout_key = ""
	for wall in wall_nodes:
		wall.visible = false
	if dungeon is Dictionary:
		update_walls(dungeon)
	else:
		update_arena_walls()
	for actor in actors.values():
		actor.visible = false
	update_hero()
	for i in range(state.get("enemies", []).size()):
		update_enemy(state.enemies[i], i)
	for i in range(state.get("companions", []).size()):
		update_companion(state.companions[i], i)
	update_props(dungeon)
	update_lights(dungeon)
	queue_redraw()

func update_layout(dungeon: Dictionary) -> void:
	var raw: Array = dungeon.get("cells", [])
	var key := "%s:%s:%s" % [dungeon.get("floor", 1), raw.hash(), dungeon.get("open", false)]
	if key == layout_key:
		return
	layout_key = key
	cells.clear()
	wall_cells.clear()
	var walls := {}
	for value in raw:
		var cell: Vector2i
		if value is String:
			var parts: PackedStringArray = str(value).split(",")
			cell = Vector2i(int(parts[0]), int(parts[1]))
		else:
			cell = Vector2i(int(value[0]), int(value[1]))
		cells[cell] = true
	for cell in cells:
		for offset in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			var neighbor: Vector2i = cell + offset
			if not cells.has(neighbor):
				walls[neighbor] = true
	# The original locked boss passage is a solid cell column inside the floor.
	if not bool(dungeon.get("open", false)):
		for y in [9, 10]:
			walls[Vector2i(24, y)] = true
	for cell in walls:
		wall_cells.append(cell)

func floor_texture() -> Texture2D:
	var floors: Array = manifest.get("floors", [])
	return file_texture(str(floors[zone])) if floors.size() > zone else null

func tile_polygon(cell: Vector2i) -> PackedVector2Array:
	var origin := Vector2(cell) * CELL
	return PackedVector2Array([screen(origin), screen(origin + Vector2(CELL, 0)), screen(origin + Vector2(CELL, CELL)), screen(origin + Vector2(0, CELL))])

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, viewport_size), Color("080b0d"))
	var tile := floor_texture()
	var uv := PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	if cells.is_empty():
		var center := Vector2i(floori(float(hero.get("x", 0)) / CELL), floori(float(hero.get("y", 0)) / CELL))
		var extent := ceili(maxf(viewport_size.x, viewport_size.y) / (CELL * zoom * tilt)) + 2
		for y in range(center.y - extent, center.y + extent):
			for x in range(center.x - extent, center.x + extent):
				var poly := tile_polygon(Vector2i(x, y))
				if on_screen(poly[0], 100):
					draw_floor(poly, tile, uv)
	else:
		for cell in cells:
			var poly := tile_polygon(cell)
			if on_screen(poly[0], 140):
				draw_floor(poly, tile, uv)
	var dungeon = snapshot.get("dungeon")
	if dungeon is Dictionary:
		var gate_point := screen(Vector2(24 * CELL, 9 * CELL))
		if on_screen(gate_point):
			var gate_color := Color("ffd16b") if bool(dungeon.get("open", false)) else Color("835346")
			var gate_origin := Vector2(24 * CELL, 9 * CELL)
			draw_colored_polygon(PackedVector2Array([screen(gate_origin), screen(gate_origin + Vector2(14, 0)), screen(gate_origin + Vector2(14, 160)), screen(gate_origin + Vector2(0, 160))]), gate_color)
			draw_string(ThemeDB.fallback_font, gate_point + Vector2(-42, -48) * zoom, "BOSS DOOR OPEN" if bool(dungeon.get("open", false)) else "BOSS DOOR LOCKED", HORIZONTAL_ALIGNMENT_LEFT, -1, int(11 * zoom), gate_color)
		for door in dungeon.get("entrances", []):
			if bool(door.get("primary", false)):
				var p := screen(Vector2(float(door.get("x", 0)), float(door.get("y", 0))))
				if on_screen(p):
					draw_set_transform(p, 0, Vector2(zoom, zoom * (tilt if iso else 1.0)))
					draw_circle(Vector2.ZERO, 24, Color("04080ae8"))
					draw_arc(Vector2.ZERO, 25, 0, TAU, 32, Color("8c847177"), 2, true)
					draw_set_transform(Vector2.ZERO)
		var stairs = dungeon.get("stairs")
		if stairs is Dictionary:
			var p := screen(Vector2(float(stairs.get("x", 0)), float(stairs.get("y", 0))))
			for i in range(5):
				var origin := Vector2(float(stairs.x) - 28 + i * 4, float(stairs.y) - 26 + i * 10)
				var width := 56 - i * 8
				draw_colored_polygon(PackedVector2Array([screen(origin), screen(origin + Vector2(width, 0)), screen(origin + Vector2(width, 7)), screen(origin + Vector2(0, 7))]), Color("bce9df"))
			var font := ThemeDB.fallback_font
			draw_string(font, p + Vector2(-30, -42) * zoom, "DESCEND", HORIZONTAL_ALIGNMENT_LEFT, -1, int(12 * zoom), Color("bce9df"))
	for drop in snapshot.get("drops", []):
		var p := screen(Vector2(float(drop.get("x", 0)), float(drop.get("y", 0))))
		if not on_screen(p, 30):
			continue
		var color: Color = {"xp": Color("79d9fb"), "heal": Color("ff7482"), "loot": Color("ffd279"), "nightGold": Color("ffdc75"), "nightRelic": Color("d6a4ff"), "shield": Color("b5dfff")}.get(str(drop.get("type", "xp")), Color("b6edb6"))
		draw_circle(p, 7 * zoom, Color(color, 0.15))
		draw_colored_polygon(PackedVector2Array([p + Vector2(0, -5) * zoom, p + Vector2(4, 0) * zoom, p + Vector2(0, 5) * zoom, p + Vector2(-4, 0) * zoom]), color)
	for pad in snapshot.get("adventurePads", []) + snapshot.get("adventureBossPads", []):
		if bool(pad.get("done", false)):
			continue
		var p := screen(Vector2(float(pad.get("x", 0)), float(pad.get("y", 0))))
		if on_screen(p):
			draw_set_transform(p, 0, Vector2(zoom, zoom * (tilt if iso else 1.0)))
			draw_arc(Vector2.ZERO, 34, 0, TAU, 48, Color("efd28bcc"), 2, true)
			draw_arc(Vector2.ZERO, 38, -PI / 2, -PI / 2 + TAU * clampf(float(pad.get("hold", 0)) / 1.25, 0, 1), 40, Color("a7e5bf"), 4, true)
			draw_set_transform(Vector2.ZERO)
			var kind := str(pad.get("kind", "treasure"))
			var label: String = {"rescue": "RESCUE · STAND HERE", "treasure": "LEGENDARY CACHE", "choir": "CHOIR ANCHOR", "vent": "FURNACE VALVE"}.get(kind, kind.to_upper())
			var font := ThemeDB.fallback_font
			var text_width := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, int(11 * zoom)).x
			draw_string(font, p + Vector2(-text_width / 2, -48 * zoom), label, HORIZONTAL_ALIGNMENT_LEFT, -1, int(11 * zoom), Color("efd28b"))

func draw_floor(poly: PackedVector2Array, tile: Texture2D, uv: PackedVector2Array) -> void:
	if tile:
		draw_polygon(poly, PackedColorArray([Color(0.72, 0.72, 0.76)]), uv, tile)
	else:
		draw_colored_polygon(poly, FLOOR_COLORS[zone])
	draw_polyline(PackedVector2Array([poly[0], poly[1], poly[2], poly[3], poly[0]]), Color(0.05, 0.065, 0.08, 0.28), 1, true)

func update_walls(_dungeon: Dictionary) -> void:
	var used := 0
	for cell in wall_cells:
		var poly := tile_polygon(cell)
		var p := screen((Vector2(cell) + Vector2(0.5, 0.5)) * CELL)
		if not on_screen(p, 170):
			continue
		if used >= wall_nodes.size():
			var wall := Wall.new()
			add_child(wall)
			wall_nodes.append(wall)
		var wall = wall_nodes[used]
		used += 1
		wall.visible = true
		wall.position = p
		wall.corners = PackedVector2Array([poly[0] - p, poly[1] - p, poly[2] - p, poly[3] - p])
		wall.lift = 42 * zoom
		wall.texture = floor_texture()
		wall.stone = STONE_COLORS[zone]
		wall.z_index = depth(poly[2])
		var relative := p - screen(Vector2(float(hero.get("x", 0)), float(hero.get("y", 0))))
		wall.modulate.a = 0.18 if absf(relative.x) < 105 * zoom and relative.y > -35 * zoom and relative.y < 140 * zoom else 1.0
		wall.queue_redraw()

func actor_for(key: String, world: Vector2) -> Actor:
	var actor: Actor = actors.get(key)
	if actor == null:
		actor = Actor.new()
		add_child(actor)
		actors[key] = actor
	actor.position = screen(world)
	actor.z_index = depth(actor.position)
	actor.scale = Vector2.ONE * zoom
	actor.visible = on_screen(actor.position)
	actor.ellipse_tilt = tilt if iso else 0.42
	actor.ring = Color.TRANSPARENT
	actor.outline = Color.TRANSPARENT
	actor.bar = -1
	actor.label = ""
	actor.draw_shadow = true
	actor.modulate = Color.WHITE
	return actor

func ordinary_sprite(actor: Actor, key: String, height: float, flip := false, width := 0.0) -> void:
	var texture := texture_for(key)
	actor.sprite.texture = texture
	actor.sprite.hframes = 1
	actor.sprite.vframes = 1
	actor.sprite.frame = 0
	actor.sprite.flip_h = flip
	actor.height = height
	if texture:
		var size := texture.get_size()
		var real_width := width if width > 0 else minf(height * 1.4, height * size.x / size.y)
		actor.sprite.scale = Vector2(real_width / size.x, height / size.y)
		actor.sprite.position = Vector2(-real_width / 2, -height)
	actor.queue_redraw()

func facing_key(base: String, data: Dictionary) -> String:
	var face := project(Vector2(float(data.get("faceX", 0)), float(data.get("faceY", 1))))
	var key := base + ("-back" if face.y < -0.15 else "")
	if base == "wolf" and absf(face.x) > absf(face.y) * 0.72:
		key = base + "-side"
	if float(data.get("cast", 0)) > 0.025 and texture_for(key + "-cast"):
		return key + "-cast"
	return key if texture_for(key) else base

func update_hero() -> void:
	if hero.is_empty():
		return
	var actor := actor_for("hero", Vector2(float(hero.get("x", 0)), float(hero.get("y", 0))))
	var kind := str(hero.get("class", "gravecaller"))
	var pose: Dictionary = snapshot.get("heroPose", {})
	var height := float(pose.get("height", 90 if kind in ["bloodknight", "frostwarden"] else 80))
	actor.radius = 20
	actor.ring = HERO_COLORS.get(kind, Color("bb94ff"))
	var variants: Array = manifest.get("heroes", {}).get(kind, [])
	if not variants.is_empty():
		actor.sprite.texture = file_texture(str(variants[clampi(int(pose.get("variant", 0)), 0, variants.size() - 1)]))
		actor.sprite.hframes = 6
		actor.sprite.vframes = 5
		actor.sprite.frame = clampi(int(pose.get("frame", 0)), 0, 29)
		actor.sprite.flip_h = bool(pose.get("flip", false))
		actor.sprite.scale = Vector2.ONE * height / 192.0
		actor.sprite.position = Vector2(-112, -188) * height / 192.0
		actor.height = height
	else:
		ordinary_sprite(actor, facing_key(kind, hero), height, bool(pose.get("flip", false)))
	if float(hero.get("inv", 0)) > 0 and int(float(hero.get("inv", 0)) * 16) % 2 == 1:
		actor.modulate.a = 0.45
	if kind == "rogue" and float(hero.get("veilUntil", 0)) > clock:
		actor.modulate.a = 0.5
	actor.queue_redraw()

func update_enemy(data: Dictionary, index: int) -> void:
	var p := Vector2(float(data.get("x", 0)), float(data.get("y", 0)))
	if not on_screen(screen(p)):
		return
	var actor := actor_for("enemy:%s" % index, p)
	var type := str(data.get("type", "skeleton"))
	var base := str(data.get("variant", "brute")) if type == "boss" else "brute" if type == "champion" else "runner" if type == "charger" else type
	var radius := float(data.get("r", 16))
	var height := radius * (2.8 * 1.2 if type == "boss" else 2.6 * 1.18 if type == "champion" else 2.3 * 1.18 if type == "burrower" else 3.25 * 1.18)
	actor.radius = radius
	if type in ["boss", "champion"] or bool(data.get("eventElite", false)) or bool(data.get("nightChampion", false)):
		actor.ring = Color("f4bd5e") if type != "boss" else Color("ff8e5d")
		actor.outline = Color("f4bd5eaa")
	elif type == "caster":
		actor.outline = Color("e395faaa")
	elif type == "charger":
		actor.outline = Color("ff705bbb")
	var facing := project(Vector2(float(data.get("faceX", 0)), float(data.get("faceY", 1))))
	ordinary_sprite(actor, facing_key(base, data), height, facing.x < -0.25)
	if bool(data.get("walking", false)):
		actor.sprite.position += Vector2(sin(float(data.get("stepPhase", 0))) * 1.3, -absf(sin(float(data.get("stepPhase", 0)))) * 1.5)
	if float(data.get("burrow", 0)) > 0:
		actor.modulate.a = 0.38
	var maximum := maxf(1, float(data.get("max", data.get("maxHp", 1))))
	if float(data.get("hp", maximum)) < maximum:
		actor.bar = float(data.get("hp", maximum)) / maximum
		actor.bar_color = Color("ff8e5d") if type == "boss" else Color("e6b97a")
	actor.queue_redraw()

func update_companion(data: Dictionary, index: int) -> void:
	var actor := actor_for("companion:%s" % index, Vector2(float(data.get("x", 0)), float(data.get("y", 0))))
	var kind := str(data.get("kind", "skeleton"))
	var height := 110.0 if kind == "giant" else 44.0 if kind == "wolf" else 64.0
	actor.radius = 18
	actor.ring = Color("92e8ff") if kind == "wolf" else Color("c69bff")
	actor.bar = float(data.get("hp", 1)) / maxf(1, float(data.get("max", 1)))
	actor.bar_color = actor.ring
	var face := project(Vector2(float(data.get("faceX", 0)), float(data.get("faceY", 1))))
	ordinary_sprite(actor, facing_key("wolf" if kind == "wolf" else "skeleton", data), height, face.x < 0)
	actor.queue_redraw()

func prop(key: String, world: Vector2, art_key: String, width: float, height: float, label := "") -> void:
	if not on_screen(screen(world)):
		return
	var actor := actor_for(key, world)
	actor.radius = width * 0.28
	actor.label = label
	ordinary_sprite(actor, art_key, height, false, width)

func update_props(dungeon) -> void:
	if dungeon is Dictionary:
		var secret = dungeon.get("secret")
		if secret is Dictionary and bool(secret.get("revealed", false)) and not bool(secret.get("used", false)):
			var reward: Dictionary = secret.get("reward", {})
			prop("secret:reward", Vector2(float(reward.get("x",0)),float(reward.get("y",0))), "prop-chest", 44, 48, "SECRET RELIC")
	if dungeon is Dictionary:
		var index := 0
		for room in dungeon.get("rooms", []):
			var x: float = float(room[0]) if room is Array else float(room.get("x", 0))
			var y: float = float(room[1]) if room is Array else float(room.get("y", 0))
			var rw: float = float(room[2]) if room is Array else float(room.get("w", 1))
			var rh: float = float(room[3]) if room is Array else float(room.get("h", 1))
			prop("tomb:%s" % index, Vector2(x + rw - 0.6, y + rh - 0.4) * CELL, "prop-tomb-%s" % zone, 70, 90)
			var key := "prop-%s-brazier" % ["ash", "frost", "venom"][zone]
			if not texture_for(key):
				key = "prop-brazier"
			prop("brazier:a:%s" % index, Vector2(x + 0.6, y + rh - 0.6) * CELL, key, 32, 50)
			prop("brazier:b:%s" % index, Vector2(x + rw - 0.7, y + 0.7) * CELL, key, 32, 50)
			index += 1
	var things: Array = snapshot.get("things", snapshot.get("sites", []))
	for i in range(things.size()):
		var thing: Dictionary = things[i]
		if bool(thing.get("used", false)):
			continue
		var kind := str(thing.get("kind", "chest"))
		prop("thing:%s" % i, Vector2(float(thing.get("x", 0)), float(thing.get("y", 0))), "prop-well" if kind == "well" else "prop-brazier" if kind == "forge" else "prop-chest", 67, 68, kind.to_upper())

func update_lights(dungeon) -> void:
	var candidates: Array[Vector2] = []
	if not hero.is_empty():
		candidates.append(Vector2(float(hero.get("x", 0)), float(hero.get("y", 0))))
	if dungeon is Dictionary:
		for room in dungeon.get("rooms", []):
			if room is Array:
				var p := Vector2(float(room[0]) + 0.6, float(room[1]) + float(room[3]) - 0.6) * CELL
				if on_screen(screen(p), 30):
					candidates.append(p)
	var cap := clampi(int(snapshot.get("quality", {}).get("maxLights", 6)), 0, lights.size())
	for i in range(lights.size()):
		var light := lights[i]
		light.visible = i < cap and i < candidates.size()
		if light.visible:
			light.position = screen(candidates[i]) + Vector2(0, -14) * zoom
			light.color = HERO_COLORS.get(str(hero.get("class", "gravecaller")), Color("bb94ff")) if i == 0 else [Color("ffb66e"), Color("a5e4ff"), Color("b7db78")][zone]
			light.texture_scale = zoom * (2.4 if i == 0 else 1.5)
			light.energy = 0.26 if i == 0 else 0.32 + sin(clock * 3 + i) * 0.025

func update_arena_walls() -> void:
	var used := 0
	for rect in snapshot.get("arenaWalls", []):
		var origin := Vector2(float(rect.x), float(rect.y))
		var size := Vector2(float(rect.w), float(rect.h))
		var p := screen(origin + size / 2)
		if not on_screen(p, 170):
			continue
		if used >= wall_nodes.size():
			var wall := Wall.new()
			add_child(wall)
			wall_nodes.append(wall)
		var wall = wall_nodes[used]
		used += 1
		wall.position = p
		wall.corners = PackedVector2Array([screen(origin)-p, screen(origin+Vector2(size.x,0))-p, screen(origin+size)-p, screen(origin+Vector2(0,size.y))-p])
		wall.visible = true
		wall.texture = floor_texture()
		wall.stone = STONE_COLORS[zone]
		wall.lift = 42 * zoom
		wall.z_index = depth(screen(origin+size))
		var relative := p-screen(Vector2(float(hero.get("x",0)),float(hero.get("y",0))))
		wall.modulate.a = 0.18 if absf(relative.x)<105*zoom and relative.y>-35*zoom and relative.y<140*zoom else 1.0
		wall.queue_redraw()
