extends Node2D
## Standalone Web Editor visual slice, not the production game's save/progression port.
const TILE := 80.0
const Avatar = preload("res://scripts/avatar.gd")
const Ground = preload("res://scripts/environment.gd")
const Wall = preload("res://scripts/wall.gd")
const Hud = preload("res://scripts/hud.gd")
var cells: Dictionary = {}
var hero: Dictionary = {}
var enemies: Array[Dictionary] = []
var effects: Array[Dictionary] = []
var lava: Array[Dictionary] = []
var boss: Dictionary = {}
var boss_mark: Dictionary = {}
var actors: Node2D
var ground: Node2D
var camera: Camera2D
var hero_light: PointLight2D
var hud: Node2D
var glow: Texture2D
var rng := RandomNumberGenerator.new()
var elapsed := 0.0
var kills := 0
var armor := 45.0
var last_hit := -10.0
var attack_cd := 0.0
var dash_cd := 0.0
var dash_time := 0.0
var dash_direction := Vector2.DOWN
var ultimate := 100.0
var mode := "play"
var door_open := false
var stairs := false
var stairs_pos := Vector2(1720,680)
var spawn_cd := 2.0
var toast := "BLOODKNIGHT  /  EXPLORE THE FROST WALK"
var toast_time := 5.0
var muted := false
var audio_players: Array[AudioStreamPlayer] = []
var sounds: Dictionary = {}
var ambient: AudioStreamPlayer
var floaters: Array[Dictionary] = []
var floater_layer: Node2D
var stick := Vector2.ZERO
var stick_origin := Vector2.ZERO
var stick_active := false
var stick_id := -2
var dash_button: Button
var ultimate_button: Button

func project(point: Vector2) -> Vector2:
	return Vector2((point.x-point.y)*0.70710678,(point.x+point.y)*0.70710678*0.55)

func unproject(point: Vector2) -> Vector2:
	return Vector2((point.x+point.y/0.55)*0.70710678,(point.y/0.55-point.x)*0.70710678)

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	get_tree().auto_accept_quit = false
	Engine.max_fps = 60
	rng.seed = 17073
	_setup_input()
	_build_map()
	glow = _glow_texture()
	ground = Ground.new()
	ground.game = self
	ground.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(ground)
	var ambient_tint := CanvasModulate.new()
	ambient_tint.color = Color(.66,.74,.83)
	add_child(ambient_tint)
	actors = Node2D.new()
	actors.y_sort_enabled = true
	actors.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(actors)
	_build_walls()
	_build_props()
	camera = Camera2D.new()
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 7.0
	add_child(camera)
	camera.make_current()
	var ui := CanvasLayer.new()
	ui.layer = 20
	add_child(ui)
	hud = Hud.new()
	hud.game = self
	ui.add_child(hud)
	_add_skill_buttons(ui)
	_setup_audio()
	_restart()
	print("EMBER_FROST_READY")

func _setup_input() -> void:
	var actions := {"left":[KEY_A,KEY_LEFT],"right":[KEY_D,KEY_RIGHT],"up":[KEY_W,KEY_UP],"down":[KEY_S,KEY_DOWN],"dash":[KEY_SPACE],"ultimate":[KEY_E],"pause":[KEY_ESCAPE],"restart":[KEY_R],"mute":[KEY_M],"fullscreen":[KEY_F11]}
	for action: String in actions:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key: int in actions[action]:
			var event := InputEventKey.new()
			event.physical_keycode = key
			InputMap.action_add_event(action,event)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") and mode in ["play","paused"]:
		mode = "paused" if mode=="play" else "play"
		get_tree().paused = mode=="paused"
		ambient.stream_paused = mode=="paused"
	elif event.is_action_pressed("restart"):
		_restart()
	elif event.is_action_pressed("mute"):
		muted = not muted
		AudioServer.set_bus_mute(0,muted)
	elif event.is_action_pressed("fullscreen"):
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if DisplayServer.window_get_mode()==DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)
	elif mode == "play":
		if event.is_action_pressed("dash"):
			use_dash()
		elif event.is_action_pressed("ultimate"):
			use_ultimate()

func _build_map() -> void:
	for room: Rect2i in [Rect2i(2,6,6,6),Rect2i(10,6,6,6),Rect2i(18,5,7,8),Rect2i(10,1,6,3),Rect2i(3,14,5,4),Rect2i(8,8,2,2),Rect2i(16,8,2,2),Rect2i(12,4,2,2),Rect2i(5,12,2,2)]:
		for x in range(room.position.x,room.end.x):
			for y in range(room.position.y,room.end.y):
				cells[Vector2i(x,y)] = true
	for p in [Vector2(8.5,7.5),Vector2(9.5,10.5),Vector2(16.5,7.5),Vector2(17.5,10.5),Vector2(11.5,4.5),Vector2(14.5,5.5),Vector2(4.5,12.5),Vector2(7.5,13.5)]:
		lava.append({"pos":p*TILE,"phase":p.x})

func _build_walls() -> void:
	for cell: Vector2i in cells:
		for side: Vector2i in [Vector2i(-1,0),Vector2i(0,-1)]:
			if cells.has(cell+side):
				continue
			var world := Vector2(cell)*TILE
			var a := world
			var b := world+Vector2(TILE,0) if side.y else world+Vector2(0,TILE)
			var wall := Wall.new()
			wall.game = self
			wall.position = project((a+b)/2)
			wall.a = project(a)-wall.position
			wall.b = project(b)-wall.position
			wall.center_world = (a+b)/2
			actors.add_child(wall)
	var gate := Wall.new()
	gate.game = self
	gate.gate = true
	gate.tall = 68
	gate.position = project(Vector2(17.5,9)*TILE)
	gate.a = project(Vector2(17.5,8)*TILE)-gate.position
	gate.b = project(Vector2(17.5,10)*TILE)-gate.position
	actors.add_child(gate)

func _build_props() -> void:
	for entry: Array in [["brazier",Vector2(2.7,6.8),66.0],["brazier",Vector2(7.1,10.8),66.0],["brazier",Vector2(10.7,6.8),66.0],["brazier",Vector2(15.1,10.8),66.0],["brazier",Vector2(18.7,5.8),66.0],["brazier",Vector2(24.1,11.8),66.0],["pillar",Vector2(3.1,10.9),110.0],["pillar",Vector2(14.7,7.2),110.0],["pillar",Vector2(19,11.9),115.0],["coffin",Vector2(12.2,2.2),55.0],["bones",Vector2(4.2,15.4),35.0],["statue",Vector2(22.7,6.4),105.0],["chain",Vector2(11.0,10.7),100.0]]:
		var node := Node2D.new()
		node.position = project(entry[1]*TILE)
		actors.add_child(node)
		var sprite := Sprite2D.new()
		sprite.texture = load("res://assets/environment/"+entry[0]+".webp")
		sprite.centered = false
		var scale: float = entry[2]/float(sprite.texture.get_height())
		sprite.scale = Vector2.ONE*scale
		sprite.position = Vector2(-sprite.texture.get_width()*scale/2,-entry[2])
		node.add_child(sprite)
		if entry[0]=="brazier":
			var light := _light(Color(.48,.76,1),1.1,2.2)
			light.position = node.position+Vector2(0,-18)
			add_child(light)
		if entry[0]=="pillar":
			var occluder := LightOccluder2D.new()
			var polygon := OccluderPolygon2D.new()
			polygon.polygon = PackedVector2Array([Vector2(-12,-12),Vector2(12,-12),Vector2(12,7),Vector2(-12,7)])
			occluder.occluder = polygon
			node.add_child(occluder)

func _glow_texture() -> Texture2D:
	var image := Image.create(256,256,false,Image.FORMAT_RGBA8)
	for y in range(256):
		for x in range(256):
			var d: float = Vector2(x-128,y-128).length()/128
			image.set_pixel(x,y,Color(1,1,1,pow(maxf(0,1-d),2.0)))
	return ImageTexture.create_from_image(image)

func _light(color: Color,scale: float,energy: float) -> PointLight2D:
	var light := PointLight2D.new()
	light.texture = glow
	light.texture_scale = scale
	light.color = color
	light.energy = energy
	light.shadow_enabled = true
	light.shadow_filter = Light2D.SHADOW_FILTER_PCF5
	return light

func _restart() -> void:
	get_tree().paused = false
	mode = "play"
	for enemy: Dictionary in enemies:
		if is_instance_valid(enemy.visual):
			enemy.visual.queue_free()
	enemies.clear()
	if hero and is_instance_valid(hero.visual):
		hero.visual.queue_free()
	if is_instance_valid(hero_light):
		hero_light.queue_free()
	hero = _unit("hero",Vector2(4.5,8.5)*TILE,140.0)
	hero_light = _light(Color(.9,.82,.68),1.4,1.3)
	hero_light.shadow_enabled = false
	add_child(hero_light)
	elapsed = 0
	kills = 0
	armor = 45
	last_hit = -10
	attack_cd = .3
	dash_cd = 0
	dash_time = 0
	ultimate = 100
	door_open = false
	stairs = false
	boss = {}
	boss_mark = {}
	effects.clear()
	floaters.clear()
	spawn_cd = 2
	toast = "BLOODKNIGHT  /  E IS READY TO TRY EARTHSPLITTER"
	toast_time = 5
	ambient.stream_paused = false
	camera.position = project(hero.pos)+Vector2(0,-65)
	camera.reset_smoothing()

func _unit(kind: String,at: Vector2,hp: float) -> Dictionary:
	var unit := {"kind":kind,"pos":at,"hp":hp,"max_hp":hp,"radius":14.0 if kind!="warden" else 36.0,"face":Vector2.DOWN,"moving":false,"cast":0.0,"hit":0.0,"dead":false,"death":0.5,"arrive":0.0,"phase":rng.randf()*TAU,"attack":.5,"stun":0.0,"speed":207.0 if kind=="hero" else 43.0 if kind=="warden" else 80.0 if kind=="runner" else 63.0,"inv":0.0}
	var visual := Avatar.new()
	visual.game = self
	visual.unit = unit
	unit.visual = visual
	actors.add_child(visual)
	return unit

func blocked(at: Vector2,radius: float=14) -> bool:
	for point: Vector2 in [at,at+Vector2(radius,0),at-Vector2(radius,0),at+Vector2(0,radius),at-Vector2(0,radius),at+Vector2(radius*.707,radius*.707),at-Vector2(radius*.707,radius*.707),at+Vector2(radius*.707,-radius*.707),at+Vector2(-radius*.707,radius*.707)]:
		var cell := Vector2i(floori(point.x/TILE),floori(point.y/TILE))
		if not cells.has(cell) or (not door_open and cell.x==17 and cell.y in [8,9]):
			return true
	return false

func segment_blocked(a: Vector2,b: Vector2) -> bool:
	var steps: int = maxi(1,ceili(a.distance_to(b)/8))
	for i in range(steps+1):
		if blocked(a.lerp(b,float(i)/steps),2):
			return true
	return false

func move_unit(unit: Dictionary,offset: Vector2) -> void:
	# Substeps prevent a dash or low frame rate crossing a wall.
	var steps: int = maxi(1,ceili(offset.length()/7))
	var step := offset/steps
	for i in range(steps):
		var next: Vector2 = unit.pos+Vector2(step.x,0)
		if not blocked(next,unit.radius):
			unit.pos=next
		next=unit.pos+Vector2(0,step.y)
		if not blocked(next,unit.radius):
			unit.pos=next

func _physics_process(dt: float) -> void:
	if mode != "play":
		return
	elapsed += dt
	toast_time -= dt
	dash_cd = maxf(0,dash_cd-dt)
	hero.inv = maxf(0,hero.inv-dt)
	hero.cast = maxf(0,hero.cast-dt)
	hero.hit = maxf(0,hero.hit-dt)
	var input := movement_input()
	var direction := unproject(input).normalized() if input.length()>.1 else Vector2.ZERO
	hero.moving = direction.length_squared()>.01
	if hero.moving:
		hero.face = direction
	if dash_time>0:
		move_unit(hero,dash_direction*930*minf(dt,dash_time))
		dash_time = maxf(0,dash_time-dt)
	else:
		move_unit(hero,direction*hero.speed*dt)
	camera.position = project(hero.pos)+Vector2(0,-65)
	hero_light.position = project(hero.pos)+Vector2(0,-35)
	if elapsed-last_hit>5:
		armor = minf(45,armor+7*dt)
	attack_cd -= dt
	if attack_cd<=0:
		swing()
		attack_cd=.55
	if not door_open and (kills>=12 or elapsed>=45):
		door_open=true
		message("THE BOSS DOOR IS OPEN  /  FOLLOW THE GOLD MARK")
		play_sound("metal-impact")
	if door_open and not boss and hero.pos.x>18*TILE and not stairs:
		boss = _unit("warden",Vector2(21.5,8.5)*TILE,1000)
		boss.attack=3
		enemies.append(boss)
		message("CRYPT WARDEN  /  LEAVE THE MARKED CIRCLE")
		play_sound("boss-roar",-3)
	spawn_cd -= dt
	if spawn_cd<=0 and not boss:
		_spawn_wave()
		spawn_cd=3.5
	for enemy: Dictionary in enemies.duplicate():
		if enemy.dead:
			enemy.death-=dt
			if enemy.death<=0:
				enemy.visual.queue_free()
				enemies.erase(enemy)
			continue
		enemy.hit=maxf(0,enemy.hit-dt)
		enemy.cast=maxf(0,enemy.cast-dt)
		enemy.stun=maxf(0,enemy.stun-dt)
		enemy.arrive=maxf(0,enemy.arrive-dt)
		if enemy.arrive>0 or enemy.stun>0:
			enemy.moving=false
			continue
		var toward: Vector2 = hero.pos-enemy.pos
		enemy.face=toward.normalized()
		enemy.moving=toward.length()>enemy.radius+hero.radius
		if enemy.moving:
			move_unit(enemy,enemy.face*enemy.speed*dt)
		enemy.attack-=dt
		if enemy.kind=="warden" and enemy.attack<=0 and not boss_mark:
			boss_mark={"pos":hero.pos,"radius":105.0,"time":1.2}
			enemy.attack=4.0
			play_sound("metal-impact",-10)
		if enemy.pos.distance_to(hero.pos)<enemy.radius+hero.radius+3 and hero.inv<=0 and (enemy.kind=="warden" or enemy.attack<=0):
			take_hit(22 if enemy.kind=="warden" else 9)
			if enemy.kind!="warden":
				enemy.attack=.85
			if mode!="play":
				return
	if boss_mark:
		boss_mark.time-=dt
		if boss_mark.time<=0:
			_add_effect("slam",boss_mark.pos,105)
			if hero.pos.distance_to(boss_mark.pos)<105+hero.radius:
				take_hit(30)
			boss_mark={}
			if mode!="play":
				return
	for effect: Dictionary in effects.duplicate():
		effect.life-=dt
		if effect.life<=0:
			effects.erase(effect)
	for f: Dictionary in floaters.duplicate():
		f.life-=dt
		if f.life<=0:
			f.label.queue_free()
			floaters.erase(f)
		else:
			f.label.position=project(f.pos)+Vector2(-20,-95-(1-f.life)*38)
			f.label.modulate.a=minf(1,f.life*2)
	if stairs and hero.pos.distance_to(stairs_pos)<45:
		mode="victory"
		play_sound("stairs-step")

func _spawn_wave() -> void:
	if enemies.size()>=14:
		return
	# Room-edge arrivals with a one-second visual warning; never inside walls.
	var room: Rect2i = Rect2i(2,6,6,6) if hero.pos.x<10*TILE else Rect2i(10,6,6,6)
	for attempt in range(18):
		var x: float = room.position.x+0.5 if rng.randf()<.5 else room.end.x-.5
		var y: float = rng.randf_range(room.position.y+.5,room.end.y-.5)
		var at := Vector2(x,y)*TILE
		if blocked(at,16) or at.distance_to(hero.pos)<230:
			continue
		var kind: String = ["skeleton","ghoul","runner"][rng.randi_range(0,2)]
		var enemy := _unit(kind,at,62 if kind!="runner" else 42)
		enemy.arrive=1
		enemies.append(enemy)
		return

func swing() -> void:
	var target: Dictionary = {}
	var nearest := INF
	for enemy: Dictionary in enemies:
		var d: float = enemy.pos.distance_to(hero.pos)
		if not enemy.dead and enemy.arrive<=0 and d<95+enemy.radius and d<nearest and not segment_blocked(hero.pos,enemy.pos):
			nearest=d
			target=enemy
	var facing: Vector2 = (target.pos-hero.pos).normalized() if target else hero.face
	if facing.length_squared()<.1:
		facing=Vector2.DOWN
	hero.face=facing
	hero.cast=.30
	_add_effect("slash",hero.pos,95,facing.angle())
	play_sound("blade-air",-8)
	for enemy: Dictionary in enemies.duplicate():
		if enemy.dead or enemy.arrive>0:
			continue
		var toward: Vector2 = enemy.pos-hero.pos
		if toward.length()<95+enemy.radius and toward.normalized().dot(facing)>=cos(deg_to_rad(75)) and not segment_blocked(hero.pos,enemy.pos):
			hit_enemy(enemy,58)

func hit_enemy(enemy: Dictionary,amount: float) -> void:
	if enemy.dead:
		return
	enemy.hp-=amount
	enemy.hit=.12
	ultimate=minf(100,ultimate+amount/58*1.8)
	var label := Label.new()
	label.text=str(int(amount))
	label.add_theme_font_size_override("font_size",20)
	label.add_theme_color_override("font_color",Color(1,.86,.68))
	label.add_theme_color_override("font_outline_color",Color(.06,.02,.01))
	label.add_theme_constant_override("outline_size",4)
	label.position=project(enemy.pos)+Vector2(-20,-95)
	add_child(label)
	floaters.append({"label":label,"pos":enemy.pos,"life":.7})
	if floaters.size()>32:
		floaters[0].label.queue_free()
		floaters.pop_front()
	play_sound("stone-impact",-8)
	if enemy.hp<=0:
		enemy.dead=true
		kills+=1
		ultimate=minf(100,ultimate+7)
		if enemy.kind=="warden":
			stairs=true
			boss_mark={}
			message("WARDEN DEFEATED  /  WALK ONTO THE GOLD STAIRS")
			play_sound("ember-blast",-4)

func take_hit(amount: float) -> void:
	if hero.inv>0 or mode!="play":
		return
	last_hit=elapsed
	hero.inv=.5
	hero.hit=.14
	var absorbed: float = minf(armor,amount*.7)
	armor-=absorbed
	hero.hp=maxf(0,hero.hp-(amount-absorbed))
	play_sound("metal-impact",-7)
	if hero.hp<=0:
		hero.dead=true
		mode="over"

func use_dash() -> bool:
	if mode!="play" or dash_cd>0:
		return false
	var input := movement_input()
	dash_direction=unproject(input).normalized() if input.length()>.1 else hero.face
	dash_time=.25
	dash_cd=4
	hero.inv=maxf(hero.inv,.25)
	play_sound("dash-air",-4)
	return true

func use_ultimate() -> bool:
	if mode!="play" or ultimate<100:
		return false
	ultimate=0
	hero.cast=.30
	_add_effect("slam",hero.pos,300)
	play_sound("ember-blast",-3)
	message("EARTHSPLITTER")
	for enemy: Dictionary in enemies.duplicate():
		if not enemy.dead and enemy.pos.distance_to(hero.pos)<300+enemy.radius and not segment_blocked(hero.pos,enemy.pos):
			enemy.stun=2
			hit_enemy(enemy,58*6)
	return true

func _add_effect(kind: String,at: Vector2,radius: float,angle: float=0) -> void:
	effects.append({"kind":kind,"pos":at,"radius":radius,"angle":angle,"life":.23 if kind=="slash" else .6,"total":.23 if kind=="slash" else .6})
	if effects.size()>20:
		effects.pop_front()

func message(value: String) -> void:
	toast=value
	toast_time=4

func _setup_audio() -> void:
	for name in ["blade-air","stone-impact","metal-impact","dash-air","ember-blast","boss-roar","pickup-gem","stairs-step"]:
		sounds[name]=load("res://assets/audio/"+name+".wav")
	for i in range(8):
		var player := AudioStreamPlayer.new()
		add_child(player)
		audio_players.append(player)
	var compressor := AudioEffectCompressor.new()
	compressor.threshold=-12
	compressor.ratio=4
	AudioServer.add_bus_effect(0,compressor)
	ambient=AudioStreamPlayer.new()
	var stream: AudioStreamWAV = load("res://assets/audio/ash-ambient.wav")
	stream.loop_mode=AudioStreamWAV.LOOP_FORWARD
	stream.loop_end=int(stream.get_length()*stream.mix_rate)
	ambient.stream=stream
	ambient.volume_db=-13
	add_child(ambient)
	ambient.play()

func play_sound(kind: String,volume: float=-6) -> void:
	if muted:
		return
	for player: AudioStreamPlayer in audio_players:
		if not player.playing:
			player.stream=sounds[kind]
			player.volume_db=volume
			player.pitch_scale=1.0
			player.play()
			return

func stop_audio() -> void:
	# Stop native WAV playback before closing/reloading the project.
	if is_instance_valid(ambient):
		ambient.stop()
		ambient.stream = null
	for player: AudioStreamPlayer in audio_players:
		if is_instance_valid(player):
			player.stop()
			player.stream = null

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		mode = "paused"
		stop_audio()
		await get_tree().create_timer(.15).timeout
		get_tree().quit()

func _exit_tree() -> void:
	stop_audio()

func movement_input() -> Vector2:
	return stick if stick_active else Input.get_vector("left","right","up","down")

func _add_skill_buttons(layer: CanvasLayer) -> void:
	var controls := Control.new()
	controls.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	controls.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(controls)
	dash_button = Button.new()
	ultimate_button = Button.new()
	for button: Button in [dash_button, ultimate_button]:
		button.custom_minimum_size = Vector2(100,72)
		button.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		button.offset_top = -96
		button.offset_bottom = -24
		button.focus_mode = Control.FOCUS_NONE
		controls.add_child(button)
	dash_button.offset_left = -248
	dash_button.offset_right = -140
	ultimate_button.offset_left = -128
	ultimate_button.offset_right = -20
	dash_button.pressed.connect(use_dash)
	ultimate_button.pressed.connect(use_ultimate)

func _process(_delta: float) -> void:
	if is_instance_valid(dash_button):
		dash_button.text = "DASH\nREADY" if dash_cd<=0 else "DASH\n%.1fs"%dash_cd
		ultimate_button.text = "EARTHSPLITTER\nREADY" if ultimate>=100 else "EARTHSPLITTER\n%d%%"%ultimate
		dash_button.disabled = mode!="play" or dash_cd>0
		ultimate_button.disabled = mode!="play" or ultimate<100

func _input(event: InputEvent) -> void:
	var at := Vector2.ZERO
	var pressed := false
	var released := false
	var id := -1
	if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		at=event.position
		pressed=event.pressed
		released=not event.pressed
	elif event is InputEventScreenTouch:
		id=event.index
		at=event.position
		pressed=event.pressed
		released=not event.pressed
	elif event is InputEventMouseMotion or event is InputEventScreenDrag:
		if stick_active and ((event is InputEventMouseMotion and stick_id==-1) or (event is InputEventScreenDrag and event.index==stick_id)):
			stick=(event.position-stick_origin).limit_length(55)/55
		return
	else:
		return
	if released and id==stick_id:
		stick_active=false
		stick=Vector2.ZERO
	elif pressed and not stick_active and mode=="play" and at.x<get_viewport_rect().size.x*.4 and at.y>160:
		stick_origin=at
		stick_id=id
		stick_active=true
		stick=Vector2.ZERO
