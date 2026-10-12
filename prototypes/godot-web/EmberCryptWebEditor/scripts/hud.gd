extends Node2D
var game: Node2D
var font: Font = ThemeDB.fallback_font
var gold := Color(.94,.77,.48)

func _process(_delta: float) -> void:
	queue_redraw()

func text(at: Vector2,value: String,size: int=16,color: Color=Color(.86,.84,.78)) -> void:
	draw_string(font,at,value,HORIZONTAL_ALIGNMENT_LEFT,-1,size,color)

func panel(rect: Rect2) -> void:
	draw_style_box(_panel_style(),rect)

func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color=Color(.038,.044,.050,.94)
	style.border_color=Color(.44,.32,.18,.9)
	style.set_border_width_all(1)
	style.set_corner_radius_all(7)
	return style

func _draw() -> void:
	var view := get_viewport_rect().size
	panel(Rect2(24,20,330,98))
	text(Vector2(42,47),"EMBER CRYPT",23,gold)
	text(Vector2(42,70),"FROST VAULT  /  GODOT PREVIEW",11,Color(.62,.62,.60))
	draw_rect(Rect2(42,83,294,10),Color(.16,.08,.09))
	draw_rect(Rect2(42,83,294*clampf(game.hero.hp/game.hero.max_hp,0,1),10),Color(.76,.15,.21))
	text(Vector2(42,109),"HP %d / 140    ARMOR %d / 45"%[ceil(game.hero.hp),ceil(game.armor)],12)
	panel(Rect2(374,20,310,72))
	text(Vector2(392,46),"BLOODKNIGHT  /  BLOOD + EARTH",13,gold)
	text(Vector2(392,71),"%d KILLS     %02d:%02d     %s"%[game.kills,int(game.elapsed)/60,int(game.elapsed)%60,"BOSS DOOR OPEN" if game.door_open else "DOOR: 12 KILLS / 45s"],11)
	panel(Rect2(view.x-184,20,160,146))
	text(Vector2(view.x-170,44),"THE FROST WALK",12,gold)
	for cell: Vector2i in game.cells:
		draw_rect(Rect2(Vector2(view.x-172+cell.x*5,50+cell.y*5),Vector2(4.5,4.5)),Color(.30,.31,.28))
	var p: Vector2 = game.hero.pos/game.TILE
	draw_circle(Vector2(view.x-172+p.x*5,50+p.y*5),3,Color(1,.92,.58))
	draw_rect(Rect2(view.x-172+17*5,50+8*5,5,10),gold if game.door_open else Color(.7,.22,.18))
	if game.stairs:
		var s: Vector2 = game.stairs_pos/game.TILE
		draw_circle(Vector2(view.x-172+s.x*5,50+s.y*5),3,Color(.9,1,.9))
	panel(Rect2(24,view.y-72,660,48))
	text(Vector2(42,view.y-43),"WASD / ARROWS  MOVE    SPACE  DASH    E  EARTHSPLITTER    ESC  PAUSE",12)
	text(Vector2(42,view.y-27),"Automatic blade attacks  |  M  sound  |  F11  fullscreen  |  R  restart",10,Color(.6,.59,.56))
	if game.stick_active:
		draw_circle(game.stick_origin,56,Color(.2,.3,.4,.38))
		draw_arc(game.stick_origin,56,0,TAU,40,gold,2,true)
		draw_circle(game.stick_origin+game.stick*40,20,Color(.7,.8,.9,.55))
	if game.toast_time>0:
		var message: String = game.toast
		var width: float = font.get_string_size(message,HORIZONTAL_ALIGNMENT_LEFT,-1,19).x+48
		panel(Rect2((view.x-width)/2,136,width,42))
		text(Vector2((view.x-width)/2+24,163),message,19,gold)
	if game.boss and not game.boss.dead:
		var width := 420.0
		panel(Rect2((view.x-width)/2,view.y-128,width,32))
		text(Vector2((view.x-width)/2+12,view.y-108),"CRYPT WARDEN",12,gold)
		draw_rect(Rect2(view.x/2-35,view.y-117,225,7),Color(.19,.09,.10))
		draw_rect(Rect2(view.x/2-35,view.y-117,225*maxf(0,game.boss.hp/game.boss.max_hp),7),Color(.75,.16,.21))
	if game.mode != "play":
		draw_rect(Rect2(Vector2.ZERO,view),Color(.015,.018,.022,.82))
		var heading: String = {"paused":"THE CRYPT WAITS","over":"YOU FELL IN THE FROST","victory":"THE FROST WALK IS CLEARED"}.get(game.mode,"EMBER CRYPT")
		var width: float = font.get_string_size(heading,HORIZONTAL_ALIGNMENT_LEFT,-1,38).x
		text(Vector2((view.x-width)/2,view.y/2-20),heading,38,gold)
		text(Vector2(view.x/2-230,view.y/2+28),"ESC to resume" if game.mode=="paused" else "R to play again  /  Close the Game tab to exit",20)
		text(Vector2(view.x/2-230,view.y/2+64),"A visual prototype. Your browser game and saves are untouched.",14,Color(.67,.68,.67))
