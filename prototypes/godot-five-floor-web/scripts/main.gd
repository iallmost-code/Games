extends Node2D
## Web-only prototype: original JS simulation/UI; native Godot world and effects.
var world: Node2D
var effects: Node2D
var host: JavaScriptObject
var status: Label
var ready_logged := false

func _ready() -> void:
	world = load("res://scripts/world_view.gd").new()
	effects = load("res://scripts/fx_view.gd").new()
	add_child(world)
	add_child(effects)
	status = Label.new()
	status.text = "Loading seven heroes and five dungeon floors…"
	status.position = Vector2(32, 90)
	add_child(status)
	if not OS.has_feature("web"):
		status.text = "Open this project in the Godot Web Editor 4.7.2 and press Play.\nThis prototype uses JavaScriptBridge and requires the Web platform."
		return
	JavaScriptBridge.eval(FileAccess.get_file_as_string("res://scripts/web_host.js"), true)
	host = JavaScriptBridge.get_interface("emberGodotHost")
	var files = JSON.parse_string(FileAccess.get_file_as_string("res://source/files.json"))
	for i in range(files.size()):
		var item: Dictionary = files[i]
		host.addFile(item.path, Marshalls.raw_to_base64(FileAccess.get_file_as_bytes(item.file)), item.mime)
		if i % 8 == 0:
			await get_tree().process_frame
	host.start(FileAccess.get_file_as_string("res://source/index.html"))

func _process(_delta: float) -> void:
	if host == null:
		return
	var encoded = host.getSnapshot()
	if encoded == null or str(encoded).is_empty():
		return
	var state = JSON.parse_string(str(encoded))
	if not state is Dictionary:
		return
	status.hide()
	var size := get_viewport_rect().size
	var camera: Dictionary = state.get("camera", {})
	var factor := size / Vector2(maxf(1, float(camera.get("w", size.x))), maxf(1, float(camera.get("h", size.y))))
	world.scale = factor
	effects.scale = factor
	world.set_snapshot(state)
	effects.set_snapshot(state)
	var map = state.get("dungeon")
	host.presented(str(state.get("hero", {}).get("class", "")), int(map.get("floor", 0)) if map is Dictionary else 0, int(state.get("heroPose", {}).get("frame",0)))
	if not ready_logged:
		print("EMBER_GODOT_NATIVE_READY")
		ready_logged = true

func _exit_tree() -> void:
	if host != null:
		host.close()
