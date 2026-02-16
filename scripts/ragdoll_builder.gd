extends Node
class_name RagdollBuilder

const BODY_PARTS := [
	"head",
	"torso",
	"upper_arm_l", "lower_arm_l",
	"upper_arm_r", "lower_arm_r",
	"upper_leg_l", "lower_leg_l",
	"upper_leg_r", "lower_leg_r"
]


func create_ragdoll(character_root: Node3D) -> void:
	for name in BODY_PARTS:
		var part := BodyPart.new()
		part.name = name
		part.part_name = name
		part.mass = _mass_for_part(name)
		part.damage_multiplier = _damage_multiplier_for_part(name)
		part.max_damage = _max_damage_for_part(name)
		part.freeze = false
		part.position = _default_local_offset(name)
		character_root.add_child(part)

	_apply_2_5d_constraints(character_root)
	_create_joints(character_root)


func _create_joints(character_root: Node3D) -> void:
	# Note: Joint tuning values are placeholders meant for quick iteration.
	_create_hinge(character_root, "upper_leg_l", "lower_leg_l")
	_create_hinge(character_root, "upper_leg_r", "lower_leg_r")
	_create_hinge(character_root, "upper_arm_l", "lower_arm_l")
	_create_hinge(character_root, "upper_arm_r", "lower_arm_r")
	_create_6dof(character_root, "torso", "head")
	_create_6dof(character_root, "torso", "upper_arm_l")
	_create_6dof(character_root, "torso", "upper_arm_r")
	_create_6dof(character_root, "torso", "upper_leg_l")
	_create_6dof(character_root, "torso", "upper_leg_r")


func _create_hinge(root: Node3D, a: String, b: String) -> void:
	var joint := HingeJoint3D.new()
	joint.name = "%s_to_%s" % [a, b]
	joint.node_a = NodePath("../%s" % a)
	joint.node_b = NodePath("../%s" % b)
	root.add_child(joint)


func _create_6dof(root: Node3D, a: String, b: String) -> void:
	var joint := Generic6DOFJoint3D.new()
	joint.name = "%s_to_%s" % [a, b]
	joint.node_a = NodePath("../%s" % a)
	joint.node_b = NodePath("../%s" % b)
	joint.set_flag_x(Generic6DOFJoint3D.FLAG_ENABLE_LINEAR_LIMIT, true)
	joint.set_flag_y(Generic6DOFJoint3D.FLAG_ENABLE_LINEAR_LIMIT, true)
	joint.set_flag_z(Generic6DOFJoint3D.FLAG_ENABLE_LINEAR_LIMIT, true)
	root.add_child(joint)


func _apply_2_5d_constraints(character_root: Node3D) -> void:
	for child in character_root.get_children():
		if child is RigidBody3D:
			child.axis_lock_linear_z = true
			child.axis_lock_angular_x = true
			child.axis_lock_angular_y = true


func _mass_for_part(part_name: String) -> float:
	if part_name == "torso":
		return 12.0
	if part_name == "head":
		return 5.0
	if part_name.begins_with("upper_leg"):
		return 7.0
	if part_name.begins_with("lower_leg"):
		return 5.5
	if part_name.begins_with("upper_arm"):
		return 4.0
	if part_name.begins_with("lower_arm"):
		return 3.0
	return 1.0


func _damage_multiplier_for_part(part_name: String) -> float:
	if part_name == "head":
		return 2.2
	if part_name == "torso":
		return 1.4
	return 1.0


func _max_damage_for_part(part_name: String) -> float:
	if part_name == "torso":
		return 250.0
	if part_name == "head":
		return 180.0
	return 120.0


func _default_local_offset(part_name: String) -> Vector3:
	match part_name:
		"head":
			return Vector3(0.0, 1.6, 0.0)
		"torso":
			return Vector3(0.0, 1.2, 0.0)
		"upper_arm_l":
			return Vector3(-0.35, 1.25, 0.0)
		"lower_arm_l":
			return Vector3(-0.6, 1.05, 0.0)
		"upper_arm_r":
			return Vector3(0.35, 1.25, 0.0)
		"lower_arm_r":
			return Vector3(0.6, 1.05, 0.0)
		"upper_leg_l":
			return Vector3(-0.2, 0.75, 0.0)
		"lower_leg_l":
			return Vector3(-0.2, 0.35, 0.0)
		"upper_leg_r":
			return Vector3(0.2, 0.75, 0.0)
		"lower_leg_r":
			return Vector3(0.2, 0.35, 0.0)
		_:
			return Vector3.ZERO
