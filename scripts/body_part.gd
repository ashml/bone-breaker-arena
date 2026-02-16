extends RigidBody3D
class_name BodyPart

signal damage_applied(part: BodyPart, amount: float, total: float)
signal part_broken(part: BodyPart)

@export var part_name: String = "unnamed"
@export var damage_multiplier: float = 1.0
@export var max_damage: float = 100.0

var current_damage: float = 0.0
var is_broken: bool = false

@onready var _base_material: StandardMaterial3D = _resolve_material()


func apply_damage(amount: float) -> void:
	if is_broken:
		return

	current_damage += max(amount, 0.0)
	emit_signal("damage_applied", self, amount, current_damage)
	_update_damage_visuals()

	if current_damage >= max_damage:
		break_part()


func break_part() -> void:
	if is_broken:
		return

	is_broken = true
	emit_signal("part_broken", self)

	for child in get_children():
		if child is Joint3D:
			child.queue_free()


func _update_damage_visuals() -> void:
	if _base_material == null:
		return

	var ratio := clamp(current_damage / max_damage, 0.0, 1.0)
	var tint := Color(1.0, 1.0 - ratio * 0.6, 1.0 - ratio * 0.6, 1.0)
	_base_material.albedo_color = tint


func _resolve_material() -> StandardMaterial3D:
	var mesh_instance := find_child("MeshInstance3D", true, false)
	if mesh_instance is MeshInstance3D:
		var active_material := mesh_instance.get_active_material(0)
		if active_material is StandardMaterial3D:
			return active_material

	return null
