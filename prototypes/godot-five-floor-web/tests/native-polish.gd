extends SceneTree
const View = preload("res://scripts/world_view.gd")
func _initialize() -> void:
	call_deferred("run")
func check(value: bool, label: String) -> bool:
	if not value:
		print("FAIL visual polish: " + label)
		quit(1)
	return value
func run() -> void:
	var view = View.new()
	root.add_child(view)
	if not check(view.has_method("floor_uv"), "floor texture must continue across adjoining cells instead of repeating each cell"):
		return
	var a: PackedVector2Array = view.floor_uv(Vector2i(0,0))
	var b: PackedVector2Array = view.floor_uv(Vector2i(1,0))
	if not check(a[1].is_equal_approx(b[0]) and a[2].is_equal_approx(b[3]), "adjacent floor UV edges must join"):
		return
	var state := {"camera":{"w":1280,"h":720,"zoom":1,"tilt":0.58,"isometric":true,"focusY":410},"hero":{"class":"gravecaller","x":440,"y":840,"hp":100},"heroPose":{"frame":0,"height":80},"zone":0,"clock":1,"quality":{"maxAtmosphere":32,"maxLights":4},"dungeon":{"floor":1,"cells":[[5,10],[6,10]],"rooms":[[4,7,6,6]],"open":true},"enemies":[],"companions":[],"drops":[],"sites":[]}
	var before := JSON.stringify(state)
	view.set_snapshot(state)
	if not check(view.wall_cells.size()>0,"boundary walls required"):
		return
	var hidden_faces := 0
	for wall in view.wall_nodes:
		if wall.visible and (not wall.east_face or not wall.south_face):
			hidden_faces += 1
	if not check(hidden_faces>0,"shared wall faces must be hidden, retaining outer faces"):
		return
	if not check(view.actors["hero"].sprite.modulate.r>1,"hero must remain brighter than dark environmental texture"):
		return
	var bounds = view.actors["hero"].halo.material.get_shader_parameter("frame_rect")
	if not check(bounds is Vector4 and bounds.is_equal_approx(Vector4(0,0,1.0/6,1.0/5)),"hero rim samples must remain inside the selected sprite frame"):
		return
	for zone in range(3):
		state.zone=zone
		view.set_snapshot(state)
		var themed := 0
		for key in view.actors:
			if str(key).begins_with("scenery:") and view.actors[key].visible:
				themed += 1
		if not check(themed>0,"zone scenery must be present"):
			return
	state.zone=0
	state.quality.maxAtmosphere=8
	view.set_snapshot(state)
	var count := 0
	for key in view.actors:
		if str(key).begins_with("scenery:") and view.actors[key].visible:
			count += 1
	if not check(count<=8,"low quality caps decorative scenery"):
		return
	state.quality.maxAtmosphere=32
	view.set_snapshot(state)
	if not check(JSON.stringify(state)==before,"presentation must leave gameplay snapshot unchanged"):
		return
	print("PASS native polish: floor continuity, hidden inner wall faces, hero contrast, themed scenery, quality cap, model purity")
	quit(0)
