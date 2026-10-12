extends Node2D
func _ready() -> void:
	var title := Label.new()
	title.text="IMPORT WORKED - EMBER CRYPT\nGodot Web Editor test\nMove the hero with WASD or arrow keys."
	title.position=Vector2(200,70)
	title.add_theme_font_size_override("font_size",24)
	add_child(title)
	print("EMBER_IMPORT_TEST_READY")
func _process(delta: float) -> void:
	var v := Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
	$Hero.position=($Hero.position+v.limit_length(1)*200*delta).clamp(Vector2(80,170),Vector2(880,450))
