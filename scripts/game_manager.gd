extends Node
class_name GameManager

signal simulation_started
signal simulation_finished(winner_id: String, total_damage: Dictionary)

@export var simulation_duration: float = 32.0
@export var countdown_duration: float = 3.0
@export var random_tilt_degrees: float = 2.0
@export var kick_impulse_min: float = 18.0
@export var kick_impulse_max: float = 22.0

var elapsed_time: float = 0.0
var running: bool = false
var total_damage: Dictionary = {"A": 0.0, "B": 0.0}

@onready var damage_system: DamageSystem = $DamageSystem
@onready var replay_system: ReplaySystem = $ReplaySystem


func _ready() -> void:
	damage_system.damage_event.connect(_on_damage_event)


func start_match(character_a_root: Node3D, character_b_root: Node3D) -> void:
	_reset_state()
	_apply_fair_start_variation(character_a_root)
	_apply_fair_start_variation(character_b_root)
	await _run_countdown()
	_apply_kick(character_a_root)
	_apply_kick(character_b_root)
	running = true
	emit_signal("simulation_started")


func _physics_process(delta: float) -> void:
	if not running:
		return

	elapsed_time += delta
	if elapsed_time >= simulation_duration:
		finish_match()


func finish_match() -> void:
	running = false
	var winner := "A" if total_damage["A"] >= total_damage["B"] else "B"
	emit_signal("simulation_finished", winner, total_damage.duplicate(true))


func build_replay_data(winner_id: String) -> Dictionary:
	var key_event := replay_system.highest_damage_event_for_character(winner_id)
	return replay_system.replay_window_for_event(key_event)


func _run_countdown() -> void:
	for _count in range(int(countdown_duration), 0, -1):
		await get_tree().create_timer(1.0).timeout


func _apply_fair_start_variation(character_root: Node3D) -> void:
	character_root.rotation_degrees.z += randf_range(-random_tilt_degrees, random_tilt_degrees)


func _apply_kick(character_root: Node3D) -> void:
	for child in character_root.get_children():
		if child is RigidBody3D:
			var impulse := Vector3(0.0, -randf_range(kick_impulse_min, kick_impulse_max), 0.0)
			child.apply_central_impulse(impulse)


func _on_damage_event(event_data: Dictionary) -> void:
	replay_system.record_event(event_data)
	var id := event_data.get("character_id", "A")
	var damage := float(event_data.get("damage", 0.0))
	total_damage[id] = total_damage.get(id, 0.0) + damage


func _reset_state() -> void:
	elapsed_time = 0.0
	running = false
	total_damage = {"A": 0.0, "B": 0.0}
	damage_system.reset_all()
	replay_system.clear()
