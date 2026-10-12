extends SceneTree
## Native-renderer capture. Run with --script tests/capture.gd -- --capture=/path.png
func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var packed: PackedScene = load("res://scenes/preview.tscn")
	var game: Node2D = packed.instantiate()
	root.add_child(game)
	await process_frame
	if OS.get_cmdline_user_args().has("--boss"):
		game.hero.pos=Vector2(20.5,9)*80
		game.door_open=true
		game._physics_process(.016)
		game.boss.attack=0
		game.boss.hp=800
	for p: Vector2 in [] if OS.get_cmdline_user_args().has("--boss") else [Vector2(490,640),Vector2(400,800),Vector2(570,740),Vector2(290,620)]:
		var enemy: Dictionary = game._unit("skeleton",p,150)
		game.enemies.append(enemy)
	game.spawn_cd=99
	await create_timer(.6).timeout
	var output := "/tmp/Ember-Crypt-Godot-Preview.png"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--capture="):
			output=arg.substr(10)
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	var error := image.save_png(output)
	print("CAPTURE ",output," ",image.get_size()," ERROR ",error)
	game.mode="paused"
	game.stop_audio()
	await create_timer(.25).timeout
	game.queue_free()
	await process_frame
	quit(error)
