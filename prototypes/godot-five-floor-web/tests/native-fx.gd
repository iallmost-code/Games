extends SceneTree

func _initialize() -> void:
	var module = load("res://scripts/fx_view.gd")
	if module == null:
		push_error("FX module failed to parse")
		quit(1)
		return
	var view = module.new()
	root.add_child(view)
	view.set_snapshot({})
	view.set_snapshot({"hero":{"x":0,"y":0,"class":"sunwarden","blightRank":1,"orbitRank":1,"spiritWisps":2,"blades":2,"fortressUntil":10},"camera":{"w":960,"h":540,"zoom":1,"tilt":0.55,"isometric":true,"focusY":310},"clock":1,"quality":{"maxAtmosphere":8},"enemies":[{"slam":{"x":90,"y":20,"r":55,"time":0.3,"duration":1.15},"deepMark":{"x":-90,"y":20,"r":35,"time":0.3,"total":1,"echoes":[{"x":-130,"y":20}]}}],"shots":[{"x":30,"y":10,"vx":120,"vy":40},{"x":40,"y":10,"vx":120,"vy":40,"arrow":true}],"hazards":[{"x":-30,"y":-10,"vx":-120,"vy":40,"color":"#ff8877"}],"beamEnds":[{"x":170,"y":40}],"beamWidth":14,"pools":[{"x":0,"y":90,"r":30,"kind":"frozen"}],"rings":[{"x":0,"y":0,"r":45,"life":0.4}],"arcs":[{"x1":0,"y1":0,"x2":100,"y2":-40}],"heroZones":[{"x":120,"y":-80,"r":50,"kind":"cyclone"},{"x":130,"y":-30,"r":28,"kind":"pillar"}],"heroTraps":[{"x":80,"y":100,"r":25}],"iceWalls":[{"x1":-100,"y1":-90,"x2":100,"y2":-90}],"bloodEffects":[{"x":0,"y":0,"r":70,"angle":1,"life":0.4,"kind":"slash"},{"x":0,"y":0,"r":70,"angle":1,"life":0.4,"kind":"wave"},{"x":0,"y":0,"r":70,"life":0.4,"kind":"spikes"}],"meteors":[{"x":180,"y":-110,"r":45,"time":0.5}],"rpgFx":[{"kind":"sunwarden","x":0,"y":0,"r":100,"life":0.5,"total":1}],"floaters":[{"x":50,"y":10,"text":"105!","life":0.5}],"zoneHazards":[{"kind":"lava","state":"warning","timer":0.5,"x":-140,"y":-80,"r":40}],"heroSpirits":[{"x":0,"y":70}],"dashGhosts":[{"x":0,"y":-30}]})
	await process_frame
	await process_frame
	for kind in ["gravecaller", "ranger", "ember", "bloodknight", "sunwarden", "rogue", "frostwarden"]:
		for budget in [8, 16, 32]:
			var state: Dictionary = view.snapshot.duplicate(true)
			state["hero"]["class"] = kind
			state["quality"]["maxAtmosphere"] = budget
			state["camera"]["isometric"] = budget != 16
			state["rpgFx"][0]["kind"] = kind
			view.set_snapshot(state)
			await process_frame
	print("Native FX snapshot paint completed: seven heroes, three quality levels, classic/isometric")
	quit(0)
