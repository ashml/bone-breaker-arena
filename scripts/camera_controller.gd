extends Camera3D
class_name CameraController

@export var target_path: NodePath
@export var y_lerp_speed: float = 4.0
@export var x_min: float = -4.0
@export var x_max: float = 4.0
@export var impact_shake_decay: float = 5.0

var _shake_strength: float = 0.0
var _base_position: Vector3


func _ready() -> void:
	_base_position = global_position


func _physics_process(delta: float) -> void:
	var target := get_node_or_null(target_path)
	if target is Node3D:
		var target_pos := global_position
		target_pos.y = lerp(global_position.y, target.global_position.y, delta * y_lerp_speed)
		target_pos.x = clamp(target.global_position.x, x_min, x_max)
		global_position = target_pos

	_apply_shake(delta)


func trigger_impact_shake(intensity: float) -> void:
	_shake_strength = max(_shake_strength, intensity)


func _apply_shake(delta: float) -> void:
	if _shake_strength <= 0.001:
		return

	var shake_offset := Vector3(
		randf_range(-_shake_strength, _shake_strength),
		randf_range(-_shake_strength, _shake_strength),
		0.0
	)
	global_position += shake_offset
	_shake_strength = lerp(_shake_strength, 0.0, delta * impact_shake_decay)
