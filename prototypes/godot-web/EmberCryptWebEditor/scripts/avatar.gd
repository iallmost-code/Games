extends Node2D
## Visual avatar only. Cartesian position and hitboxes belong to preview.gd.
var game: Node2D
var unit: Dictionary
var sprite: Sprite2D
var animated: AnimatedSprite2D
var base_scale := Vector2.ONE

func _ready() -> void:
	if unit.kind == "hero":
		animated = AnimatedSprite2D.new()
		animated.sprite_frames = load("res://assets/hero/bloodknight.tres")
		animated.centered = false
		animated.position = Vector2(-112, -188) * 0.66
		animated.scale = Vector2.ONE * 0.66
		animated.light_mask = 0
		add_child(animated)
		animated.play("front")
	else:
		sprite = Sprite2D.new()
		sprite.texture = load("res://assets/enemies/" + unit.kind + ".webp")
		sprite.centered = false
		var height: float = 160.0 if unit.kind == "warden" else 83.0
		base_scale = Vector2.ONE * height / sprite.texture.get_height()
		sprite.scale = base_scale
		sprite.position = Vector2(-sprite.texture.get_width() * base_scale.x / 2.0, -height)
		add_child(sprite)

func _process(_delta: float) -> void:
	position = game.project(unit.pos)
	if unit.kind == "hero":
		var direction: Vector2 = game.project(unit.face)
		var anim := "front"
		if unit.dead:
			anim = "death"
		elif unit.cast > 0:
			anim = "attack"
		elif unit.hit > 0:
			anim = "hit"
		elif abs(direction.x) > abs(direction.y):
			anim = "side"
		elif direction.y < 0:
			anim = "back"
		if animated.animation != anim:
			animated.play(anim)
		animated.speed_scale = 1.0 if unit.moving or unit.cast > 0 or unit.hit > 0 or unit.dead else 0.0
		if not unit.moving and unit.cast <= 0 and unit.hit <= 0 and not unit.dead:
			animated.frame = 0
		animated.flip_h = anim == "side" and direction.x < 0
		animated.modulate = Color(1.4, 0.75, 0.75) if unit.hit > 0 else Color.WHITE
	else:
		var face: Vector2 = game.project(unit.face)
		sprite.flip_h = face.x < 0
		var bob: float = sin(game.elapsed * 8.0 + unit.phase) * 1.5 if unit.moving else 0.0
		sprite.position.y = (-160.0 if unit.kind == "warden" else -83.0) + bob
		sprite.scale = base_scale * Vector2(1.1, 0.9) if unit.hit > 0 else base_scale
		sprite.modulate = Color(1.9, 0.9, 0.8) if unit.hit > 0 else Color(1.2, 1.16, 1.12)
	if unit.arrive > 0:
		modulate.a = clampf(1.0 - unit.arrive, 0.15, 1.0)
	elif unit.dead:
		modulate.a = clampf(unit.death / 0.5, 0.0, 1.0)
	else:
		modulate.a = 1.0
	queue_redraw()

func _draw() -> void:
	draw_set_transform(Vector2(0, 2), 0, Vector2(1, 0.38))
	draw_circle(Vector2.ZERO, 27 if unit.kind == "hero" else 35 if unit.kind == "warden" else 20, Color(0,0,0,0.5))
	draw_set_transform(Vector2.ZERO)
	if unit.kind == "hero":
		draw_set_transform(Vector2(0, 1), 0, Vector2(1, 0.48))
		draw_arc(Vector2.ZERO, 28, 0, TAU, 48, Color(1.0,0.62,0.27,0.32), 7, true)
		draw_arc(Vector2.ZERO, 28, 0, TAU, 48, Color(1.0,0.81,0.42,0.95), 2, true)
		draw_set_transform(Vector2.ZERO)
	if unit.arrive > 0:
		draw_arc(Vector2.ZERO, 24, 0, TAU, 24, Color(1,0.25,0.15), 2, true)
	if unit.kind != "hero" and unit.hp < unit.max_hp and not unit.dead:
		var y: float = -175.0 if unit.kind == "warden" else -94.0
		draw_rect(Rect2(-23,y,46,4), Color(0.06,0.04,0.04,0.95))
		draw_rect(Rect2(-23,y,46 * maxf(0,unit.hp/unit.max_hp),4), Color(1,0.32,0.22))
