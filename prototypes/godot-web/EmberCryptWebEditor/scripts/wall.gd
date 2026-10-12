extends Node2D
var game: Node2D
var a := Vector2.ZERO
var b := Vector2.ZERO
var center_world := Vector2.ZERO
var tall := 40.0
var gate := false

func _process(_delta: float) -> void:
	if gate:
		visible = not game.door_open
	var hero_screen: Vector2 = game.project(game.hero.pos)
	var fade := position.distance_to(hero_screen)<115 and position.y>hero_screen.y-12
	modulate.a = .28 if fade else 1.0
	queue_redraw()

func _draw() -> void:
	var roof := Vector2(0,-tall)
	var face := PackedVector2Array([a,b,b+roof,a+roof])
	draw_colored_polygon(face,Color(.18,.24,.29) if not gate else Color(.28,.18,.10))
	draw_polyline(PackedVector2Array([a,b,b+roof,a+roof,a]),Color(.06,.06,.055),2,true)
	draw_line(a+roof,b+roof,Color(.48,.68,.79),3,true)
	for i in range(1,4):
		draw_line(a+roof*float(i)/4,b+roof*float(i)/4,Color(.09,.085,.072),1.3,true)
	for i in range(1,4):
		var x := a.lerp(b,float(i)/4)
		draw_line(x,x+roof,Color(.085,.08,.07),1.0,true)
	if gate:
		for i in range(8):
			var x := a.lerp(b,float(i)/7)
			draw_line(x,x+roof,Color(.68,.48,.23),3,true)
