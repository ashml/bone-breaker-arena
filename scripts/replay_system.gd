extends Node
class_name ReplaySystem

var damage_events: Array[Dictionary] = []


func record_event(event_data: Dictionary) -> void:
	damage_events.append(event_data.duplicate(true))


func clear() -> void:
	damage_events.clear()


func highest_damage_event_for_character(character_id: String) -> Dictionary:
	var best_event: Dictionary = {}
	for event in damage_events:
		if event.get("character_id", "") != character_id:
			continue
		if best_event.is_empty() or event.get("damage", 0.0) > best_event.get("damage", 0.0):
			best_event = event
	return best_event


func replay_window_for_event(event_data: Dictionary, lead_in: float = 1.25, slowmo_duration: float = 6.0) -> Dictionary:
	if event_data.is_empty():
		return {}

	var center_time: float = event_data.get("time", 0.0)
	return {
		"start_time": max(center_time - lead_in, 0.0),
		"end_time": center_time + slowmo_duration,
		"timescale": 0.2,
		"focus_damage": event_data.get("damage", 0.0)
	}
