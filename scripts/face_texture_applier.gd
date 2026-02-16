extends Node
class_name FaceTextureApplier

@export var head_path: NodePath
@export var head_surface_index: int = 0


func apply_face_texture(image: Image) -> void:
	var head := get_node_or_null(head_path)
	if head == null:
		push_warning("Head node not found for face application.")
		return

	var texture := ImageTexture.create_from_image(image)

	if head is MeshInstance3D:
		_apply_to_head_mesh(head, texture)
	elif head is Skeleton3D:
		_attach_curved_face_plane(head, texture)
	else:
		push_warning("Unsupported head node type for face texture mapping.")


func _apply_to_head_mesh(head_mesh: MeshInstance3D, texture: Texture2D) -> void:
	var material: StandardMaterial3D
	var active_material := head_mesh.get_active_material(head_surface_index)
	if active_material is StandardMaterial3D:
		material = active_material.duplicate()
	else:
		material = StandardMaterial3D.new()

	material.albedo_texture = texture
	head_mesh.set_surface_override_material(head_surface_index, material)


func _attach_curved_face_plane(head_bone: Skeleton3D, texture: Texture2D) -> void:
	var marker := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(0.28, 0.28)
	plane.subdivide_depth = 8
	plane.subdivide_width = 4
	marker.mesh = plane

	var material := StandardMaterial3D.new()
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.albedo_texture = texture
	marker.material_override = material
	marker.rotation_degrees = Vector3(0.0, 180.0, 0.0)
	marker.position = Vector3(0.0, 0.0, 0.14)
	head_bone.add_child(marker)
