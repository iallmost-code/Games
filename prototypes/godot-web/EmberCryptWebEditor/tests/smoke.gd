extends SceneTree
## Independent integration assertions; runs in the real Godot engine.
var checks := 0
var game: Node2D

func _initialize() -> void:
	call_deferred("run")

func check(condition: bool,message: String) -> void:
	if not condition:
		push_error("FAIL: "+message)
		quit(1)
		assert(condition,message)
	checks+=1

func clear_enemies() -> void:
	for e: Dictionary in game.enemies:
		e.visual.queue_free()
	game.enemies.clear()
	game.boss={}
	game.boss_mark={}

func run() -> void:
	game=load("res://scenes/preview.tscn").instantiate()
	root.add_child(game)
	await process_frame
	check(game.sounds.values().all(func(sample): return sample is AudioStream),"All sampled sound resources imported")
	check(game.dash_button is Button and game.ultimate_button is Button,"Clickable skill buttons ready")
	var finger := InputEventScreenTouch.new()
	finger.index=0
	finger.position=Vector2(200,500)
	finger.pressed=true
	game._input(finger)
	var drag := InputEventScreenDrag.new()
	drag.index=0
	drag.position=Vector2(250,500)
	game._input(drag)
	check(game.stick_active and game.movement_input().x>.8,"Floating joystick supplies movement")
	var second := InputEventScreenTouch.new()
	second.index=1
	second.position=Vector2(240,520)
	second.pressed=true
	game._input(second)
	check(game.stick_id==0,"Second left finger cannot steal joystick")
	second.position=Vector2(1200,650)
	second.pressed=false
	game._input(second)
	check(game.stick_active,"Skill finger release preserves joystick finger")
	finger.pressed=false
	game._input(finger)
	check(not game.stick_active and game.stick==Vector2.ZERO,"Joystick stops on owning finger release")
	check(game.hero.hp==140 and game.armor==45,"Bloodknight starting stats")
	check(game.cells.size()>170,"Connected dungeon populated")
	var queue: Array[Vector2i]=[Vector2i(4,8)]
	var seen: Dictionary={Vector2i(4,8):true}
	for cell: Vector2i in queue:
		for step: Vector2i in [Vector2i(1,0),Vector2i(-1,0),Vector2i(0,1),Vector2i(0,-1)]:
			if game.cells.has(cell+step) and not seen.has(cell+step):
				seen[cell+step]=true
				queue.append(cell+step)
	check(seen.size()==game.cells.size(),"All rooms and stairs connected")
	check(game.blocked(Vector2(17.5,9)*80),"Boss gate initially blocks movement")
	game.door_open=true
	check(not game.blocked(Vector2(17.5,9)*80),"Unlocked boss gate permits movement")
	game.door_open=false
	for p in [Vector2(1,0),Vector2(0,1),Vector2(4,8),Vector2(-6,5)]:
		check(game.unproject(game.project(p)).distance_to(p)<.0001,"Projection/input roundtrip")
	game.hero.pos=Vector2(4.5,8.5)*80
	game.hero.face=Vector2.RIGHT
	var victim: Dictionary=game._unit("skeleton",game.hero.pos+Vector2(-65,0),300)
	game.enemies.append(victim)
	game.swing()
	check(victim.hp==242,"Blade auto-aim hits chasing foe behind hero")
	var hp: float=victim.hp
	victim.pos=game.hero.pos+Vector2(230,0)
	game.swing()
	check(victim.hp==hp,"Blade does not hit outside reach")
	clear_enemies()
	game.hero.pos=Vector2(240,490)
	victim=game._unit("skeleton",Vector2(240,440),300)
	game.enemies.append(victim)
	game.swing()
	check(victim.hp==300,"Blade does not hit through dungeon wall")
	game.hero.pos=Vector2(230,650)
	game.move_unit(game.hero,Vector2(-500,0))
	check(not game.blocked(game.hero.pos),"Large movement cannot tunnel through wall")
	game.hero.pos=Vector2(4.5,8.5)*80
	game.hero.inv=0
	check(game.use_dash(),"Dash activates")
	check(not game.use_dash(),"Dash cooldown prevents repeat")
	hp=game.hero.hp
	game.take_hit(30)
	check(game.hero.hp==hp,"Dash invulnerability blocks boss-sized damage")
	game.hero.inv=0
	game.armor=0
	game.take_hit(30)
	check(game.hero.hp==hp-30,"Damage resumes when invulnerability ends")
	clear_enemies()
	victim=game._unit("skeleton",game.hero.pos+Vector2(120,0),500)
	game.enemies.append(victim)
	game.ultimate=100
	check(game.use_ultimate(),"Earthsplitter activates")
	check(victim.hp==152 and victim.stun==2,"Earthsplitter damages and stuns")
	check(not game.use_ultimate(),"Ultimate cannot fire without charge")
	clear_enemies()
	game.hero.inv=999
	game.kills=12
	game._physics_process(.016)
	check(game.door_open,"Kill goal unlocks boss door")
	game.hero.pos=Vector2(18.5,9)*80
	game._physics_process(.016)
	check(game.boss and game.boss.kind=="warden","Entering chamber spawns boss")
	game.hit_enemy(game.boss,2000)
	check(game.stairs,"Boss defeat reveals stairs")
	game.hero.pos=game.stairs_pos
	game._physics_process(.016)
	check(game.mode=="victory","Walking onto stairs completes preview")
	game._restart()
	check(game.mode=="play" and game.hero.hp==140 and game.enemies.is_empty(),"Restart resets all actors and skills")
	game.hero.inv=0
	game.hero.hp=1
	game.armor=0
	game.take_hit(10)
	check(game.mode=="over" and game.hero.dead,"Lethal hit shows game-over immediately")
	game._restart()
	var event := InputEventAction.new()
	event.action="pause"
	event.pressed=true
	game._unhandled_input(event)
	check(game.mode=="paused" and paused,"Escape pauses gameplay")
	game._unhandled_input(event)
	check(game.mode=="play" and not paused,"Escape resumes gameplay")
	check(game.audio_players.size()==8,"Bounded audio voices")
	check(game.actors.y_sort_enabled,"Native depth sorting enabled")
	var frames: SpriteFrames = game.hero.visual.animated.sprite_frames
	check(frames.get_frame_count("front")==6 and frames.get_frame_count("attack")==6 and frames.get_frame_count("death")==3,"Authored animation sequences imported")
	var report := {"engine":Engine.get_version_info().string,"checks":checks,"result":"PASS","scope":"PC visual slice; not production balance/save compatibility or physical-device testing"}
	var file := FileAccess.open("res://tests/validation.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"  "))
	file.close()
	print("PASS ",checks," GODOT INTEGRATION CHECKS")
	game.stop_audio()
	await create_timer(.25).timeout
	game.queue_free()
	await process_frame
	quit(0)
