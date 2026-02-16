extends Node
class_name DamageSystem

signal damage_event(event_data: Dictionary)

@export var global_damage_scale: float = 0.008

var combo_count_by_character: Dictionary = {}


func calculate_damage(
	part: BodyPart,
	relative_velocity: Vector3,
	collision_normal: Vector3,
	character_id: String
) -> float:
	var speed_sq := relative_velocity.length_squared()
	var velocity_dir := relative_velocity.normalized()
	var angle_multiplier := clamp(collision_normal.dot(-velocity_dir), 0.15, 1.5)
	var combo_count := combo_count_by_character.get(character_id, 0)
	var combo_multiplier := 1.0 + (float(combo_count) * 0.2)

	var damage := (
		part.mass
		* speed_sq
		* part.damage_multiplier
		* angle_multiplier
		* combo_multiplier
		* global_damage_scale
	)

	combo_count_by_character[character_id] = combo_count + 1
	return max(damage, 0.0)


func apply_collision_damage(
	part: BodyPart,
	relative_velocity: Vector3,
	collision_normal: Vector3,
	character_id: String,
	time_seconds: float
) -> float:
	var damage := calculate_damage(part, relative_velocity, collision_normal, character_id)
	part.apply_damage(damage)

	var event := {
		"time": time_seconds,
		"character_id": character_id,
		"part": part.part_name,
		"damage": damage,
		"speed": relative_velocity.length()
	}
	emit_signal("damage_event", event)
	return damage


func reset_combo(character_id: String) -> void:
	combo_count_by_character[character_id] = 0


func reset_all() -> void:
	combo_count_by_character.clear()
