extends Node2D
## Native, visual-only rendering of the original gameplay snapshot.
## Exact original collection names and bridge aliases are accepted; no simulation here.
var snapshot: Dictionary = {}
var hero: Dictionary = {}
var camera: Dictionary = {}
var zoom: float = 1.0
var clock: float = 0.0
var detail: int = 16
var font: Font = ThemeDB.fallback_font

func set_snapshot(value: Dictionary) -> void:
	snapshot = value
	hero = value.get("hero", {}) if value.get("hero", {}) is Dictionary else {}
	camera = value.get("camera", {}) if value.get("camera", {}) is Dictionary else {}
	zoom = maxf(0.05, float(camera.get("zoom", 1.0)))
	clock = float(value.get("clock", 0))
	var quality = value.get("quality", {})
	detail = int(quality.get("maxAtmosphere", 16)) if quality is Dictionary else (32 if str(quality).to_lower() == "high" else 8 if str(quality).to_lower() == "low" else 16)
	z_index = 4000
	queue_redraw()

func collection(key: String, alias: String = "") -> Array:
	var items = snapshot.get(key, snapshot.get(alias, []))
	return items if items is Array else []

func world(x: float, y: float) -> Vector2:
	var dx: float = x - float(hero.get("x", 0))
	var dy: float = y - float(hero.get("y", 0))
	var size: Vector2 = get_viewport_rect().size
	var origin := Vector2(float(camera.get("w", size.x)) * 0.5, float(camera.get("focusY", float(camera.get("h", size.y)) * 0.58)))
	if bool(camera.get("isometric", true)):
		return origin + Vector2((dx - dy) * sqrt(0.5), (dx + dy) * sqrt(0.5) * float(camera.get("tilt", 0.55))) * zoom
	return origin + Vector2(dx, dy) * zoom

func point(item: Dictionary) -> Vector2:
	return world(float(item.get("x", 0)), float(item.get("y", 0)))

func tint(item: Dictionary, fallback: String = "#ffe5a0", alpha: float = 1.0) -> Color:
	var col := Color.from_string(str(item.get("color", fallback)), Color.from_string(fallback, Color.WHITE))
	col.a *= clampf(alpha, 0, 1)
	return col

func circle(item: Dictionary, radius: float, color: Color, width: float = 2.0, fill: float = 0.0, start: float = 0.0, end: float = TAU) -> void:
	var points := PackedVector2Array()
	var steps: int = 40 if detail >= 32 else 28 if detail >= 16 else 20
	for i in range(steps + 1):
		var a: float = lerpf(start, end, float(i) / steps)
		points.append(world(float(item.get("x", 0)) + cos(a) * radius, float(item.get("y", 0)) + sin(a) * radius))
	if fill > 0 and radius > 0:
		var polygon := points.duplicate()
		if end - start < TAU - 0.01:
			polygon.append(point(item))
		var soft := color
		soft.a *= fill
		draw_colored_polygon(polygon, soft)
	if width > 0:
		draw_polyline(points, color, maxf(1, width * zoom), true)

func line_between(a: Dictionary, b: Dictionary, color: Color, width: float = 2.0) -> void:
	draw_line(point(a), point(b), color, maxf(1, width * zoom), true)

func glow_at(position: Vector2, color: Color, radius: float) -> void:
	var soft := color
	soft.a *= 0.14
	draw_circle(position, radius * zoom * 1.8, soft)
	soft.a *= 1.7
	draw_circle(position, radius * zoom * 1.2, soft)
	draw_circle(position, radius * zoom * 0.6, color)
	draw_circle(position - Vector2.ONE * zoom, maxf(1.5, radius * zoom * 0.18), Color(1, 0.97, 0.86, color.a))

func telegraph(mark: Dictionary, fallback: String = "#ff8d6d") -> void:
	var radius: float = float(mark.get("r", 55))
	var total: float = maxf(0.01, float(mark.get("duration", mark.get("total", 1.15))))
	var progress: float = clampf(1.0 - float(mark.get("time", mark.get("timer", total))) / total, 0, 1)
	var color := tint(mark, fallback)
	circle(mark, radius, color, 3 + progress * 2, 0.16 + progress * 0.13)
	circle(mark, radius - 3, color, 4, 0.14, -PI * 0.5, -PI * 0.5 + TAU * maxf(0.001, progress))
	circle(mark, radius * progress, color, 1.5)
	var center := point(mark)
	draw_line(center - Vector2(6, 0), center + Vector2(6, 0), color, 2)
	draw_line(center - Vector2(0, 6), center + Vector2(0, 6), color, 2)
	for echo in mark.get("echoes", []):
		if echo is Dictionary:
			circle(echo, radius, color, 2, 0.12)

func projectile(item: Dictionary, hostile: bool = false, dagger: bool = false) -> void:
	var pos := point(item) - Vector2(0, 18 * zoom)
	var color := tint(item, "#ff777c" if hostile else "#ffce8a")
	var vx: float = float(item.get("vx", cos(float(item.get("angle", 0))) * 160))
	var vy: float = float(item.get("vy", sin(float(item.get("angle", 0))) * 160))
	var direction := (world(float(item.get("x", 0)) + vx, float(item.get("y", 0)) + vy) - point(item)).normalized()
	if bool(item.get("arrow", false)) or dagger:
		draw_line(pos - direction * 19 * zoom, pos + direction * 5 * zoom, color, 2 * zoom, true)
		var normal := direction.orthogonal()
		draw_colored_polygon(PackedVector2Array([pos + direction * 10 * zoom, pos - direction * 2 * zoom + normal * 4 * zoom, pos - direction * 2 * zoom - normal * 4 * zoom]), color.lightened(0.4))
	else:
		draw_line(pos - direction * 18 * zoom, pos, Color(color, 0.45), 3 * zoom, true)
		glow_at(pos, color, 8 if hostile else 6)
		if hostile:
			draw_arc(pos, 10 * zoom, 0, TAU, 20, color, 2 * zoom, true)

func _draw() -> void:
	if snapshot.is_empty() or hero.is_empty():
		return
	# Broad friendly ground effects first. Hostile warning outlines are drawn last.
	for pool in collection("pools"):
		if pool is Dictionary:
			var kind: String = str(pool.get("kind", "poison"))
			var color: String = "#a8e8ff" if kind == "frozen" else "#bf91eb" if kind == "rift" else "#ffa466" if kind in ["flame", "cinder"] else "#9be77a"
			circle(pool, float(pool.get("r", 30)), tint(pool, color), 2, 0.2)
	for beam in collection("beamEnds"):
		if beam is Dictionary:
			var color := Color("#ffe9a3")
			color.a = 0.14
			line_between(hero, beam, color, minf(60, float(snapshot.get("beamWidth", 14)) * 2))
			line_between(hero, beam, Color("#fff2ccbb"), 2)
			glow_at(point(beam), Color("#ffe9a3"), 7)
	for zone in collection("heroZones"):
		if zone is Dictionary:
			var radius: float = float(zone.get("r", 55))
			var cyclone: bool = zone.get("kind", "") == "cyclone"
			var color := tint(zone, "#a6e4d7" if cyclone else "#ffe5a1")
			circle(zone, radius, color, 2, 0.10)
			if cyclone:
				for i in range(3):
					var pos := point(zone) - Vector2(0, i * 12 * zoom)
					draw_arc(pos, radius * zoom * (0.8 - i * 0.15), clock * 3 + i, clock * 3 + i + 4, 20, Color(color, 0.6), 2, true)
			if zone.get("kind", "") == "pillar":
				draw_line(point(zone), point(zone) - Vector2(0, 90 * zoom), Color(color, 0.7), 12 * zoom)
	var traps: Array = collection("heroTraps")
	for trap in traps:
		if trap is Dictionary:
			var col := Color("#ffe783" if bool(hero.get("shockTrap", false)) else "#a6e9ff")
			circle(trap, float(trap.get("r", 32)), col, 2, 0.10)
			var pos := point(trap)
			draw_line(pos - Vector2(7, 4) * zoom, pos + Vector2(7, 4) * zoom, col, 2)
			draw_line(pos - Vector2(-7, 4) * zoom, pos + Vector2(-7, 4) * zoom, col, 2)
	for link in collection("heroTrapLinks"):
		if link is Dictionary:
			line_between({"x":link.get("x1",0),"y":link.get("y1",0)}, {"x":link.get("x2",0),"y":link.get("y2",0)}, Color("#9ce9ff88"), 6)
	for wall in collection("iceWalls"):
		if wall is Dictionary:
			var a := {"x": wall.get("x1", 0), "y": wall.get("y1", 0)}
			var b := {"x": wall.get("x2", 0), "y": wall.get("y2", 0)}
			line_between(a, b, Color("#acdcef"), 7)
			var pieces: int = 10 if detail >= 32 else 6 if detail >= 16 else 4
			for i in range(pieces + 1):
				var pos := point(a).lerp(point(b), float(i) / pieces)
				draw_colored_polygon(PackedVector2Array([pos + Vector2(-7, 0) * zoom, pos + Vector2(-4, -22) * zoom, pos + Vector2(0, -32) * zoom, pos + Vector2(6, -20) * zoom, pos + Vector2(8, 0) * zoom]), Color("#a5d4e5aa"))
	if float(hero.get("fortressUntil", 0)) > clock:
		circle({"x": hero.get("fortressX", 0), "y": hero.get("fortressY", 0)}, 190, Color("#bce9ff"), 3, 0.10)
	for ring in collection("rings"):
		if ring is Dictionary:
			circle(ring, float(ring.get("r", 10)), tint(ring, "#ffe5a0", minf(1, float(ring.get("life", 1)) * 2)), 4)
	for arc in collection("arcs"):
		if arc is Dictionary:
			var a := world(float(arc.get("x1", 0)), float(arc.get("y1", 0)))
			var b := world(float(arc.get("x2", 0)), float(arc.get("y2", 0)))
			var points := PackedVector2Array([a, (a + b) * 0.5 + Vector2(10, -9) * zoom, b])
			draw_polyline(points, Color("#c093ff66" if bool(arc.get("beam", false)) else "#8df8ff66"), 10 * zoom, true)
			draw_polyline(points, Color("#fff2ff"), 2 * zoom, true)
	for shot in collection("shots", "bolts"):
		if shot is Dictionary:
			projectile(shot)
	for dagger in collection("bloodDaggers"):
		if dagger is Dictionary:
			var item: Dictionary = dagger.duplicate()
			item["color"] = "#c7a5ef" if bool(dagger.get("shadow", false)) else "#a9df80"
			projectile(item, false, true)
	for name in ["bloodEffects", "bloodSlashes", "bloodWaves", "newBloodFx", "quakeMarks", "sigils"]:
		for effect in collection(name):
			if not effect is Dictionary or float(effect.get("delay", 0)) > 0:
				continue
			var radius: float = float(effect.get("r", 45))
			var angle: float = float(effect.get("angle", 0))
			var kind: String = str(effect.get("kind", "slash" if name in ["bloodSlashes", "newBloodFx"] else "wave" if name == "bloodWaves" else "ring"))
			var color := tint(effect, "#c3f0ff" if name == "newBloodFx" else "#ef8090", minf(1, float(effect.get("life", 1)) * 5))
			if kind == "slash":
				circle(effect, radius, color, 5, 0.14, angle - PI * 0.4167, angle + PI * 0.4167)
			elif kind == "wave":
				var moving: Dictionary = effect.duplicate()
				var distance: float = radius * (1 - float(effect.get("life", 0.45)) / 0.45)
				moving["x"] = float(effect.get("x", 0)) + cos(angle) * distance
				moving["y"] = float(effect.get("y", 0)) + sin(angle) * distance
				circle(moving, 32, color, 4, 0, angle - PI / 2, angle + PI / 2)
			elif kind == "spikes":
				for i in range(7):
					var pos := world(float(effect.get("x", 0)) + cos(i * 2.4) * radius * 0.65, float(effect.get("y", 0)) + sin(i * 2.4) * radius * 0.45)
					draw_colored_polygon(PackedVector2Array([pos + Vector2(-7, 8) * zoom, pos + Vector2(0, -23) * zoom, pos + Vector2(7, 8) * zoom]), color)
			else:
				circle(effect, radius, color, 3, 0.1)
	for meteor in collection("meteors"):
		if meteor is Dictionary:
			circle(meteor, float(meteor.get("r", 45)), Color("#ffad66"), 3, 0.16)
			var pos := point(meteor) - Vector2(0, (float(meteor.get("time", 0)) * 180 + 12) * zoom)
			draw_line(pos, pos + Vector2(18, -65) * zoom, Color("#ff8c4280"), 12 * zoom, true)
			glow_at(pos, Color("#ffdba1"), 9)
	for fx in collection("rpgFx"):
		if fx is Dictionary:
			var progress: float = clampf(1 - float(fx.get("life", 0)) / maxf(0.01, float(fx.get("total", 1))), 0, 1)
			var colors: Dictionary = {"gravecaller":"#b895ff", "ranger":"#a4e6ff", "ember":"#ffab65", "bloodknight":"#c99b61", "sunwarden":"#fff0b0", "rogue":"#b4ee82", "frostwarden":"#a6e9ff"}
			var radius: float = float(fx.get("r", 40)) * (0.35 + 0.65 * progress)
			var color := tint(fx, str(colors.get(fx.get("kind", ""), "#ffe2a8")), (1 - progress) * 0.8)
			circle(fx, radius, color, 3)
			if fx.get("kind", "") != "impact":
				circle(fx, radius * 0.82, color, 2)
				for i in range(8 if detail < 16 else 12):
					var angle: float = i * TAU / (8 if detail < 16 else 12)
					line_between({"x":float(fx.get("x",0))+cos(angle)*radius*.82,"y":float(fx.get("y",0))+sin(angle)*radius*.82}, {"x":float(fx.get("x",0))+cos(angle)*radius,"y":float(fx.get("y",0))+sin(angle)*radius}, color, 2)
				var kind: String = str(fx.get("kind", ""))
				if kind == "bloodknight":
					for i in range(6 if detail < 16 else 9):
						var crack := PackedVector2Array([point(fx)])
						for k in range(1, 6):
							var angle: float = i * TAU / 9 + sin(k * 12 + i) * 0.085
							crack.append(world(float(fx.get("x", 0)) + cos(angle) * radius * k / 5, float(fx.get("y", 0)) + sin(angle) * radius * k / 5))
						draw_polyline(crack, color, 3 * zoom, true)
				if kind == "sunwarden":
					for i in range(3):
						var angle: float = i * TAU / 3 + progress * 0.4
						var pos := world(float(fx.get("x", 0)) + cos(angle) * radius * 0.6, float(fx.get("y", 0)) + sin(angle) * radius * 0.6)
						draw_line(pos, pos - Vector2(0, 120 * (1 - progress) * zoom), color.lightened(0.3), 5 * zoom, true)
	_draw_orbits()
	# Never cap damaging hazards or telegraphs with the cosmetic particle budget.
	for name in ["zoneHazards", "adventureHazards", "adventureBurns"]:
		for hazard in collection(name):
			if hazard is Dictionary:
				var kind: String = str(hazard.get("kind", "lava"))
				var fallback: String = "#baefff" if kind == "ice" else "#b8ef83" if kind == "spore" else "#ff9b58"
				circle(hazard, float(hazard.get("r", 40)), tint(hazard, fallback), 3, 0.22)
				if kind == "spore":
					glow_at(point(hazard), Color("#d5fa9b"), 9)
				elif kind == "ice":
					var pos := point(hazard)
					for i in range(3):
						var direction := Vector2.from_angle(i * PI / 3) * 22 * zoom
						draw_line(pos - direction, pos + direction, Color("#e4fbff"), 2, true)
				if hazard.get("state", "") == "warning" or hazard.has("time"):
					var mark: Dictionary = hazard.duplicate()
					mark["total"] = 1.0 if kind == "lava" else 0.55
					telegraph(mark, fallback)
	for mark in collection("deepMarks"):
		if mark is Dictionary:
			telegraph(mark)
	for enemy in collection("enemies"):
		if enemy is Dictionary:
			if enemy.get("slam") is Dictionary:
				telegraph(enemy["slam"], "#94f3f0" if enemy.get("variant", "") == "oracle" else "#ff9b75")
			if enemy.get("deepMark") is Dictionary:
				telegraph(enemy["deepMark"])
	var event = snapshot.get("dungeonEvent", {})
	if event is Dictionary and event.get("mark") is Dictionary:
		telegraph(event["mark"], "#ff8e94")
	for hazard in collection("hazards", "enemyBolts"):
		if hazard is Dictionary:
			projectile(hazard, true)
	_draw_navigation()
	for floater in collection("floaters"):
		if floater is Dictionary:
			var size: int = maxi(12, int(15 * float(floater.get("scale", 1))))
			var label: String = str(floater.get("text", ""))
			var pos := point(floater) - Vector2(font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x * 0.5, 20 * zoom)
			draw_string_outline(font, pos, label, HORIZONTAL_ALIGNMENT_LEFT, -1, size, 3, Color("#141016"))
			draw_string(font, pos, label, HORIZONTAL_ALIGNMENT_LEFT, -1, size, tint(floater, "#ffffff", minf(1, float(floater.get("life", 1)) * 2)))

func _draw_orbits() -> void:
	if int(hero.get("blightRank", 0)) > 0:
		circle(hero, 58 + int(hero.get("blightRank", 0)) * 13, Color("#65c865"), 1, 0.12)
	for name in ["heroSpirits", "dashGhosts"]:
		for item in collection(name):
			if item is Dictionary:
				glow_at(point(item) - Vector2(0, 25 * zoom), tint(item, "#bb8dff", 0.4 if name == "dashGhosts" else 1.0), 8 if name == "heroSpirits" else 17)
	var wisps: int = int(hero.get("spiritWisps", 0))
	var skulls: int = 1 + int(hero.get("orbitRank", 0)) if int(hero.get("orbitRank", 0)) > 0 else 0
	for i in range(wisps + skulls):
		var count: int = wisps if i < wisps else skulls
		var a: float = clock * (1.8 if i < wisps else 2.7) + i * TAU / maxi(1, count)
		glow_at(world(float(hero.get("x", 0)) + cos(a) * (75 if i < wisps else 48), float(hero.get("y", 0)) + sin(a) * (75 if i < wisps else 48)) - Vector2(0, 12 * zoom), Color("#c89cff"), 7)
	if int(hero.get("blades", 0)) > 0:
		circle(hero, 19 + int(hero.get("blades", 0)) * 3, Color("#b985ff99"), 2)
	if hero.get("decoy") is Dictionary and float(hero["decoy"].get("until", 0)) > clock:
		glow_at(point(hero["decoy"]) - Vector2(0, 28 * zoom), Color("#c7a5ef88"), 20)

func _draw_navigation() -> void:
	var map = snapshot.get("dungeon")
	if map is Dictionary:
		var secret = map.get("secret")
		if secret is Dictionary and not bool(secret.get("revealed", false)):
			var mouth: Dictionary = secret.get("mouth", {})
			var p := point(mouth)
			draw_polyline(PackedVector2Array([p+Vector2(5,-32),p+Vector2(-8,-7),p+Vector2(9,7),p+Vector2(-4,33)]), Color("a68a6590"), 3, true)
		var shop = map.get("shop")
		if shop is Dictionary:
			for pad in shop.get("pads", []):
				circle(pad, 28, Color("d1a66c"), 3)
				if str(shop.get("active", "")) == str(pad.get("kind", "")):
					circle(pad, 32, Color("fff3b3"), 3, 0, -PI/2, -PI/2+TAU*float(shop.get("hold",0))/1.25)
				var label := "SOLD" if bool(pad.get("used",false)) else str(pad.get("kind", "shop")).to_upper()+" · "+str(pad.get("cost",0))+"g"
				var p := point(pad)
				draw_string(font, p+Vector2(-font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,11).x/2,-32), label,HORIZONTAL_ALIGNMENT_LEFT,-1,11,Color("ffda8c"))
				draw_string(font,p+Vector2(-42,-18),"Stand still to buy",HORIZONTAL_ALIGNMENT_LEFT,-1,10,Color("ffda8c"))
		if float(map.get("title",0)) > 0 and str(snapshot.get("mode","")) == "play":
			var width := float(camera.get("w",1280))
			var y := float(camera.get("h",720))*0.36
			var label := "FLOOR "+str(map.get("floor",1))+" · "+str(map.get("name","DUNGEON"))
			draw_rect(Rect2(0,y,width,76),Color("080b13cf"))
			draw_string(font, Vector2((width-font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,17).x)/2,y+43),label,HORIZONTAL_ALIGNMENT_LEFT,-1,17,Color("ffdc9d"))
	var count := 0
	for group in collection("arrivals"):
		var p := point(group)
		var size := Vector2(float(camera.get("w",1280)),float(camera.get("h",720)))
		if Rect2(Vector2(28,90),size-Vector2(56,200)).has_point(p):
			circle(group, 24+8*(1-float(group.get("remaining",1))),Color("ffcb80"),2,0.1)
		elif count<3:
			count += 1
			var center := Vector2(size.x/2,float(camera.get("focusY",size.y/2)))
			var delta := p-center
			var ratio := minf((size.x/2-18)/maxf(1,absf(delta.x)), (center.y-90 if delta.y<0 else size.y-110-center.y)/maxf(1,absf(delta.y)))
			var edge := center+delta*ratio
			draw_circle(edge,12,Color("171013d9"))
			draw_arc(edge,12,0,TAU,20,Color("ffcb80"),1.5,true)
			var direction := delta.normalized()
			var side := Vector2(-direction.y,direction.x)
			draw_colored_polygon(PackedVector2Array([edge+direction*7,edge-direction*4+side*5,edge-direction,edge-direction*4-side*5]),Color("ffcb80"))
