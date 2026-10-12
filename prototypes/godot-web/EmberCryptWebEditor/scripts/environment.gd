extends Node2D
## Ground plane uses the same Cartesian map as collisions; only drawing is angled.
var game: Node2D
var floor_texture: Texture2D = preload("res://assets/environment/frost-floor.webp")

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	for cell: Vector2i in game.cells:
		var world: Vector2 = Vector2(cell) * game.TILE
		var p := PackedVector2Array([game.project(world),game.project(world+Vector2(game.TILE,0)),game.project(world+Vector2(game.TILE,game.TILE)),game.project(world+Vector2(0,game.TILE))])
		var v: float = 0.58 + float(posmod(cell.x*7+cell.y*11,5))*0.015
		draw_polygon(p,PackedColorArray([Color(v*.88,v*.98,v*1.10)]),PackedVector2Array([Vector2(0,0),Vector2(1,0),Vector2(1,1),Vector2(0,1)]),floor_texture)
		draw_polyline(PackedVector2Array([p[0],p[1],p[2],p[3],p[0]]),Color(0.04,0.045,0.04,0.65),1.0,true)
		for edge: Vector2i in [Vector2i(1,0),Vector2i(0,1)]:
			if not game.cells.has(cell+edge):
				var a: Vector2 = p[1] if edge.x else p[3]
				var b: Vector2 = p[2]
				var drop := Vector2(0,22)
				draw_colored_polygon(PackedVector2Array([a,b,b+drop,a+drop]),Color(0.10,0.085,0.069))
				draw_line(a+drop,b+drop,Color(.25,.54,.76,.8),2,true)
	# Lower icy seams are decorative, outside the playable stone.
	for seam: Dictionary in game.lava:
		var center: Vector2 = game.project(seam.pos)+Vector2(0,25)
		var pulse: float = 0.75+sin(game.elapsed*1.4+seam.phase)*0.15
		draw_set_transform(center,0,Vector2(1,0.42))
		draw_circle(Vector2.ZERO,37,Color(.07,.18,.26,.65))
		draw_arc(Vector2.ZERO,24,0.2,4.4,18,Color(.35,.75,1,pulse),3,true)
		draw_set_transform(Vector2.ZERO)
	for effect: Dictionary in game.effects:
		var fade: float = effect.life/effect.total
		if effect.kind == "slash":
			var points := PackedVector2Array()
			for i in range(19):
				var angle: float = effect.angle-deg_to_rad(75)+deg_to_rad(150)*float(i)/18.0
				points.append(game.project(effect.pos+Vector2.from_angle(angle)*effect.radius))
			draw_polyline(points,Color(0.85,0.035,0.10,fade),12*fade+2,true)
			draw_polyline(points,Color(1.0,0.28,0.26,fade),2,true)
		elif effect.kind == "slam":
			var center: Vector2 = game.project(effect.pos)
			draw_set_transform(center,0,Vector2(1,0.5))
			draw_arc(Vector2.ZERO,effect.radius*(1.0-fade),0,TAU,64,Color(1,0.61,0.25,fade),8*fade+1,true)
			draw_set_transform(Vector2.ZERO)
	if game.boss_mark:
		var m: Dictionary = game.boss_mark
		var circle := PackedVector2Array()
		for i in range(49):
			circle.append(game.project(m.pos+Vector2.from_angle(TAU*float(i)/48)*m.radius))
		draw_colored_polygon(circle,Color(0.95,0.10,0.06,0.20))
		draw_polyline(circle,Color(1,0.40,0.23),3,true)
	if game.stairs:
		var p: Vector2 = game.project(game.stairs_pos)
		draw_set_transform(p,0,Vector2(1,0.5))
		for i in range(4):
			draw_rect(Rect2(-28+i*3,-22+i*12,56-i*6,8),Color(0.67,0.74,0.66))
		draw_arc(Vector2.ZERO,47,0,TAU,40,Color(1,0.78,0.31,0.7+sin(game.elapsed*3)*0.2),3,true)
		draw_set_transform(Vector2.ZERO)
	# Ambient snow: fixed count, independent of simulation randomness.
	for i in range(28):
		var world := Vector2(190+fmod(i*193.0,1730.0),220+fmod(i*83.0,870.0))
		var p: Vector2 = game.project(world)+Vector2(sin(game.elapsed*.6+i)*15,-fmod(game.elapsed*12+i*7,80))
		draw_circle(p,1.0 if i%3 else 1.6,Color(.68,.86,1,.24+sin(game.elapsed+i)*.10))
